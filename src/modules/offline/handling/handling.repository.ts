import { Injectable } from '@nestjs/common';
import { OracleService } from '../../../database/oracle.service';
import { Binds, Pool, Row } from '../../../database/oracle-types';

/** Порт controllers/offline/observable/handling/repo.js */
@Injectable()
export class HandlingRepository {
  constructor(private readonly db: OracleService) {}

  private query(script: string, params: Binds, method: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, params, { fn: 'OFFLINE', method });
  }

  /**
   * ctp — список типов через запятую, подставляется в IN (...).
   * Hardening: перед преобразованием оставляем только цифры и запятые
   * (защита от SQL-инъекции; для валидных значений результат тот же).
   * ctp === undefined → TypeError → 500, как в оригинале.
   */
  getSearch(
    pBegin: string | undefined,
    pEnd: string | undefined,
    pInFile: string | undefined,
    ctpRaw: string | undefined,
  ): Promise<Row[] | null> {
    let ctp: string = (ctpRaw as string).replace(/[^0-9,]/g, '');
    ctp = ctp
      .split(',')
      .map((item) => `'${item}'`)
      .join(',');
    const list: string[] = ctp.replace(/'/g, '').split(',');
    // массив в шаблонной строке соединяется через ',' — как в оригинале
    const script = `select * from TABLE(GET_OFFLINE_HANDLEFILES(:pBegin, :pEnd, :pInFile)) where INFO_TYPE IN (${list.join(',')})`;
    return this.query(script, { pBegin, pEnd, pInFile }, 'getSearch');
  }

  bFileProtocol(journalId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT JOURNAL, PARENT, TO_CHAR(REQ_DT, 'DD.MM.YYYY HH24:MI:SS') REQ_DT, TO_CHAR(RES_DT, 'DD.MM.YYYY HH24:MI:SS') res_dt,
	BANK, BRANCH, REPORT, FILE_NAME, TO_CHAR(FILE_DATE, 'DD.MM.YYYY') AS REPORT_DATE, LINE_COUNT, FILE_STATE, ERROR, MESSAGE, STATE, ERROR_TYPE
	FROM V_OFFLINE_JOURNAL WHERE PARENT = :journalId AND ROWNUM < 4`;
    return this.query(script, { journalId }, 'errProtocolByJournalId');
  }

  inPackageFile(journalId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT JOURNAL, PARENT, TO_CHAR(REQ_DT, 'DD.MM.YYYY HH24:MI:SS') REQ_DT, TO_CHAR(RES_DT, 'DD.MM.YYYY HH24:MI:SS') res_dt, BANK,
	BRANCH, REPORT, FILE_NAME, TO_CHAR(FILE_DATE, 'DD.MM.YYYY') AS REPORT_DATE, LINE_COUNT, FILE_STATE, ERROR, MESSAGE, STATE, ERROR_TYPE
	FROM V_OFFLINE_JOURNAL WHERE PARENT = :journalId AND IN_OUT = 1 AND ROWNUM < 4`;
    return this.query(script, { journalId }, 'infoByJournalId');
  }

  bFlatProtocol(journalId: string | undefined): Promise<Row[] | null> {
    const script = `SELECT * FROM  v_offline_splice_content WHERE FK_JOURNAL_OUT = :journalId ORDER BY LINE`;
    return this.query(script, { journalId }, 'infoByJournalId');
  }
}
