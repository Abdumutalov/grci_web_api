import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { serialize } from 'cookie';
import { createHash, randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenRepository } from './refresh-token.repository';
import { ACCESS_TTL_SEC, REFRESH_TTL_SEC, UsersService } from './users.service';

const SAME_SITE = 'lax';

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * /user — авторизация. Порт controllers/users (routes.js + controller.js).
 *
 * Ответы (статусы, тела, cookie refresh_token/csrf, заголовок auth-token)
 * повторяют оригинал байт-в-байт, поэтому методы работают с `@Res()` напрямую.
 */
@ApiTags('user')
@Controller('user')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly refreshRepo: RefreshTokenRepository,
  ) {}

  private get secure(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private setAuthCookies(res: Response, refreshValue: string): void {
    const csrf = randomUUID();
    res.setHeader('Set-Cookie', [
      serialize('refresh_token', refreshValue, {
        httpOnly: true,
        secure: this.secure,
        sameSite: SAME_SITE,
        path: '/user/refresh',
        maxAge: REFRESH_TTL_SEC,
      }),
      serialize('csrf', csrf, {
        httpOnly: false,
        secure: this.secure,
        sameSite: SAME_SITE,
        path: '/',
        maxAge: REFRESH_TTL_SEC,
      }),
    ]);
  }

  private clearAuthCookies(res: Response): void {
    res.setHeader('Set-Cookie', [
      serialize('refresh_token', '', {
        httpOnly: true,
        secure: this.secure,
        sameSite: 'lax',
        path: '/user/refresh',
        maxAge: 0,
      }),
      serialize('csrf', '', { httpOnly: false, secure: this.secure, sameSite: 'lax', path: '/', maxAge: 0 }),
    ]);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход по логину/паролю или ЭЦП (поле cripto)' })
  @ApiBody({
    schema: {
      properties: {
        login: { type: 'string' },
        password: { type: 'string' },
        cripto: { type: 'string', description: 'JSON-строка {"signedMsg": "..."}' },
        deviceId: { type: 'string' },
      },
    },
  })
  async login(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const userValidate = await this.service.validate(req);
      if (userValidate.code !== '1') {
        res.status(200).json(userValidate);
        return;
      }
      const access = await this.service.signAccess({
        sub: String(userValidate.result.user || userValidate.result.journal),
        journal: userValidate.result.journal,
      });
      const userTokenAccess = await this.service.tokenAccess(userValidate, access);
      if (userTokenAccess.code !== '1') {
        res.status(401).json(userTokenAccess);
        return;
      }
      const refresh = `${randomUUID()}.${randomUUID()}`;
      const tokenHash = hash(refresh);
      const deviceId = req.body?.deviceId || null;
      const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);

      await this.refreshRepo.saveRefreshToken(
        userValidate.result.journal,
        userValidate.result.user,
        deviceId,
        randomUUID(),
        null,
        tokenHash,
        expiresAt,
        req.ip,
        req.get('user-agent'),
      );

      this.setAuthCookies(res, refresh);
      res.header('auth-token', access);
      res.status(200).json({ ...userTokenAccess, accessToken: access, expiresIn: ACCESS_TTL_SEC });
    } catch {
      res.status(401).json({ code: '0', message: 'Техническая ошибка системы', result: {} });
    }
  }

  @Get('checkUser')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Проверка активности токена' })
  checkUser(): { code: string; message: string } {
    return { code: '1', message: 'Активный Token' };
  }

  /**
   * Паритет с оригиналом: getByTokenHash вызывается без user-agent
   * (условие `USER_AGENT = NULL` не находит запись), поэтому revokeFamily
   * при выходе фактически не выполняется. См. README → «Известные особенности».
   */
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('token')
  @ApiOperation({ summary: 'Выход (USER_WS.UserLogOut) и очистка cookie' })
  async logout(@Req() req: AuthRequest, @Res() res: Response): Promise<void> {
    try {
      const rt = req.cookies?.['refresh_token'];
      if (rt) {
        const rec = await this.refreshRepo.getByTokenHash(hash(rt), undefined);
        if (rec) {
          await this.refreshRepo.revokeFamily(rec.USER_ID, rec.DEVICE_ID);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.clearAuthCookies(res);
    }
    const result = await this.service.logout(req.user?.journal);
    res.status(200).json(JSON.parse(result as string));
  }

  @Post('refresh')
  @ApiHeader({ name: 'x-csrf', required: true, description: 'значение cookie csrf' })
  @ApiOperation({ summary: 'Ротация refresh-токена (cookie refresh_token) и выдача нового access-токена' })
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    // csrfCheck
    const header = req.get('x-csrf');
    const csrfCookie = req.cookies?.csrf;
    if (!header || !csrfCookie || header !== csrfCookie) {
      res.sendStatus(403);
      return;
    }

    try {
      const agent = req.get('user-agent');
      const rt = req.cookies?.['refresh_token'];
      if (!rt) {
        res.sendStatus(401);
        return;
      }
      const clientDeviceId = req.body?.deviceId || null;

      const rec = await this.refreshRepo.getByTokenHash(hash(rt), agent);
      const now = new Date();
      if (!rec) {
        res.sendStatus(401);
        return;
      }

      if (rec.REVOKED === 1 || rec.USED_AT != null || rec.EXPIRES_AT < now) {
        await this.refreshRepo.revokeFamily(rec.USER_ID, rec.DEVICE_ID);
        this.clearAuthCookies(res);
        res.status(401).json({ code: '0', message: 'Refresh reuse detected' });
        return;
      }

      if (rec.DEVICE_ID && clientDeviceId && rec.DEVICE_ID !== clientDeviceId) {
        await this.refreshRepo.revokeFamily(rec.USER_ID, rec.DEVICE_ID);
        this.clearAuthCookies(res);
        res.status(401).json({ code: '0', message: 'Device mismatch' });
        return;
      }

      await this.refreshRepo.markUsedAndRotate(rec.JTI);
      const newRefresh = `${randomUUID()}.${randomUUID()}`;
      const newHash = hash(newRefresh);
      const newJti = randomUUID();
      const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
      await this.refreshRepo.saveRefreshToken(
        rec.JOURNAL,
        rec.USER_ID,
        rec.DEVICE_ID,
        newJti,
        rec.JTI,
        newHash,
        expiresAt,
        req.ip,
        agent,
      );
      const access = await this.service.signAccess({ sub: String(rec.USER_ID), journal: rec.JOURNAL });

      this.setAuthCookies(res, newRefresh);
      res.status(200).json({ accessToken: access, expiresIn: ACCESS_TTL_SEC });
    } catch {
      res.sendStatus(401);
    }
  }
}
