import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthRequest, JwtUser } from '../common/decorators/current-user.decorator';
import { RawResponseException } from '../common/exceptions/raw-response.exception';
import { safeParse } from '../common/utils/json.util';
import { getParam } from '../common/utils/request.util';
import { UsersRepository } from './users.repository';

const LOCALIZATION = 2;

/**
 * Проверка access-токена — порт public/helpers/token/verify.js.
 *
 *  - токен берётся из заголовка `Authorization` как есть (без префикса Bearer);
 *  - нет токена → 401 `{ code:'0', message:'Значение пустое(Token)', result:{ logOut:'1' } }`;
 *  - невалидный токен → 401 с ответом USER_WS.erToken (pError: 1 invalid token,
 *    2 jwt expired, 3 invalid signature, 4 прочее);
 *  - USER_WS.CheckToken(journal) === 0 → 401 с ответом erToken, pError = 4.
 *    (В оригинале эта ветка обращалась к необъявленным переменным, падала с
 *    ReferenceError и уходила в catch с pError = 4 — итоговое поведение сохранено.)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.header('Authorization');

    if (!token) {
      throw new RawResponseException(401, {
        code: '0',
        message: 'Значение пустое(Token)',
        result: { logOut: '1' },
      });
    }

    let verified: JwtUser;
    try {
      verified = jwt.verify(token, this.config.get<string>('JWT_SECRET') ?? '') as JwtUser;
    } catch (err) {
      const message = (err as Error).message;
      let pError = 4;
      if (message === 'invalid token') pError = 1;
      else if (message === 'jwt expired') pError = 2;
      else if (message === 'invalid signature') pError = 3;
      throw await this.reject(token, pError, req.body);
    }

    const active = await this.users.checkUser(verified.journal);
    if (active === 0) {
      throw await this.reject(token, 4, req.body);
    }

    req.user = verified;
    return true;
  }

  private async reject(token: string, pError: number, body: unknown): Promise<RawResponseException> {
    const requestBody = getParam(body);
    const answer = await this.users.errorToken({
      pToken: token,
      pError,
      pRequestDT: requestBody.requestDT,
      pRequestBody: requestBody.requestBody,
      pLocalization: LOCALIZATION,
    });
    return new RawResponseException(401, safeParse(answer));
  }
}
