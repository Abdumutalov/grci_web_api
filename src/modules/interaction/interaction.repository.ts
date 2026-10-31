import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Binds, Pool, Row } from '../../database/oracle-types';

/** Порт controllers/interaction/repo.js (PROJECTS_MODEL). */
@Injectable()
export class InteractionRepository {
  constructor(private readonly db: OracleService) {}

  /** Тело запроса передаётся как binds целиком (`{ ...body }`), курсор до 100000 строк. */
  getProjectList(body: unknown): Promise<Row[] | null> {
    const script = `BEGIN :result := PROJECTS_MODEL.getProjectsList(:pDestination, :pProjectId, :pProjectName, :pContractGuid, :pProjectState, :pSyncState, :pNorder, :pSize, :pPage); END;`;
    const param: Binds = { ...(body as Binds) };
    return this.db.callFunctionCursor(
      Pool.Main,
      script,
      param,
      true,
      { fn: 'PROJECTS_MODEL', method: 'getProjectsList' },
      100000,
    );
  }

  /**
   * CLOB-функция (maxSize 32768): строка JSON или null.
   * autoCommit = false: в оригинале dbModel получал true, но
   * executeFunctionResultClob не передавал его в conn.execute (действовал
   * дефолт oracledb — без фиксации, откат при закрытии соединения).
   */
  getProjectDetails(body: unknown): Promise<string | null> {
    const script = `BEGIN :result := PROJECTS_MODEL.getProjectDetails(:pProjectID, :pContractGUID); END;`;
    const param: Binds = { ...(body as Binds) };
    return this.db.callFunctionClob(Pool.Main, script, param, 32768, false, {
      fn: 'PROJECTS_MODEL',
      method: 'getProjectDetails',
    });
  }

  getDestinationLists(): Promise<Row[] | null> {
    const script = `SELECT * FROM REPORTS.R_PROJECT_DESTINATIONS ORDER BY CODE`;
    return this.db.select(Pool.Main, script, null, { fn: 'INTERACTION', method: 'getDestinationList' });
  }

  getProjectStateLists(): Promise<Row[] | null> {
    const script = `SELECT DISTINCT project_state FROM V_PROJECTS_LIST ORDER BY project_state`;
    return this.db.select(Pool.Main, script, null, { fn: 'INTERACTION', method: 'getDestinationList' });
  }

  getSyncStateLists(): Promise<Row[] | null> {
    const script = `SELECT DISTINCT sync_state FROM V_PROJECTS_LIST ORDER BY sync_state`;
    return this.db.select(Pool.Main, script, null, { fn: 'INTERACTION', method: 'getDestinationList' });
  }
}
