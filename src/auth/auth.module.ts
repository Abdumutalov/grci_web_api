import { Global, Module } from '@nestjs/common';
import { CryptoSignService } from './crypto-sign.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

/**
 * Авторизация (/user) и JwtAuthGuard. Модуль глобальный, чтобы любой
 * контроллер мог использовать `@UseGuards(JwtAuthGuard)` без импорта.
 */
@Global()
@Module({
  controllers: [UsersController],
  providers: [UsersRepository, RefreshTokenRepository, UsersService, CryptoSignService, JwtAuthGuard],
  exports: [UsersRepository, JwtAuthGuard],
})
export class AuthModule {}
