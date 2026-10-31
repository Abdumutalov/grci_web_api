import { Injectable } from '@nestjs/common';
import { OracleService } from '../../../database/oracle.service';
import { Binds, Pool, Row } from '../../../database/oracle-types';

/** Порт controllers/offline/observable/response/repo.js */
@Injectable()
export class ResponseRepository {
  constructor(private readonly db: OracleService) {}

  private query(script: string, params: Binds, method: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method });
  }

  getRequest(pBegin: string | undefined, pEnd: string | undefined, pInfoType: string): Promise<Row[] | null> {
    const params = { pBegin, pEnd, pInfoType };
    const script = `select * from table(GET_RESPONSE_OPERATION(:pBegin, :pEnd, :pInfoType))`;
    return this.query(script, params, 'V_OFFLINE_REQUEST_TOTAL_');
  }

  /** state === '0' → 2, иначе 1 (как в оригинале). */
  getRequestByBank(
    info_type: string | undefined,
    bank: string | undefined,
    report: string | undefined,
    state: string | undefined,
    begin: string | undefined,
    end: string | undefined,
  ): Promise<Row[] | null> {
    let state_: number;
    if (state === '0') {
      state_ = 2;
    } else {
      state_ = 1;
    }
    const script = `SELECT * FROM  V_OFFLINE_RESPONSE_JOURNAL WHERE (CASE WHEN LENGTH(:bank) > 3 THEN BRANCH_CODE ELSE BANK_CODE END) =  :bank AND REPORT = :report AND STATE = :state_ AND INFO_TYPE = :info_type
				AND report_date_ BETWEEN TO_DATE(:begin, 'DD.MM.YYYY') AND TO_DATE(:end, 'DD.MM.YYYY')  order by report_date_, branch_code`;
    const params = { bank, report, state_, info_type, begin, end };
    return this.query(script, params, 'V_OFFLINE_RESPONSE_JOURNAL');
  }

  getProtocol(journalId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM  v_offline_content_out WHERE FK_JOURNAL = :journalId  AND ROWNUM < 2`;
    return this.query(script, { journalId }, 'protocolByJournalId');
  }

  getInFlatFile(mailId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM  V_OFFLINE_CONTENT_IN WHERE FK_MAIL_REGISTER = :mailId ORDER BY LINE`;
    return this.query(script, { mailId }, 'protocolByJournalId');
  }

  getBadProtocol(mailId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM  v_offline_splice_content WHERE FK_MAIL_REGISTER = :mailId ORDER BY LINE `;
    return this.query(script, { mailId }, 'getBadProtocol');
  }
}
