import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { safeParse } from '../common/utils/json.util';
import { getBody, getParam } from '../common/utils/request.util';
import { CryptoSignService } from './crypto-sign.service';
import { UsersRepository } from './users.repository';

export const ACCESS_TTL_SEC = 60 * 60;
export const REFRESH_TTL_SEC = 14 * 24 * 60 * 60;

/** Ответ USER_WS.CheckUser / AuthUser (JSON из БД). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserAnswer = { code?: string; message?: string; result?: any; [key: string]: any };

/** Порт controllers/users/model.js (validate, tokenAccess) и signAccess из controller.js. */
@Injectable()
export class UsersService {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersRepository,
    private readonly crypto: CryptoSignService,
  ) {}

  /**
   * Проверка пользователя: (опционально) ЭЦП → USERS.CheckUser в ИАБС → USER_WS.CheckUser.
   * Исключения (например, недоступность БД ИАБС) пробрасываются — контроллер
   * отвечает 401 «Техническая ошибка системы», как оригинал.
   */
  async validate(req: Request): Promise<UserAnswer> {
    const aliasName = '/GRCI/';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableNumber: any = '';
    const reqParam = getBody(req);
    const jsBody = safeParse(reqParam.requestBody);
    if (jsBody.cripto) {
      const cryptoResult = await this.crypto.check(jsBody.cripto);
      if (cryptoResult.code === '0') return cryptoResult;
      tableNumber = await this.crypto.parse(cryptoResult.xmlResponse);
    }

    const user = await this.users.odbankCheckUser(
      jsBody.login,
      jsBody.password,
      tableNumber.userId || null,
      aliasName,
      reqParam.ip ?? '',
    );
    // в оригинале при null здесь возникал TypeError → 401 «Техническая ошибка системы»
    if (!user) throw new Error('USERS.CheckUser: no result');
    const result = await this.users.userCheck(
      user.result,
      user.pResText,
      reqParam.requestBody,
      reqParam.requestDT,
      reqParam.ip,
      2,
    );
    return safeParse(result);
  }

  /** Регистрация выданного access-токена в USER_WS.AuthUser. */
  async tokenAccess(userResult: UserAnswer, token: string): Promise<UserAnswer> {
    const reqTokenBody = getParam(userResult);
    const result = await this.users.accessToken(
      userResult.result.journal,
      userResult.result.user,
      token,
      reqTokenBody.requestBody,
      reqTokenBody.requestDT,
    );
    return safeParse(result);
  }

  signAccess(payload: { sub: string; journal: unknown }): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        this.config.get<string>('JWT_SECRET') ?? '',
        { algorithm: 'HS256', expiresIn: ACCESS_TTL_SEC },
        (err, token) => (err || !token ? reject(err) : resolve(token)),
      );
    });
  }

  logout(journal: unknown): Promise<string | null> {
    return this.users.loginOut(journal, 2);
  }
}
