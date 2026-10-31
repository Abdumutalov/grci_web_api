import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Pool, Row } from '../../database/oracle-types';

/** Порт controllers/report/repo.js */
@Injectable()
export class ReportRepository {
  constructor(private readonly db: OracleService) {}

  /**
   * Наблюдаемый баланс. Условие по статусу зависит от отчёта ('009' | '008');
   * для любого другого значения SQL невалиден (`AND )`) — как в оригинале,
   * результат null. Бинд `state` передаётся всегда (как в оригинале).
   */
  balance(
    reportDate: string | undefined,
    report: string | undefined,
    bank: string | undefined,
    state: string | undefined,
  ): Promise<Row[] | null> {
    let addscript = '';
    const params = { reportDate, report, bank, state };
    if (report === '009') {
      addscript = `check_009 = :state`;
    }
    if (report === '008') {
      addscript = `check_008 = :state`;
    }
    const script = `SELECT t.*,  coa_.NAME COA_NAME, branch.BRANCH_NAME BRANCH_NAME,  currency.name_ru currency_name FROM LOADER.OBSERVABLE_BALANCE t
		INNER JOIN R_LOAN_COAS coa_  ON coa_.CODE = t.coa
        inner join r_branches branch ON branch.BRANCH_CODE = t.branch
        inner join r_currency currency ON currency.CODE = t.currency
		WHERE BRANCH IN (
		select branch from LOADER.OBSERVABLE_BALANCE_BRANCH
		where report_date = to_date(:reportDate, 'dd.mm.yyyy') AND bank = :bank AND ${addscript}) AND REPORT_DATE = to_date(:reportDate, 'dd.mm.yyyy')
		  AND REPORT = :report AND BANK = :bank
		ORDER BY BRANCH, COA, CURRENCY`;
    return this.db.select(Pool.Main, script, params, { fn: 'report', method: 'getBalance' });
  }

  /** Регистрация запуска отчёта. pReportType передаёт только getRunReport (иначе NULL). */
  runReport(
    pJournal: string | number,
    pForm: string | undefined,
    pReportDateBegin: string | undefined,
    pReportDateEnd: string | undefined,
    pInfoType: string | undefined,
    pBank: string | undefined,
    pReportType?: string,
  ): Promise<unknown> {
    const script = `BEGIN :result := reports.MODEL_REPORTS.BEGIN_(:pJournal, :pForm, :pReportDateBegin, :pReportDateEnd, :pInfoType, :pBank, :pReportType); END;`;
    const param = { pJournal, pForm, pReportDateBegin, pReportDateEnd, pInfoType, pBank, pReportType };
    return this.db.callFunction(Pool.Main, script, param, { type: 'Number', maxSize: 1 }, true, {
      fn: 'Reports',
      method: 'RunReport',
    });
  }

  /**
   * Операции за период. `pOperation.replace` падает на undefined → 500 (как в оригинале).
   * Вариант SQL зависит от infoType === '01' (банк / филиал).
   */
  operationReport(
    begin: string | undefined,
    end: string | undefined,
    infoType: string | undefined,
    bank: string | undefined,
    pOperation: string | undefined,
  ): Promise<Row[] | null> {
    const qOps = (pOperation as string)
      .replace(/[^0123456789,]/g, '')
      .split(',')
      .map((t) => "'" + t + "'")
      .join(',');
    let script: string;
    let params: Record<string, unknown>;
    if (infoType === '01') {
      script = `SELECT YEAR, MONTH, QUARTER, DATA, TO_CHAR(DATA, 'DD.MM.YYYY') DATA_CH, TYPE, SUP_CODE, SUP_BRANCH,
	SUP_REGION, SUP_LOCAL_REGION, to_char(CONTRACT) CONTRACT, CLAIM, TRANSACTION, OPERATION_TYPE, CASH, DOC_TYPE, DOC_NUM, ACCOUNT,
	CLIENT, COA, CURRENCY, SUP_LINK_CODE, SUP_LINK_BRANCH, SUP_LINK_REGION, SUP_LINK_LOCAL_REGION, LINK_ACCOUNT,
	LINK_CLIENT, LINK_COA, LINK_CURRENCY, DEBIT, CREDIT, PURPOSE_CODE, NAME, LINK_NAME, PURPOSE_TEXT  FROM V_OFFLINE_CREDIT_OPERATION t
	WHERE SUP_CODE = :bank AND DATA BETWEEN TO_DATE(:begin,'DD.MM.YYYY') AND TO_DATE(:end,'DD.MM.YYYY') AND OPERATION_TYPE IN (${qOps}) AND TYPE = :infoType
	order by data, sup_branch`;
      params = { begin, end, bank, infoType };
    } else {
      script = `SELECT YEAR, MONTH, QUARTER, DATA, TO_CHAR(DATA, 'DD.MM.YYYY') DATA_CH, TYPE, SUP_CODE, SUP_BRANCH,
	SUP_REGION, SUP_LOCAL_REGION, to_char(CONTRACT) CONTRACT, CLAIM, TRANSACTION, OPERATION_TYPE, CASH, DOC_TYPE, DOC_NUM, ACCOUNT,
	CLIENT, COA, CURRENCY, SUP_LINK_CODE, SUP_LINK_BRANCH, SUP_LINK_REGION, SUP_LINK_LOCAL_REGION, LINK_ACCOUNT,
	LINK_CLIENT, LINK_COA, LINK_CURRENCY, DEBIT, CREDIT, PURPOSE_CODE, NAME, LINK_NAME, PURPOSE_TEXT  FROM V_OFFLINE_CREDIT_OPERATION t
	WHERE sup_branch = :bank AND DATA BETWEEN TO_DATE(:begin,'DD.MM.YYYY') AND TO_DATE(:end,'DD.MM.YYYY') AND OPERATION_TYPE IN (${qOps})  AND TYPE = :infoType
	order by data, sup_branch`;
      params = { begin, end, bank, infoType };
    }
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method: 'OperationReport' });
  }

  /** Журнал запущенных отчётов за период. */
  getReports(begin: string | undefined, end: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM REPORTS.v_reports t WHERE  SYS_DT >= TO_DATE(:begin, 'DD.MM.YYYY') AND SYS_DT <= TO_DATE(:end, 'DD.MM.YYYY') ORDER BY begin_dt desc, bank`;
    const params = { begin, end };
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method: 'OperationReport' });
  }

  /** Отмена запущенного отчёта. */
  getCancelReport(pJournal: string | number, pReportId: string | undefined): Promise<unknown> {
    const script = `BEGIN :result := reports.MODEL_REPORTS.CancelProcess(:pJournal, :pReportId); END;`;
    const param = { pJournal, pReportId };
    return this.db.callFunction(Pool.Main, script, param, { type: 'Number', maxSize: 1 }, true, {
      fn: 'Reports',
      method: 'getCancelReport',
    });
  }

  /** Баланс в разрезе валют на дату. */
  getReportBalanceByCurrency(reportDate: string | undefined, currency: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM TABLE(GET_BALANCE_CURRENCY(TO_DATE(:reportDate, 'DD.MM.YYYY'), :currency))`;
    const params = { reportDate, currency };
    return this.db.select(Pool.Main, script, params, { fn: 'REFERS', method: 'getBasePeriod' });
  }
}
