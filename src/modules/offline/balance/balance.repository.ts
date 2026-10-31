import { Injectable } from '@nestjs/common';
import { OracleService } from '../../../database/oracle.service';
import { Binds, Pool, Row } from '../../../database/oracle-types';

type Q = string | undefined;

/** Порт controllers/offline/observable/balance/repo.js */
@Injectable()
export class BalanceRepository {
  constructor(private readonly db: OracleService) {}

  private query(script: string, params: Binds, queryName: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method: queryName });
  }

  getBalance(reportDate: Q, type: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM TABLE(get_balance(to_date(:reportDate, 'dd.mm.yyyy'), :type)) ORDER BY BANK_CODE`;
    return this.query(script, { reportDate, type }, 'getBalance');
  }

  getBalanceMKO(pMonth: Q, pYear: Q, pType: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM TABLE(get_balance_mko(:pMonth,:pYear,:pType))`;
    return this.query(script, { pMonth, pYear, pType }, 'getBalanceMKO');
  }

  getBalanceDetailMKO(pMonth: Q, pYear: Q, pReport: Q, pBranch: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM v_observable_balance_mko where year = :pYear AND month = :pMonth AND report = :pReport AND branch = :pBranch order by coa, currency`;
    return this.query(script, { pMonth, pYear, pReport, pBranch }, 'getBalanceMKO');
  }

  getBalanceCompare(reportDate: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM TABLE(get_balance_compare(to_date(:reportDate, 'dd.mm.yyyy')))`;
    return this.query(script, { reportDate }, 'get_balance_compare');
  }

  getBalanceByBranch(reportDate: Q, bank: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM v_observable_balance_branch WHERE REPORT_DATE = TO_DATE(:reportDate, 'DD.MM.YYYY') AND bank = :bank ORDER BY BRANCH`;
    return this.query(script, { reportDate, bank }, 'getBalanceByBranch');
  }

  getBalanceByOffice(reportDate: Q, bank: Q): Promise<Row[] | null> {
    const script = `SELECT BRANCH_.UNION_ID HEAD_BRANCH, BRANCH_.Branch_Code BRANCH, BRANCH_.BRANCH_NAME BRANCH_NAME, BRANCH_.AREA, AREA_.NAME AREA_NAME,  BRANCH_.REGION, REGION_.NAME REGION_NAME, W.CHECK_008, W.CHECK_009
	FROM
   (
   SELECT BRANCH, OFFICE, SUM(CHECK_008) CHECK_008, SUM(CHECK_009) CHECK_009 FROM (
   SELECT  BRANCH, OFFICE, 0 CHECK_008 ,
  CASE
	  WHEN SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN 1
	  WHEN SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END) = COUNT(*) THEN 0
	  WHEN SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END) > 0 THEN 2
	  ELSE 0
	END AS CHECK_009

	 FROM LOADER.OBSERVABLE_BALANCE_OFFICE
   WHERE REPORT_DATE=to_date(:reportDate,'dd.mm.yyyy') AND REPORT='009' and bank =:bank
   GROUP BY BRANCH, OFFICE
   union all
   SELECT  BRANCH, OFFICE,
  CASE
	  WHEN SUM(CASE WHEN STATE = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN 1
	  WHEN SUM(CASE WHEN STATE = 0 THEN 1 ELSE 0 END) = COUNT(*) THEN 0
	  WHEN SUM(CASE WHEN STATE = 2 THEN 1 ELSE 0 END) > 0 THEN 2
	  ELSE 0
	END AS CHECK_008, 0 CHECK_009
	 FROM LOADER.OBSERVABLE_BALANCE_OFFICE
   WHERE REPORT_DATE=to_date(:reportDate,'dd.mm.yyyy') AND REPORT='008' and bank =:bank
   GROUP BY BRANCH, OFFICE
   ) GROUP BY BRANCH, OFFICE
   )  W
   INNER JOIN REFERS.R_BRANCHES BRANCH_ ON BRANCH_.BRANCH_CODE = W.OFFICE
   INNER JOIN REFERS.R_REGIONS REGION_ ON REGION_.CODE = BRANCH_.REGION
   INNER JOIN REFERS.R_AREAS AREA_     ON AREA_.CODE = BRANCH_.AREA
   WHERE BRANCH_.STATUS = 1 AND BRANCH_.BANK_CODE <> '001' and BRANCH_.bank_code =:bank`;
    return this.query(script, { reportDate, bank }, 'getBalanceByBranch');
  }

  /** type 1 / "1" — V_OBSERVABLE_BALANCE_BANK, иначе V_OBSERVABLE_BALANCE_OFFICE. */
  getBalanceDetail(reportDate: Q, report: Q, bank: Q, branch: Q, type: Q): Promise<Row[] | null> {
    let script: string;
    if ((type as unknown) === 1 || type === '1') {
      script = `SELECT TO_CHAR(REPORT_DATE, 'DD.MM.YYYY') REPORT_DATE, REPORT, BANK, BANK_NAME, BRANCH, BRANCH_NAME, COA, COA_NAME, CURRENCY, CURRENCY_NAME, BEGIN_IXBS,
       						BEGIN_GRCI, BEGIN_DIFF, DEBIT_IXBS, DEBIT_GRCI, DEBIT_DIFF, CREDIT_IXBS, CREDIT_GRCI, CREDIT_DIFF, END_IXBS, END_GRCI, END_DIFF, STATE
					FROM   V_OBSERVABLE_BALANCE_BANK WHERE BANK = :bank AND REPORT_DATE = TO_DATE(:reportDate, 'DD.MM.YYYY') AND BRANCH = :branch AND REPORT = :report
	   				ORDER BY REPORT_DATE, BANK, BRANCH, COA, CURRENCY`;
    } else {
      script = `SELECT TO_CHAR(REPORT_DATE, 'DD.MM.YYYY') REPORT_DATE, REPORT, BANK, BANK_NAME, BRANCH, BRANCH_NAME, COA, COA_NAME, CURRENCY, CURRENCY_NAME, BEGIN_IXBS,
       						BEGIN_GRCI, BEGIN_DIFF, DEBIT_IXBS, DEBIT_GRCI, DEBIT_DIFF, CREDIT_IXBS, CREDIT_GRCI, CREDIT_DIFF, END_IXBS, END_GRCI, END_DIFF, STATE
					FROM   V_OBSERVABLE_BALANCE_OFFICE WHERE BANK = :bank AND REPORT_DATE = TO_DATE(:reportDate, 'DD.MM.YYYY') AND BRANCH = :branch AND REPORT = :report
	   				ORDER BY REPORT_DATE, BANK, BRANCH, COA, CURRENCY`;
    }
    return this.query(script, { reportDate, report, bank, branch }, 'getBalanceDetail');
  }
}
