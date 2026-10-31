import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Binds, Pool, Row } from '../../database/oracle-types';

/**
 * Порт controllers/online/repo.js — мониторинг онлайн-запросов (ошибки, журнал)
 * и списки удалённых/восстанавливаемых договоров и заявок. SQL — дословно,
 * включая динамическую подстановку `${...}`.
 */
@Injectable()
export class OnlineObservableRepository {
  constructor(private readonly db: OracleService) {}

  // ---------------------------------------------------------------- ошибки

  /** Группы ошибок за дату. Значение по умолчанию org_type_ срабатывает при undefined. */
  getErrorByDate(date_: string | undefined, org_type_: string | undefined = '02'): Promise<Row[] | null> {
    const script = `SELECT error_.code, error_.message FROM GRCI.ws_log_errors l_errors  
   					INNER JOIN REFERS.R_ERRORS error_ ON error_.code = l_errors.err_code
   					WHERE l_errors.data = to_date(:date_, 'dd.mm.yyyy') and l_errors.org_type = :org_type_
   					GROUP BY error_.code, error_.message order by error_.code `;
    const params = { date_, org_type_ };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getErrorByDate' });
  }

  /**
   * PIVOT количества ошибок по банкам. Для org_type_, отличного от '02'/'06'/'07'
   * (в т.ч. значения по умолчанию '01'), скрипт пустой → ошибка БД → null (как в оригинале).
   */
  getSearchByBank(
    date_: string | undefined,
    error: string,
    org_type_: string | undefined = '01',
  ): Promise<Row[] | null> {
    const qErrors = error
      .replace(/[^0123456789,]/g, '')
      .split(',')
      .map((t) => "'" + t + "' E" + t)
      .join(', ');
    let script = '';

    switch (org_type_) {
      case '02':
        script = `
  SELECT *
   FROM (SELECT *
           FROM (SELECT bank_.code_bank BANK_CODE,
                        bank_.name_bank BANK_NAME,
                        error_.code error,
                        count(*) cnt
                   FROM (SELECT log_.org_code bank,
                                log_.data     date_,
                                log_.err_code ecode
                           FROM GRCI.ws_log_errors log_
                          where log_.org_type = '02')
                  INNER JOIN REFERS.R_ERRORS error_
                     ON error_.code = ecode
                  INNER JOIN REFERS.R_BANK_SHORT bank_
                     ON BANK_.CODE_BANK = BANK
                  where date_ = TO_DATE(:date_, 'DD.MM.YYYY')
                  GROUP BY bank_.code_bank, bank_.name_bank, error_.code))
  PIVOT(sum(cnt)
    FOR error IN(${qErrors}))
  ORDER BY BANK_CODE`;
        break;

      case '06':
        script = `
SELECT *
   FROM (SELECT *
           FROM (SELECT bank_.NKO_CODE BANK_CODE,
                        bank_.nko_name BANK_NAME,
                        error_.code error,
                        count(*) cnt
                   FROM (SELECT log_.org_type || log_.org_code nko,
                                log_.data     date_,
                                log_.err_code ecode
                           FROM GRCI.ws_log_errors log_
                          where log_.org_type = '06')
                  INNER JOIN REFERS.R_ERRORS error_
                     ON error_.code = ecode
                  INNER JOIN REFERS.R_NKO_SHORT_NAME bank_
                     ON BANK_.NKO_CODE = nko
                  where date_ = TO_DATE(:date_, 'DD.MM.YYYY')
                  GROUP BY bank_.NKO_CODE, bank_.nko_name, error_.code))
 PIVOT(sum(cnt)
    FOR error IN(${qErrors}))
  ORDER BY BANK_CODE`;
        break;

      case '07':
        script = `
SELECT *
  FROM (SELECT *
          FROM (SELECT bank_.CODE BANK_CODE,
                      bank_.name BANK_NAME,
                      error_.code error,
                      count(*) cnt
                  FROM (SELECT log_.org_type || log_.org_code nko,
                              log_.data     date_,
                              log_.err_code ecode
                          FROM GRCI.ws_log_errors log_
                        where log_.org_type = '07')
                INNER JOIN REFERS.R_ERRORS error_
                    ON error_.code = ecode
                INNER JOIN REFERS.R_CREDIT_ORGANIZATIONS bank_
                    ON BANK_.CODE = nko
                where date_ = TO_DATE(:date_, 'DD.MM.YYYY')
                GROUP BY bank_.CODE, bank_.name, error_.code))
PIVOT(sum(cnt)
  FOR error IN(${qErrors}))
ORDER BY BANK_CODE`;
        break;

      default:
        break;
    }
    const params = { date_ };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getSearchByBank' });
  }

  /** Детали ошибок банка за дату (метка протокола в оригинале — getErrorByDate). */
  getSearchErrorDetail(
    date_: string | undefined,
    bank: string | undefined,
    error: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT log_.id,  to_char(log_.begin_ts, 'hh24:mi:ss') begin_time, types_.name q_type,   errors_.err_message err_message 
				FROM GRCI.WS_LOG log_  
				INNER JOIN GRCI.ws_log_errors errors_ ON errors_.log_id = log_.id
				LEFT OUTER JOIN REFERS.R_QUERY_TYPES types_ ON types_.id = log_.query_type
				WHERE log_.STATE = 3 and log_.data = to_date(:date_, 'dd.mm.yyyy') and errors_.org_type = '02' and log_.bank = :bank and errors_.err_code = :error 
				order by begin_ts`;
    const params = { date_, bank, error };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getErrorByDate' });
  }

  // ----------------------------------------------------------------- журнал

  /**
   * Журнал запросов. Строка SQL собирается как в оригинале:
   *  - states/banks — undefined → TypeError на .replace (HTTP 500);
   *  - orgType не '01'/'02'/'03' → bankArray = undefined → в SQL попадает "undefined" (ошибка БД → null);
   *  - фильтр по дате добавляется при date_ !== "undefined" (в т.ч. если параметр не передан).
   */
  getLog(
    date_: string | undefined,
    orgType: string | undefined,
    queryID: string | undefined,
    states: string | undefined,
    banks: string | undefined,
  ): Promise<Row[] | null> {
    let additional = '';
    let bankArray: string | undefined;
    const params: Binds = {};

    const qState = (states as string)
      .replace(/[^0123,]/g, '')
      .split(',')
      .map((t) => (Number(t) * 1 >= 0 && Number(t) * 1 <= 3 ? Number(t) * 1 : -1))
      .join(',');

    if (orgType == '01') {
      if (banks === '000') {
        bankArray = ` AND NKO IS NULL `;
      } else {
        bankArray = (banks as string)
          .replace(/[^0123456789,]/g, '')
          .split(',')
          .map((t) => "'" + t + "'")
          .join(',');
        bankArray = ` AND BANK_CODE IN (${bankArray}) `;
      }
    } else if (orgType == '02' || orgType == '03') {
      if (banks === '000') {
        bankArray = ` AND BANK_CODE IS NULL `;
      } else {
        bankArray = (banks as string)
          .replace(/[^0123456789,]/g, '')
          .split(',')
          .map((t) => "'" + t + "'")
          .join(',');
        bankArray = ` AND NKO IN (${bankArray}) `;
      }
    }

    if (date_ !== 'undefined') {
      additional += ` AND data = TO_DATE(:date_, 'dd.mm.yyyy') `;
      params.date_ = date_;
    }
    if (queryID) {
      if (queryID !== 'undefined') {
        additional += ` AND ID = :queryID`;
        params.queryID = queryID;
      }
    }
    const script = `SELECT * FROM V_ONLINE_LOG WHERE LOG_STATE IN (${qState}) ${bankArray} ${additional} ORDER BY BEGIN_TS DESC`;

    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getLog' });
  }

  getLogError(queryID: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM v_online_log_error WHERE LOG_ID = :queryID`;
    const params = { queryID };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getLogError' });
  }

  /** executeSelectResultClob в оригинале — CLOB уже отдаются строкой глобально. */
  getLogQuery(queryID: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM v_online_request_query WHERE LOG_ID = :queryID`;
    const params = { queryID };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getLogQuery' });
  }

  // ------------------------------------------------- удалённые / восстановление

  /** bank принимается, но не биндится — как в оригинале. */
  getContractDel(
    date_begin: string | undefined,
    date_end: string | undefined,
    _bank: string | undefined,
    branch: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT * FROM v_contract_del 
	where CONTRACT_REG_DATE between to_Date(:date_begin, 'dd.mm.yyyy') and to_Date(:date_end, 'dd.mm.yyyy') AND BRANCH = :branch
	order by contract_reg_date`;
    const params = { date_begin, date_end, branch };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getContractDel' });
  }

  /** bank принимается, но не биндится; метка протокола в оригинале — getContractDel. */
  getClaimDel(
    date_begin: string | undefined,
    date_end: string | undefined,
    _bank: string | undefined,
    branch: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT * FROM v_claim_del 
	where DOC_DATE between to_Date(:date_begin, 'dd.mm.yyyy') and to_Date(:date_end, 'dd.mm.yyyy') AND BRANCH = :branch
	order by DOC_DATE`;
    const params = { date_begin, date_end, branch };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getContractDel' });
  }

  /** bank принимается, но не биндится — как в оригинале. */
  getRequestsForRestore(
    date_begin: string | undefined,
    date_end: string | undefined,
    _bank: string | undefined,
    branch: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT * FROM V_CLAIM_RESTORE 
	where DOC_DATE between to_Date(:date_begin, 'dd.mm.yyyy') and to_Date(:date_end, 'dd.mm.yyyy') AND BRANCH = :branch
	order by DOC_DATE`;
    const params = { date_begin, date_end, branch };
    return this.db.select(Pool.Main, script, params, { fn: 'ONLINE', method: 'getRequestsForRestore' });
  }
}
