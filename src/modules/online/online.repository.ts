import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Binds, Pool, Row } from '../../database/oracle-types';

/**
 * Порт controllers/online/repo.js — статистика онлайн-запросов, настройки доступа,
 * факты, справочники и поиск. SQL, бинды, autoCommit, rowCount и метки протокола
 * сохранены как в оригинале. Мониторинг (журнал/ошибки) — в OnlineObservableRepository.
 */
@Injectable()
export class OnlineRepository {
  constructor(private readonly db: OracleService) {}

  // ------------------------------------------------------------ статистика

  getRequest(): Promise<Row[] | null> {
    const script = `select * from V_ONLINE_REG_STAT_ALL ORDER BY CREDIT_ORG`;
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE', method: 'getRequest' });
  }

  /**
   * Статистика онлайн-запросов по организациям за период (уровень 1).
   * Прямой SELECT вместо ONLINE_MODEL.getStatsLevel1ByDate (запрос из тела функции).
   *
   * Без дат — «за весь период» (вся история OBSERVABLE_ONLINE_METHOD, ~0,1 с). Фронтенд
   * использует это вместо /online/getRequest: view SITE.V_ONLINE_REG_STAT_ALL считается
   * дольше 60 с, и запрос обрывался по таймауту.
   *
   * @param pBegin  начало периода 'DD.MM.YYYY' (фронтенд шлёт в поле `to`); пусто — без нижней границы
   * @param pEnd    конец периода 'DD.MM.YYYY' (фронтенд шлёт в поле `from`); пусто — без верхней границы
   * @param pOrgCat категория организации; null/undefined — все категории
   */
  getRequestByDate(pBegin: unknown, pEnd: unknown, pOrgCat?: unknown): Promise<Row[] | null> {
    const script = `SELECT t.CREDIT_ORG,
             t.ORG_CAT,
             NVL(b.name_bank, n.nko_name)           ORG_NAME,
             SUM(AGREEMENT_SUCCESS)        AGREEMENT_SUCCESS       ,
             SUM(AGREEMENT_REJECT)         AGREEMENT_REJECT        ,
             SUM(CLAIM_SUCCESS)            CLAIM_SUCCESS           ,
             SUM(CLAIM_REJECT)             CLAIM_REJECT            ,
             SUM(COBORROWER_SUCCESS)       COBORROWER_SUCCESS      ,
             SUM(COBORROWER_REJECT)        COBORROWER_REJECT       ,
             SUM(CLAIMREJECT_SUCCESS)      CLAIMREJECT_SUCCESS     ,
             SUM(CLAIMREJECT_REJECT)       CLAIMREJECT_REJECT      ,
             SUM(CONTRACT_SUCCESS)         CONTRACT_SUCCESS        ,
             SUM(CONTRACT_REJECT)          CONTRACT_REJECT         ,
             SUM(PROVISION_SUCCESS)        PROVISION_SUCCESS       ,
             SUM(PROVISION_REJECT)         PROVISION_REJECT        ,
             SUM(SCHEDULE_SUCCESS)         SCHEDULE_SUCCESS        ,
             SUM(SCHEDULE_REJECT)          SCHEDULE_REJECT         ,
             SUM(BORROWER_SUCCESS)         BORROWER_SUCCESS        ,
             SUM(BORROWER_REJECT)          BORROWER_REJECT         ,
             SUM(PERCENTACCRMODE_SUCCESS)  PERCENTACCRMODE_SUCCESS ,
             SUM(PERCENTACCRMODE_REJECT)   PERCENTACCRMODE_REJECT  ,
             SUM(STATE2CURRENT_SUCCESS)    STATE2CURRENT_SUCCESS   ,
             SUM(STATE2CURRENT_REJECT)     STATE2CURRENT_REJECT    ,
             SUM(STATE2LITIGATION_SUCCESS) STATE2LITIGATION_SUCCESS,
             SUM(STATE2LITIGATION_REJECT)  STATE2LITIGATION_REJECT ,
             SUM(COURTDECIDE_SUCCESS)      COURTDECIDE_SUCCESS     ,
             SUM(COURTDECIDE_REJECT)       COURTDECIDE_REJECT      ,
             SUM(MOVE_SUCCESS)             MOVE_SUCCESS            ,
             SUM(MOVE_REJECT)              MOVE_REJECT             ,
             SUM(WRITEOFF_SUCCESS)         WRITEOFF_SUCCESS        ,
             SUM(WRITEOFF_REJECT)          WRITEOFF_REJECT         ,
             SUM(GETINFO_SUCCESS)          GETINFO_SUCCESS         ,
             SUM(GETINFO_REJECT)           GETINFO_REJECT          ,
             SUM(CLOSE_SUCCESS)            CLOSE_SUCCESS           ,
             SUM(CLOSE_REJECT)             CLOSE_REJECT            ,
             SUM(RESTORE_SUCCESS)          RESTORE_SUCCESS         ,
             SUM(RESTORE_REJECT)           RESTORE_REJECT          ,
             SUM(NOTARY_SUCCESS)           NOTARY_SUCCESS          ,
             SUM(NOTARY_REJECT)            NOTARY_REJECT           ,
             SUM(WRITEOFF2CURRENT_SUCCESS) WRITEOFF2CURRENT_SUCCESS,
             SUM(WRITEOFF2CURRENT_REJECT)  WRITEOFF2CURRENT_REJECT ,
             SUM(WRITEOFF2REVIEW_SUCCESS)  WRITEOFF2REVIEW_SUCCESS ,
             SUM(WRITEOFF2REVIEW_REJECT)   WRITEOFF2REVIEW_REJECT
        FROM grci.OBSERVABLE_ONLINE_METHOD t,
             refers.r_bank_short b,
             refers.r_nko_short_name   n
       WHERE (:pBegin IS NULL OR t.data >= TO_DATE(:pBegin, 'DD.MM.YYYY'))
         AND (:pEnd IS NULL OR t.data <= TO_DATE(:pEnd, 'DD.MM.YYYY'))
         AND t.credit_org = b.code_bank(+)
         AND t.credit_org = n.nko_code(+)
         AND (:pOrgCat IS NULL OR t.org_cat = :pOrgCat)
       GROUP BY t.CREDIT_ORG, b.name_bank, n.nko_name, t.ORG_CAT
       ORDER BY t.CREDIT_ORG`;
    const param = { pBegin: pBegin || null, pEnd: pEnd || null, pOrgCat: pOrgCat ?? null };
    return this.db.select(Pool.Main, script, param, { fn: 'ONLINE', method: 'getRequestByDate' });
  }

  /**
   * Статистика онлайн-запросов одной организации в разрезе дней/методов
   * (drill-down по клику на банк на странице «Статистика использования онлайн-сервиса»).
   *
   * @param pBegin  начало периода 'DD.MM.YYYY'; null/undefined — без нижней границы («за весь период»)
   * @param pEnd    конец периода 'DD.MM.YYYY'; null/undefined — без верхней границы
   * @param pBank   код организации (CREDIT_ORG)
   * @param pOrgCat категория организации; null/undefined — все категории
   *
   * Читаем предагрегированную OBSERVABLE_ONLINE_METHOD (как getRequestByDate), а не
   * V_OBSERVABLE_BANK_BY_METHODS: view делает PIVOT по всему GRCI.WS_LOG, фильтры через
   * него не проталкиваются, и запрос выполняется минутами. Набор колонок тот же.
   */
  getRequestBankByDate(pBegin: unknown, pEnd: unknown, pBank: unknown, pOrgCat?: unknown): Promise<Row[] | null> {
    const script = `SELECT t.*, NVL(b.name_bank, n.name) ORG_NAME
        FROM grci.OBSERVABLE_ONLINE_METHOD t,
             refers.r_bank_short b,
             refers.r_nko   n
       WHERE t.CREDIT_ORG = :pBank
         AND (:pBegin IS NULL OR t.data >= TO_DATE(:pBegin, 'DD.MM.YYYY'))
         AND (:pEnd IS NULL OR t.data <= TO_DATE(:pEnd, 'DD.MM.YYYY'))
         AND (:pOrgCat IS NULL OR t.org_cat = :pOrgCat)
         AND t.credit_org = b.code_bank(+)
         AND t.credit_org = n.nko_code(+)
       ORDER BY t.data`;
    const param = { pBegin: pBegin ?? null, pEnd: pEnd ?? null, pBank, pOrgCat: pOrgCat ?? null };
    return this.db.select(Pool.Main, script, param, { fn: 'ONLINE', method: 'getRequestBankByDate' });
  }

  /**
   * Список онлайн-запросов организации за день (детализация из GRCI.WS_LOG):
   * drill-down со страницы «Статистика организации в разрезе дат».
   *
   * Возвращает последние `pLimit` запросов (по убыванию ID). Объём большой: у одной
   * организации бывает до ~565 тыс. запросов в день, поэтому сначала выбираются только
   * ID (узкая сортировка по индексу DATA), а детали читаются для них — ~2–3 с вместо ~50 с.
   * REQUEST — входящий запрос (WS_LOG_QUERY.QUERY, CLOB → строка; LOG_ID уникален, дублей нет),
   * RESPONSE — исходящий ответ (WS_LOG.RESPONSE); в БД он хранится с «...» в конце —
   * убираем, чтобы это был валидный JSON. ~2,3 МБ JSON на 1000 строк.
   * Порядок: по вх. дате (BEGIN_TS) от новых к старым.
   * ERR_CODE/ERR_MESSAGE — из WS_LOG, ERR_COUNT — число записей в WS_LOG_ERRORS.
   *
   * @param pDate      день 'DD.MM.YYYY' (обязателен)
   * @param pBank      код организации — CREDIT_ORG (= NVL(WS_LOG.BANK, WS_LOG.NKO))
   * @param pQueryType тип запроса (R_QUERY_TYPES.ID); null — все типы
   * @param pState     статус WS_LOG.STATE: 2 — принят, 3 — отклонён (включая ошибку исполнения 4); null — все
   * @param pLimit     максимум строк (по умолчанию 1000, не больше 10000)
   */
  getRequestDetail(
    pDate: unknown,
    pBank: unknown,
    pQueryType?: unknown,
    pState?: unknown,
    pLimit?: unknown,
  ): Promise<Row[] | null> {
    const script = `WITH IDS AS (
       SELECT ID
         FROM (SELECT W.ID
                 FROM GRCI.WS_LOG W
                WHERE W.DATA = TO_DATE(:pDate, 'DD.MM.YYYY')
                  AND NVL(W.BANK, W.NKO) = :pBank
                  AND (:pQueryType IS NULL OR W.QUERY_TYPE = :pQueryType)
                  AND (:pState IS NULL OR W.STATE = :pState OR (:pState = 3 AND W.STATE = 4))
                ORDER BY W.ID DESC)
        WHERE ROWNUM <= :pLimit)
SELECT W.ID,
       TO_CHAR(W.DATA, 'DD.MM.YYYY')                 DATA,
       TO_CHAR(W.BEGIN_TS, 'DD.MM.YYYY HH24:MI:SS')  BEGIN_TS,
       TO_CHAR(W.END_TS, 'DD.MM.YYYY HH24:MI:SS')    END_TS,
       W.QUERY_TYPE,
       TYPES_.SHORT_NAME                             TYPE_SHORT_NAME,
       NVL(W.BANK, W.NKO)                            CREDIT_ORG,
       NVL(BANK_.NAME_BANK, NKO_.NKO_NAME)           ORG_NAME,
       QUERY_.QUERY                                  REQUEST,
       REGEXP_REPLACE(W.RESPONSE, '\\.{3}\\s*$') RESPONSE,
       W.ERR_CODE,
       W.ERR_MESSAGE,
       W.STATE,
       (SELECT COUNT(*) FROM GRCI.WS_LOG_ERRORS E WHERE E.LOG_ID = W.ID) ERR_COUNT
  FROM IDS
  JOIN GRCI.WS_LOG W                      ON W.ID = IDS.ID
  LEFT JOIN GRCI.WS_LOG_QUERY QUERY_       ON QUERY_.LOG_ID = W.ID
  LEFT JOIN REFERS.R_QUERY_TYPES TYPES_   ON TYPES_.ID = W.QUERY_TYPE
  LEFT JOIN REFERS.R_BANK_SHORT BANK_     ON BANK_.CODE_BANK = W.BANK
  LEFT JOIN REFERS.R_NKO_SHORT_NAME NKO_  ON NKO_.NKO_CODE = W.NKO
 ORDER BY W.BEGIN_TS DESC, W.ID DESC`;
    const limit = Number(pLimit);
    const param = {
      pDate,
      pBank,
      pQueryType: pQueryType ?? null,
      pState: pState ?? null,
      pLimit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.trunc(limit), 10000) : 1000,
    };
    return this.db.select(Pool.Main, script, param, { fn: 'ONLINE', method: 'getRequestDetail' });
  }

  getRequestLevel2(
    pCreditOrg: unknown,
    pQueryType: unknown,
    pState: unknown,
    pBegin: unknown,
    pEnd: unknown,
  ): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsLevel2(:pCreditOrg, :pQueryType, :pState, :pBegin, :pEnd); END;`;
    const param = { pCreditOrg, pQueryType, pState, pBegin, pEnd };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_MODEL', method: 'getStatsLevel2' },
      100000,
    );
  }

  getRequestLevel3(pCreditOrg: unknown, pQueryType: unknown, pData: unknown, pState: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsLevel3(:pCreditOrg, :pQueryType, :pData, :pState); END;`;
    const param = { pCreditOrg, pQueryType, pData, pState };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_MODEL', method: 'getStatsLevel3' },
      100000,
    );
  }

  getRequestLevel4(pQueryID: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsLevel4(:pQueryID); END;`;
    const param = { pQueryID };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_MODEL', method: 'getStatsLevel4' },
      1,
    );
  }

  getRequestLevel4Errors(pQueryID: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsLevel4Errors(:pQueryID); END;`;
    const param = { pQueryID };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_MODEL', method: 'getStatsLevel4Errors' },
      100000,
    );
  }

  getStatTableColumns(pLevel: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsColumn(:pLevel); END;`;
    const param = { pLevel };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_MODEL', method: 'getStatTableColumns' },
      1000,
    );
  }

  // ------------------------------------------------- удаление / восстановление

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delByBank(pJournal: unknown, pContract: unknown): Promise<any> {
    const script = `BEGIN :result := ONLINE_MODEL.del_(:pJournal, :pContract); END;`;
    const param = { pJournal, pContract };
    return this.db.callFunction(Pool.Main, script, param, { type: 'String', maxSize: 32767 }, true, {
      fn: 'ONLINE',
      method: 'delByBank',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  restoreRequestByBank(pJournal: unknown, pContract: unknown): Promise<any> {
    const script = `BEGIN :result := ONLINE_MODEL.restore_(:pJournal, :pContract); END;`;
    const param = { pJournal, pContract };
    return this.db.callFunction(Pool.Main, script, param, { type: 'String', maxSize: 32767 }, true, {
      fn: 'ONLINE',
      method: 'restoreRequestByBank',
    });
  }

  // ------------------------------------------------------ доступы и методы

  getQueryTypes(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getQueryTypes; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_MODEL', method: 'getQueryTypes' },
      undefined,
    );
  }

  getMethodsAllowed(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getMethodsAllowed; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_MODEL', method: 'getMethodsAllowed' },
      undefined,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setQueryPermission(pJournal: unknown, pOrgCode: unknown, pQueryID: unknown, pAllow: unknown): Promise<any> {
    const script = `BEGIN :result := ONLINE_MODEL.setQueryPermission(:pJournal, :pOrgCode, :pQueryID, :pAllow); END;`;
    const param = { pJournal, pOrgCode, pQueryID, pAllow };
    return this.db.callFunction(Pool.Main, script, param, { type: 'NUMBER', maxSize: 1 }, true, {
      fn: 'ONLINE',
      method: 'setQueryPermission',
    });
  }

  getControlList(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getControlList; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_MODEL', method: 'getControlList' },
      undefined,
    );
  }

  getControlsAllowed(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getControlsAllowed; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_MODEL', method: 'getControlsAllowed' },
      undefined,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setControlAllow(pJournal: unknown, pOrgCode: unknown, pCtrlID: unknown, pAllow: unknown): Promise<any> {
    const script = `BEGIN :result := ONLINE_MODEL.setControlAllow(:pJournal, :pOrgCode, :pCtrlID, :pAllow); END;`;
    const param = { pJournal, pOrgCode, pCtrlID, pAllow };
    return this.db.callFunction(Pool.Main, script, param, { type: 'NUMBER', maxSize: 1 }, true, {
      fn: 'ONLINE',
      method: 'setControlAllow',
    });
  }

  getBankList(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getBankList; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_MODEL', method: 'getBankList' },
      undefined,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setBankAccess(
    pJournal: unknown,
    pOrgCode: unknown,
    pLogin: unknown,
    pPassword: unknown,
    pAllow: unknown,
  ): Promise<any> {
    const script = `BEGIN :result := ONLINE_MODEL.setBankAccess(:pJournal, :pOrgCode, :pLogin, :pPassword, :pAllow); END;`;
    const param = { pJournal, pOrgCode, pLogin, pPassword, pAllow };
    return this.db.callFunction(Pool.Main, script, param, { type: 'NUMBER', maxSize: 1 }, true, {
      fn: 'ONLINE',
      method: 'setBankAccess',
    });
  }

  // ----------------------------------------------------------------- факты

  getFactsLevel1(): Promise<Row[] | null> {
    const script = `select * from V_ONLINE_FACTS_SUMMARY WHERE (date_close IS NULL OR date_close >= TRUNC(SYSDATE)) AND total > 0 ORDER BY cat, code`;
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE_MODEL', method: 'getFactsLevel1' });
  }

  getFactsLevel2(pCategory: unknown, pOrgCode: unknown, pDataType: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_FACTS.getFactsLevel2Data(:pCategory, :pOrgCode, :pDataType); END;`;
    const param = { pCategory, pOrgCode, pDataType };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_FACTS', method: 'getFactsLevel2Data' },
      100000,
    );
  }

  getFactsLevel3(pCategory: unknown, pOrgCode: unknown, pDataType: unknown, pBranch: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_FACTS.getFactsLevel3Data(:pCategory, :pOrgCode, :pDataType, :pBranch); END;`;
    const param = { pCategory, pOrgCode, pDataType, pBranch };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_FACTS', method: 'getFactsLevel3Data' },
      100000,
    );
  }

  getFactsLevel4(
    pCategory: unknown,
    pOrgCode: unknown,
    pDataType: unknown,
    pBranch: unknown,
    pItem: unknown,
    pProvItem: unknown,
    pProvID: unknown,
    pNorder: unknown,
  ): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_FACTS.getFactsLevel4Data(:pCategory, :pOrgCode, :pDataType, :pBranch, :pItem, :pProvItem, :pProvID, :pNorder); END;`;
    const param = { pCategory, pOrgCode, pDataType, pBranch, pItem, pProvItem, pProvID, pNorder };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_FACTS', method: 'getFactsLevel4Data' },
      1000,
    );
  }

  // ----------------------------------------------------------- справочники

  getConfigList(): Promise<Row[] | null> {
    const script = `select * from V_ONLINE_QUERY_CONFIG`;
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE', method: 'getConfigList' });
  }

  getRefContent(pAlias: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getRefContent(:pAlias); END;`;
    const param = { pAlias };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_SEARCH', method: 'getRefContent' },
      100000,
    );
  }

  // ----------------------------------------------------------------- поиск

  getSearchInfoTypesList(): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getSearchInfoTypes; END;`;
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      {},
      false,
      { fn: 'ONLINE_SEARCH', method: 'getSearchInfoTypesList' },
      100,
    );
  }

  getSearchRelationsList(): Promise<Row[] | null> {
    const script = `select * from R_ONLINE_SEARCH_RELATIONS where state = 1 order by norder`;
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE', method: 'getSearchRelationsList' });
  }

  getSearchRelationByTypeList(): Promise<Row[] | null> {
    const script = `select * from V_ONLINE_SEARCH_RELATIONS`;
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE', method: 'getSearchRelationByTypeList' });
  }

  getSearchParams(pJournalID: unknown, pInfoType: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getSearchParams(:pJournalID, :pInfoType); END;`;
    const param = { pJournalID, pInfoType };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_SEARCH', method: 'getSearchParams' },
      1000,
    );
  }

  getResultFields(pInfoType: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getResultFields(:pInfoType); END;`;
    const param = { pInfoType };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_SEARCH', method: 'getResultFields' },
      1000,
    );
  }

  /**
   * Поиск: параметры передаются JSON-строкой, курсор читается с commit
   * (functionCursorWithCommit). Если есть PRIMARY_KEY_STR — PRIMARY_KEY = число из строки.
   */
  async getSearchResult(pJournalID: unknown, pInfoType: unknown, pParamList: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getSearchResult(:pJournalID, :pInfoType, :pParamList); END;`;
    const param: Binds = { pJournalID, pInfoType, pParamList: JSON.stringify(pParamList) };
    const res = await this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_SEARCH', method: 'getSearchResult' },
      10000,
      true,
    );
    if (res && res.length && res.length > 0 && res[0].PRIMARY_KEY_STR)
      for (let i = 0; i < res.length; i++) res[i].PRIMARY_KEY = res[i].PRIMARY_KEY_STR * 1;
    return res;
  }

  getSearchDetail(pInfoType: unknown, pPrimary: unknown, pSecondary: unknown, pNorder: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_SEARCH.getSearchDetail(:pInfoType, :pPrimary, :pSecondary, :pNorder); END;`;
    const param = { pInfoType, pPrimary, pSecondary, pNorder };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      false,
      { fn: 'ONLINE_SEARCH', method: 'getSearchDetail' },
      1000,
    );
  }
}
