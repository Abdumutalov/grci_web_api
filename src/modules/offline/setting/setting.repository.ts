import { Injectable } from '@nestjs/common';
import { OracleService } from '../../../database/oracle.service';
import { Binds, Pool, Row } from '../../../database/oracle-types';

type Q = unknown;

/**
 * Порт controllers/offline/setting/contract/repo.js
 * (updContractByBank в оригинале не смонтирован в routes.js — не портирован).
 */
@Injectable()
export class SettingRepository {
  constructor(private readonly db: OracleService) {}

  /** Порт executeProcedure: `BEGIN :result := ...; END;`, результат "Number". */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private procedure(script: string, param: Binds, resultSize: number, functionName: string): Promise<any> {
    return this.db.callFunction(Pool.Main, script, param, { type: 'Number', maxSize: resultSize }, true, {
      fn: 'OFFLINE',
      method: functionName,
    });
  }

  /** Порт executeQuery. */
  private query(script: string, params: Binds | null, queryName: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method: queryName });
  }

  // ------------------------------------------------------------- contract

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractByBranch(pBranch: Q, pValue: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_checkContract_branch(:pBranch, :pValue); END;`;
    return this.procedure(script, { pBranch, pValue }, 32767, 'upd_checkContract_branch');
  }

  selContractByBranch(bank: Q): Promise<Row[] | null> {
    const script = `SELECT KEY, CODE, BANK_CODE, NAME, ASSIGN_, CHECK_ FROM V_OFFLINE_BRANCH_CONTROLE WHERE BANK_CODE = :bank ORDER BY CODE`;
    return this.query(script, { bank }, 'getControleByBank');
  }

  selContractByBank(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM V_CONRACT_CONDITION`, null, 'selContractByBank');
  }

  selReportVersionModeCondition(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM V_REPORT_VER_MODE_CONDITION`, null, 'selReportVersionModeCondition');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updReportVersionModeCondition(pType: Q, pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updReportVerModeCondition(:pType, :pBank, :pCheck); END;`;
    return this.procedure(script, { pType, pBank, pCheck }, 32767, 'updReportVersionModeCondition');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updReportBalanceAccreditiveCondition(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updReportBalanceAccCondition(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updReportBalanceAccreditiveCondition');
  }

  selBalanceMkoCondition(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM V_BALANCE_MKO_CONDITION`, null, 'selBalanceMkoCondition');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updBalanceMkoCondition(pType: Q, pMko: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updBalanceMkoCondition(:pType, :pMko, :pCheck); END;`;
    return this.procedure(script, { pType, pMko, pCheck }, 32767, 'updBalanceMkoCondition');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractPayment(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_contract_payment(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updContractPayment');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractClosedAction(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_contract_action(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updContractClosedAction');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractOfficeClosedAction(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_contract_office_close(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updContractOfficeClosedAction');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updBalanceCheck(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_balance_check(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'upd_balance_check');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractProvision(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_contract_provision(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updContractProvision');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updContractProlongation(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_contract_prolongation(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updContractProlongation');
  }

  // ------------------------------------------------------ report condition

  reportCondition(
    pJournal: Q,
    pReport: Q,
    pInfoType: Q,
    pBank: Q,
    pBranch: Q,
    pReason: Q,
    pBegin: Q,
    pEnd: Q,
    pReload: number,
    pCheckBalance: number,
    pCheckContract: number,
    pCheckOperation: number,
    pCheckLoan: number,
    pGrciCoas: number,
    pCheckActivePassive: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.report_conditions(:pJournal, :pReport, :pInfoType, :pBank, :pBranch, :pReason, :pBegin, :pEnd, :pReload, :pCheckBalance, :pCheckContract, :pCheckOperation, :pCheckLoan, :pGrciCoas, :pCheckActivePassive); END;`;
    return this.procedure(
      script,
      {
        pJournal,
        pReport,
        pInfoType,
        pBank,
        pBranch,
        pReason,
        pBegin,
        pEnd,
        pReload,
        pCheckBalance,
        pCheckContract,
        pCheckOperation,
        pCheckLoan,
        pGrciCoas,
        pCheckActivePassive,
      },
      2,
      'report_conditions',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delReportCondition(pJournal: Q, pReport: Q, pBank: Q, pBranch: Q, pCreated: Q, pBegin: Q, pEnd: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.del_report_conditions(:pJournal, :pReport, :pBank, :pBranch, :pCreated, :pBegin, :pEnd); END;`;
    return this.procedure(
      script,
      { pJournal, pReport, pBank, pBranch, pCreated, pBegin, pEnd },
      2,
      'del_report_conditions',
    );
  }

  selReportCondition(state: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM r_condition WHERE STATE = :state`;
    return this.query(script, { state }, 'selReportCondition');
  }

  selReportConditionDetail(report: Q, branch: Q, begin: Q, end: Q): Promise<Row[] | null> {
    const script = `SELECT * FROM V_OFFLINE_RESPONSE_JOURNAL WHERE BRANCH_CODE = :branch AND REPORT_DATE_ BETWEEN TO_DATE(:begin, 'DD.MM.YYYY') AND TO_DATE(:end, 'DD.MM.YYYY') AND REPORT = :report ORDER BY REQ_DT DESC`;
    return this.query(script, { report, branch, begin, end }, 'selReportConditionDetail');
  }

  // -------------------------------------------------------- operation type

  selOperationTypeCondition(): Promise<Row[] | null> {
    return this.query(
      `SELECT * FROM r_operation_type_condition ORDER BY BANK_CODE, GROUP_CODE`,
      null,
      'selOperationTypeCondition',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updOperationTypeAction(pBank: Q, pCode: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_operation_type_action(:pBank, :pCode, :pCheck); END;`;
    return this.procedure(script, { pBank, pCode, pCheck }, 32767, 'updOperationTypeAction');
  }

  // ----------------------------------------------------------- cor account

  selCorAccount(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM v_coraccount`, null, 'selCorAccount');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updCorAccount(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_coraccount(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'upd_coraccount');
  }

  selPrevBalanceComprasion(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM v_balance_comprasion`, null, 'selPrevBalanceComprasion');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updPrevBalanceComprasion(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_prev_balance_comprasion(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'updPrevBalanceComprasion');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updTransactionCheckDebitCredit(pBank: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_check_debit_credit(:pBank, :pCheck); END;`;
    return this.procedure(script, { pBank, pCheck }, 32767, 'upd_check_debit_credit');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updReportCreditBank(pBank: Q, pType: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updReportCreditBank(:pBank, :pType, :pCheck); END;`;
    return this.procedure(script, { pBank, pType, pCheck }, 32767, 'updReportCreditBank');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updReportCreditCoa(pInfoType: Q, pCreditType: Q, pCoa: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updReportCreditCoa(:pInfoType, :pCreditType, :pCoa, :pCheck); END;`;
    return this.procedure(script, { pInfoType, pCreditType, pCoa, pCheck }, 32767, 'updReportCreditCoa');
  }

  selCorAccountDate(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM v_corAccountDate`, null, 'selCorAccountDate');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updCorAccountDate(pDate: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.upd_corAccountDate(:pDate); END;`;
    return this.procedure(script, { pDate }, 32767, 'updCorAccountDate');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updReportBalanceCoa(pBank: Q, pCoa: Q, pCheck: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updReportBalanceCoa(:pBank, :pCoa, :pCheck); END;`;
    return this.procedure(script, { pBank, pCoa, pCheck }, 32767, 'updReportBalanceCoa');
  }

  selReportCoaCondition(): Promise<Row[] | null> {
    const script = `SELECT BANK_CODE KEY, BANK_CODE, BANK_NAME, COA, COA_NAME, STATE FROM V_REPORT_COA_CONDITION`;
    return this.query(script, null, 'selReportCoaCondition');
  }

  selReportCreditBankCondition(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM V_REPORT_CREDIT_BANK_CONDITION`, null, 'selReportCreditCoaCondition');
  }

  selReportCreditCoaCondition(): Promise<Row[] | null> {
    return this.query(`SELECT * FROM V_report_credit_coa_condition`, null, 'selReportCreditCoaCondition');
  }

  /** Фильтр по файлу пакета добавляется только для непустого pInFile (как в оригинале, включая 'undefined'). */
  selCreditOperationCorrectionCondition(pBegin: Q, pEnd: Q, pInFile: Q): Promise<Row[] | null> {
    let condition = '';
    const params: Binds = { pBegin, pEnd };

    if (pInFile != null && pInFile !== '' && pInFile !== 'undefined') {
      condition = ' AND UPPER(PACKAGE_FILE) = UPPER(:pInFile)';
      params.pInFile = pInFile;
    }

    const script = `
		SELECT *
		FROM v_credit_operation_correction
		WHERE trunc(sys_date) >= to_date(:pBegin,'dd.mm.yyyy')
		  AND trunc(sys_date) <= to_date(:pEnd,'dd.mm.yyyy')
		  ${condition}
	`;

    return this.query(script, params, 'selReportCreditCoaCondition');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updCreditOperationCorrection(pJournal: Q, pId: Q, pState: Q): Promise<any> {
    const script = `BEGIN :result := OFFLINE_MODEL.updCreditOperationCorr(:pJournal, :pId, :pState); END;`;
    return this.procedure(script, { pJournal, pId, pState }, 1, 'updCreditOperationCorrection');
  }
}
