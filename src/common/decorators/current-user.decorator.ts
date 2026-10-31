import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Полезная нагрузка access-токена (то, что verify.js клал в `req.user`). */
export interface JwtUser {
  sub: string;
  journal: string | number;
  iat?: number;
  exp?: number;
}

export type AuthRequest = Request & { user?: JwtUser };

/** `@CurrentUser()` → req.user (устанавливается JwtAuthGuard). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthRequest>().user;
});
