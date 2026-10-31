import { Injectable } from '@nestjs/common';
import { OracleService } from '../../../database/oracle.service';
import { Binds, Pool, Row } from '../../../database/oracle-types';

/**
 * Порт controllers/offline/observable/requestError/repo.js
 *
 * Hardening: `INFO_TYPE = '${info_type}'` заменено на bind-переменную :info_type
 * (защита от SQL-инъекции). При info_type === undefined оригинал сравнивал
 * с литералом 'undefined' (строк нет), с NULL-bind строк тоже нет — эквивалентно.
 * Список ошибок в PIVOT IN (...) подставляется как в оригинале (значения из БД).
 */
@Injectable()
export class RequestErrorRepository {
  constructor(private readonly db: OracleService) {}

  private query(script: string, params: Binds, method: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method });
  }

  getErrorByDate(
    begin: string | undefined,
    end: string | undefined,
    info_type: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT error code, message FROM v_offline_observable_errors t
	              WHERE report_date BETWEEN TO_DATE(:begin, 'dd.mm.yyyy') AND TO_DATE(:end, 'dd.mm.yyyy') AND INFO_TYPE = :info_type
	              GROUP BY error, message
	              ORDER BY error`;
    return this.query(script, { begin, end, info_type }, 'getErrorByDate');
  }

  getSearchByBank(
    begin: string | undefined,
    end: string | undefined,
    errorList: string,
    info_type: string | undefined,
  ): Promise<Row[] | null> {
    const script = `SELECT * FROM
	              (
	                SELECT bank_.value BANK_CODE, bank_.text BANK_NAME, error
	                FROM v_offline_observable_errors t
	                INNER JOIN R_CREDIT_ORGANIZATION bank_ ON bank_.bank = t.bank
	                WHERE report_date BETWEEN TO_DATE(:begin, 'dd.mm.yyyy') AND TO_DATE(:end, 'dd.mm.yyyy') AND t.INFO_TYPE = :info_type and bank_.INFO_TYPE = :info_type
	              )
	              PIVOT
	              (
	                COUNT(error)
	                FOR error IN (${errorList})
	              )
	              ORDER BY BANK_CODE`;
    return this.query(script, { begin, end, info_type }, 'getSearchByBank');
  }

  /** info_type === '01' — банки (R_BRANCHES), иначе МКО/ЛМО (R_CREDIT_ORGANIZATION). */
  getSearchByBranch(
    begin: string | undefined,
    end: string | undefined,
    bank: string | undefined,
    errorList: string,
    info_type: string | undefined,
  ): Promise<Row[] | null> {
    let script: string;
    const params: Binds = { begin, end, bank };
    if (info_type === '01') {
      script = `SELECT * FROM
	              (
	                SELECT branches_.BRANCH_CODE BRANCH_CODE, branches_.BRANCH_NAME BRANCH_NAME, error
	                FROM v_offline_observable_errors t
	                INNER JOIN R_BRANCHES branches_ ON branches_.BRANCH_CODE = t.branch
	                WHERE report_date BETWEEN TO_DATE(:begin, 'dd.mm.yyyy') AND TO_DATE(:end, 'dd.mm.yyyy') AND t.bank = :bank
	              )
	              PIVOT
	              (
	                COUNT(error)
	                FOR error IN (${errorList})
	              )
	              ORDER BY BRANCH_CODE`;
    } else {
      script = `SELECT * FROM
		(
		  SELECT branches_.value BRANCH_CODE, branches_.text BRANCH_NAME, error
		  FROM v_offline_observable_errors t
		  INNER JOIN R_CREDIT_ORGANIZATION branches_ ON branches_.value = t.branch
		  WHERE report_date BETWEEN TO_DATE(:begin, 'dd.mm.yyyy') AND TO_DATE(:end, 'dd.mm.yyyy') AND t.BRANCH = :bank AND T.INFO_TYPE = :info_type AND branches_.INFO_TYPE = :info_type
		)
		PIVOT
		(
		  COUNT(error)
		  FOR error IN (${errorList})
		)
		ORDER BY BRANCH_CODE`;
      // bind добавляется только там, где он есть в SQL (лишний bind → ORA-01036)
      params.info_type = info_type;
    }
    return this.query(script, params, 'getSearchByBranch');
  }
}
