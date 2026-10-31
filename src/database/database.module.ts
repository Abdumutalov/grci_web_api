import { Global, Module } from '@nestjs/common';
import { OracleService } from './oracle.service';

/** Глобальный модуль БД: OracleService доступен всем модулям приложения. */
@Global()
@Module({
  providers: [OracleService],
  exports: [OracleService],
})
export class DatabaseModule {}
