import { Module } from '@nestjs/common';
import { BalanceController } from './balance/balance.controller';
import { BalanceRepository } from './balance/balance.repository';
import { HandlingController } from './handling/handling.controller';
import { HandlingRepository } from './handling/handling.repository';
import { RequestErrorController } from './request-error/request-error.controller';
import { RequestErrorRepository } from './request-error/request-error.repository';
import { ResponseController } from './response/response.controller';
import { ResponseRepository } from './response/response.repository';
import { SettingController } from './setting/setting.controller';
import { SettingRepository } from './setting/setting.repository';

/** /offline — мониторинг и настройки offline-отчётности. Порт controllers/offline. */
@Module({
  controllers: [ResponseController, HandlingController, RequestErrorController, BalanceController, SettingController],
  providers: [ResponseRepository, HandlingRepository, RequestErrorRepository, BalanceRepository, SettingRepository],
})
export class OfflineModule {}
