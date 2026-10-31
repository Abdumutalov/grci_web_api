import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../common/response/set-response';
import { Row } from '../../database/oracle-types';
import { ChartRepository } from './chart.repository';

type Rows = ApiResponse<Row[]>;

/** /chart — данные для графиков дашборда. Порт controllers/chart. */
@ApiTags('chart')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('chart')
export class ChartController {
  constructor(private readonly repo: ChartRepository) {}

  // ---------------------------------------------------------------- online

  @Get('online/requestLine')
  async onlineRequestLine(): Promise<Rows> {
    return setResponse(await this.repo.onlineRequestLine());
  }

  @Get('online/requestPie')
  async onlineRequestPie(): Promise<Rows> {
    return setResponse(await this.repo.onlineRequestPie());
  }

  @Get('online/requestGroupedState')
  async onlineRequestGroupedState(): Promise<Rows> {
    return setResponse(await this.repo.onlineRequestGroupedState());
  }

  @Get('online/requestGroupedBank')
  async onlineRequestGroupedBank(): Promise<Rows> {
    return setResponse(await this.repo.onlineRequestGroupedBank());
  }

  // --------------------------------------------------------------- offline

  @Get('offline/requestLine')
  async offlineRequestLine(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestLine());
  }

  @Get('offline/requestPie')
  async offlineRequestPie(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestPie());
  }

  @Get('offline/requestColumn')
  async offlineRequestColumn(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestColumn());
  }

  @Get('offline/requestBalance')
  @ApiQuery({ name: 'report', required: false, description: "'008' | '009'" })
  async offlineRequestBalance(@Query('report') report?: string): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestBalance(report));
  }

  @Get('offline/requestBalanceGraph')
  async offlineBalance(): Promise<Rows> {
    return setResponse(await this.repo.offlineBalance());
  }

  @Get('offline/requestBalanceBank')
  async offlineRequestBalanceBank(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestBalanceBank());
  }

  @Get('offline/requestGroupedState')
  async offlineRequestGroupedState(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestGroupedState());
  }

  @Get('offline/requestGroupedBank')
  async offlineRequestGroupedBank(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestGroupedBank());
  }

  @Get('offline/requestAverageHandle')
  async offlineRequestAverageHandle(): Promise<Rows> {
    return setResponse(await this.repo.offlineRequestAverageHandle());
  }
}
