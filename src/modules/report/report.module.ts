import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportRepository } from './report.repository';

@Module({
  controllers: [ReportController],
  providers: [ReportRepository],
})
export class ReportModule {}
