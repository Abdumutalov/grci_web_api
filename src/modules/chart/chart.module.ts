import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartRepository } from './chart.repository';

@Module({
  controllers: [ChartController],
  providers: [ChartRepository],
})
export class ChartModule {}
