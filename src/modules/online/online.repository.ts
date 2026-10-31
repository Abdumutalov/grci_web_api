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

  getRequestByDate(pBegin: unknown, pEnd: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := ONLINE_MODEL.getStatsLevel1ByDate(:pBegin, :pEnd); END;`;
    const param = { pBegin, pEnd };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      true,
      { fn: 'ONLINE_MODEL', method: 'getStatsLevel1ByDate' },
      100000,
    );
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
