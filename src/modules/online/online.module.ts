import { Module } from '@nestjs/common';
import { OnlineObservableRepository } from './online-observable.repository';
import { OnlineController } from './online.controller';
import { OnlineRepository } from './online.repository';

@Module({
  controllers: [OnlineController],
  providers: [OnlineRepository, OnlineObservableRepository],
})
export class OnlineModule {}
