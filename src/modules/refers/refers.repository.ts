import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Binds, Pool, Row } from '../../database/oracle-types';

/** Порт controllers/refers/repo.js — справочники. */
@Injectable()
export class RefersRepository {
  constructor(private readonly db: OracleService) {}

  /** Порт executeQuery: SELECT в основном пуле, метки 'REFERS' / queryName. */
  private executeQuery(script: string, params: Binds | null, queryName: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'REFERS', method: queryName });
  }

  /**
   * ИСПРАВЛЕНИЕ ОШИБКИ ОРИГИНАЛА: в repo.js передавалась необъявленная
   * переменная `params` → ReferenceError → HTTP 500 при каждом вызове.
   * Здесь binds = null, чтобы эндпоинт работал.
   */
  getCreditOperation(): Promise<Row[] | null> {
    const script = `SELECT * FROM V_CREDIT_ORGANIZATION`;
    return this.executeQuery(script, null, 'getCreditOperation');
  }

  getBranch(bank: string | undefined): Promise<Row[] | null> {
    const script = `SELECT branch_code AS value, branch_code || '-' || branch_name AS label FROM R_BRANCHES WHERE BANK_CODE = :bank AND STATUS = 1 ORDER BY BRANCH_CODE`;
    const params = { bank };
    return this.executeQuery(script, params, 'getBranch');
  }

  getBank(): Promise<Row[] | null> {
    const script = `SELECT * FROM r_banks`;
    return this.executeQuery(script, null, 'getBank');
  }

  getLogState(): Promise<Row[] | null> {
    const script = `SELECT code AS value, name AS label FROM refers.R_WSLOG_STATES WHERE STATUS = 1 ORDER BY code`;
    return this.executeQuery(script, null, 'getLogState');
  }

  getBankFilter(): Promise<Row[] | null> {
    const script = `SELECT CODE_BANK AS value, CODE_BANK || '-' || NAME_BANK AS label FROM R_BANK_SHORT`;
    return this.executeQuery(script, null, 'getBankFilter');
  }

  getCurrency(): Promise<Row[] | null> {
    const script = `SELECT * FROM R_CURRENCY WHERE STATUS = 1 ORDER BY CODE`;
    return this.executeQuery(script, null, 'getCurrency');
  }

  getLoanCoa(): Promise<Row[] | null> {
    const script = `SELECT * FROM R_LOAN_COAS ORDER BY CODE`;
    return this.executeQuery(script, null, 'getLoanCoa');
  }

  getLayout(): Promise<Row[] | null> {
    const script = `SELECT * FROM V_OFFLINE_LAYOUT`;
    return this.executeQuery(script, null, 'getLayout');
  }

  getOperDate(): Promise<Row[] | null> {
    const script = `SELECT TO_CHAR(MAX(data), 'dd.mm.yyyy') operDate FROM V_CALENDAR WHERE data < TRUNC(SYSDATE) AND isworkday = 1`;
    return this.executeQuery(script, null, 'getOperDate');
  }

  getRefer(): Promise<Row[] | null> {
    const script = `SELECT CODE, NAME, SOURCE, REF_TYPE, REF_TYPE_NAME FROM R_REFERENCES`;
    return this.executeQuery(script, null, 'getRefer');
  }

  /** Как в оригинале: null/пустой результат первого запроса → TypeError → 500. */
  async getRefByCode(code: string | undefined): Promise<Row[] | null> {
    const script = `SELECT CODE, SOURCE FROM R_REFERENCES WHERE ROWNUM < 2 AND CODE = :code`;
    const params = { code };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableName: any = await this.executeQuery(script, params, 'getRefByCode');
    const tableScript = `SELECT * FROM ${tableName[0].SOURCE}`;
    return this.executeQuery(tableScript, null, 'getRefByCode');
  }

  /** Как в оригинале: null/пустой результат первого запроса → TypeError → 500. */
  async getRefByTable(table: string | undefined): Promise<Row[] | null> {
    const script = `SELECT CODE, SOURCE FROM R_REFERENCES WHERE ROWNUM < 2 AND SOURCE = :table`;
    const params = { table };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableName: any = await this.executeQuery(script, params, 'getRefByTable');
    const tableScript = `SELECT * FROM ${tableName[0].SOURCE}`;
    return this.executeQuery(tableScript, null, 'getRefByTable');
  }

  getNKO(): Promise<Row[] | null> {
    const script = `SELECT * FROM R_NKO ORDER BY NKO_CODE`;
    return this.executeQuery(script, null, 'getNKO');
  }

  /** Аргумент контроллера (req.query.value) в оригинале игнорируется. */
  getReport(): Promise<Row[] | null> {
    const script = `SELECT CODE AS value, CODE || '-' || NAME AS label FROM R_REPORT WHERE STATUS = 1 ORDER BY CODE`;
    return this.executeQuery(script, null, 'getReport');
  }

  getBalanceState(): Promise<Row[] | null> {
    const script = `SELECT CODE AS value, NAME AS label FROM R_BALANCE_STATE ORDER BY CODE`;
    return this.executeQuery(script, null, 'getBalanceState');
  }

  getCreditOperationReport(): Promise<Row[] | null> {
    const script = `SELECT CODE AS value, CODE || '-' || NAME_RU AS label FROM R_CREDIT_OPERATION_TYPES WHERE GROUP_CODE NOT IN ('02', '04') AND SUBGROUP_CODE <> '00' ORDER BY CODE`;
    return this.executeQuery(script, null, 'getCreditOperationReport');
  }

  getReportBasePeriod(): Promise<Row[] | null> {
    const script = `SELECT * FROM reports.r_base_period WHERE code <> 14 AND STATE = 1 ORDER BY CODE`;
    return this.executeQuery(script, null, 'getReportBasePeriod');
  }

  /** Метка протокола 'getCreditOrganizationTypes' — как в оригинале. */
  getCreditOrganization(): Promise<Row[] | null> {
    const script = `SELECT * FROM r_credit_organization`;
    return this.executeQuery(script, null, 'getCreditOrganizationTypes');
  }

  getReportForm(): Promise<Row[] | null> {
    const script = `SELECT * FROM R_REPORT_FORM WHERE TYPE = 2 AND STATE = 1 ORDER BY FORM_CODE`;
    return this.executeQuery(script, null, 'getReportForm');
  }

  getReportBalanceCurrency(): Promise<Row[] | null> {
    const script = `SELECT CODE AS value, CODE || '-' || NAME_RU AS label FROM R_CURRENCY WHERE CODE IN ('000', '156', '392', '398', '643', '840', '978') AND STATUS = 1 ORDER BY CODE`;
    return this.executeQuery(script, null, 'getReportBalanceCurrency');
  }

  getReportTypeForm(): Promise<Row[] | null> {
    const script = `SELECT code AS value, alias AS label FROM REPORTS.R_REPORT_TYPE WHERE STATE = 1 ORDER BY CODE`;
    return this.executeQuery(script, null, 'getReportTypeForm');
  }

  getCreditOrganizationTypes(): Promise<Row[] | null> {
    const script = `SELECT code AS value, name AS label FROM R_ORG_TYPES`;
    return this.executeQuery(script, null, 'getCreditOrganizationTypes');
  }

  getOrgTypes(): Promise<Row[] | null> {
    const script = `SELECT code AS value, name AS label, short_name FROM refers.R_ORG_TYPES WHERE STATUS = 1 ORDER BY code`;
    return this.executeQuery(script, null, 'getOrgTypes');
  }

  getOrganizations(type: string | undefined): Promise<Row[] | null> {
    const script = `SELECT NAME as label, CODE as value FROM refers.R_CREDIT_ORGANIZATIONS WHERE TYPE = :pType AND STATUS = 1 ORDER BY CODE`;
    const params = { pType: type };
    return this.executeQuery(script, params, 'getOrganizations');
  }
}
