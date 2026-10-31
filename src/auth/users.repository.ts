import { Injectable } from '@nestjs/common';
import { OracleService } from '../database/oracle.service';
import { Pool, Row } from '../database/oracle-types';

/** Порт controllers/users/repo.js — функции USER_WS (ГРКИ) и USERS (ИАБС). */
@Injectable()
export class UsersRepository {
  constructor(private readonly db: OracleService) {}

  /**
   * USERS.CheckUser в ИАБС: по логину/паролю или по ID ЭЦП.
   * @returns outBinds `{ result, pResText }` или null
   */
  async odbankCheckUser(
    pLogin: string | undefined,
    pPassword: string | undefined,
    pDSignID: string | null,
    pSys: string,
    pIPAddr: string,
  ): Promise<Row | null> {
    pIPAddr = pIPAddr.substr(0, 11);
    const pResText = this.db.outParam('String', 4000);
    let script: string;
    let param: Record<string, unknown>;
    if (pDSignID) {
      script = `BEGIN :result := USERS.CheckUser(:pIPAddr, :pDSignID, :pSys, :pResText); END;`;
      param = { pIPAddr, pDSignID, pSys, pResText };
    } else {
      script = `BEGIN :result := USERS.CheckUser(:pIPAddr, :pLogin, :pPassword, :pSys, :pResText); END;`;
      param = { pIPAddr, pLogin, pPassword, pSys, pResText };
    }
    return this.db.callFunctionInOut(Pool.Iabs, script, param, { type: 'NUMBER', maxSize: 12 }, true, {
      fn: 'USER_REPO',
      method: 'OdbankCheckUser',
    });
  }

  /** USER_WS.CheckUser → JSON-строка */
  async userCheck(
    pUser: unknown,
    pText: unknown,
    pReqBody: string,
    pReqDT: string,
    pIp: string | undefined,
    pLoc: number,
  ): Promise<string | null> {
    const script = `BEGIN :result := USER_WS.CheckUser(:pUser, :pText, :pReqBody, :pReqDT, :pIp, :pLoc); END;`;
    return this.db.callFunction(
      Pool.Main,
      script,
      { pUser, pText, pReqBody, pReqDT, pIp, pLoc },
      { type: 'String', maxSize: 32767 },
      true,
      { fn: 'USER_CONTROLLER', method: 'CheckUser' },
    );
  }

  /**
   * USER_WS.AuthUser → JSON-строка.
   *
   * ВНИМАНИЕ (паритет с оригиналом): в model.js функция вызывалась с 6 аргументами
   * при 7 параметрах — `accessToken(journal, user, token, reqBody, reqDT, 2)`,
   * т.е. в `pIp` попадало `2`, а `pLoc` был undefined (NULL). Сохраняем эти значения,
   * чтобы поведение PL/SQL-функции не изменилось.
   */
  async accessToken(
    pJournal: unknown,
    pUser: unknown,
    pToken: string,
    pReqBody: string,
    pReqDT: string,
  ): Promise<string | null> {
    const script = `BEGIN :result := USER_WS.AuthUser(:pJournal, :pUser, :pToken, :pReqBody, :pReqDT, :pIp, :pLoc); END;`;
    return this.db.callFunction(
      Pool.Main,
      script,
      { pJournal, pUser, pToken, pReqBody, pReqDT, pIp: 2, pLoc: null },
      { type: 'String', maxSize: 32767 },
      true,
      { fn: 'USER_CONTROLLER', method: 'AuthUser' },
    );
  }

  /** USER_WS.erToken → JSON-строка с ответом об ошибке токена */
  async errorToken(param: {
    pToken: string;
    pError: number;
    pRequestBody: string;
    pRequestDT: string;
    pLocalization: number;
  }): Promise<string | null> {
    const script = `BEGIN :result := USER_WS.erToken(:pToken, :pError, :pRequestBody, :pRequestDT, :pLocalization); END;`;
    return this.db.callFunction(Pool.Main, script, param, { type: 'String', maxSize: 32767 }, true, {
      fn: 'USER_CONTROLLER',
      method: 'erToken',
    });
  }

  /** USER_WS.UserLogOut → JSON-строка */
  async loginOut(pJournal: unknown, pLoc: number): Promise<string | null> {
    const script = `BEGIN :result := USER_WS.UserLogOut(:pJournal, :pLoc); END;`;
    return this.db.callFunction(Pool.Main, script, { pJournal, pLoc }, { type: 'String', maxSize: 32767 }, true, {
      fn: 'USER_CONTROLLER',
      method: 'loginOut',
    });
  }

  /** USER_WS.CheckToken → число (0 — сессия журнала не активна) */
  async checkUser(pJournal: unknown): Promise<number | null> {
    const script = `BEGIN :result := USER_WS.CheckToken(:pJournal); END;`;
    return this.db.callFunction(Pool.Main, script, { pJournal }, { type: 'Number', maxSize: 32767 }, true, {
      fn: 'USER_CONTROLLER',
      method: 'checkUser',
    });
  }
}
