import { Injectable } from '@nestjs/common';
import { OracleService } from '../database/oracle.service';
import { Pool, Row } from '../database/oracle-types';

export interface RefreshTokenRow extends Row {
  ID: number;
  JOURNAL: string | number;
  USER_ID: string | number;
  DEVICE_ID: string | null;
  JTI: string;
  PARENT_JTI: string | null;
  TOKEN_HASH: string;
  EXPIRES_AT: Date;
  REVOKED: number;
  USED_AT: Date | null;
}

/** Порт controllers/users/refreshRepo.js — таблица REFRESH_TOKENS и функции USER_WS. */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly db: OracleService) {}

  private exec(script: string, param: Record<string, unknown>, method: string): Promise<number | null> {
    return this.db.callFunction(Pool.Main, script, param, { type: 'Number', maxSize: 32767 }, true, {
      fn: 'OFFLINE',
      method,
    });
  }

  saveRefreshToken(
    pJournal: unknown,
    userId: unknown,
    deviceId: string | null,
    jti: string,
    parentJti: string | null,
    tokenHash: string,
    expiresAt: Date,
    ip: string | undefined,
    userAgent: string | undefined,
  ): Promise<number | null> {
    const script = `BEGIN :result := USER_WS.saveRefreshToken(:pJournal, :userId, :deviceId, :jti, :parentJti, :tokenHash, :expiresAt, :ip, :userAgent); END;`;
    return this.exec(
      script,
      { pJournal, userId, deviceId, jti, parentJti, tokenHash, expiresAt, ip, userAgent },
      'saveRefreshToken',
    );
  }

  async getByTokenHash(tokenHash: string, agent: string | undefined): Promise<RefreshTokenRow | undefined> {
    const script = `SELECT ID, JOURNAL, USER_ID, DEVICE_ID, JTI, PARENT_JTI, TOKEN_HASH, EXPIRES_AT, REVOKED, USED_AT
          FROM REFRESH_TOKENS
         WHERE TOKEN_HASH = :tokenHash AND USER_AGENT= :agent`;
    const result = await this.db.select<RefreshTokenRow>(
      Pool.Main,
      script,
      { tokenHash, agent },
      {
        fn: 'OFFLINE',
        method: 'getByTokenHash',
      },
    );
    // в оригинале result[0] при null бросал TypeError → ловился в контроллере
    if (result === null) throw new Error('getByTokenHash: database error');
    return result[0];
  }

  markUsedAndRotate(jtiToUse: string): Promise<number | null> {
    return this.exec(`BEGIN :result := USER_WS.markUsedAndRotate(:jtiToUse); END;`, { jtiToUse }, 'markUsedAndRotate');
  }

  revokeFamily(userId: unknown, deviceId: unknown): Promise<number | null> {
    return this.exec(
      `BEGIN :result := USER_WS.revokeFamily(:userId, :deviceId); END;`,
      { userId, deviceId },
      'revokeFamily',
    );
  }
}
