import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../../common/response/set-response';
import { Row } from '../../../database/oracle-types';
import { BalanceRepository } from './balance.repository';

type Rows = ApiResponse<Row[]>;

/** /offline/balance — сверка балансов. Порт controllers/offline/observable/balance. */
@ApiTags('offline')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('offline')
export class BalanceController {
  constructor(private readonly repo: BalanceRepository) {}

  @Get('balance/getBalance')
  async getBalance(@Query('report_date') report_date?: string, @Query('type') type?: string): Promise<Rows> {
    return setResponse(await this.repo.getBalance(report_date, type));
  }

  @Get('balance/getBalanceMKO')
  async getBalanceMKO(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('type') type?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getBalanceMKO(month, year, type));
  }

  @Get('balance/getBalanceDetailMKO')
  async getBalanceDetailMKO(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('report') report?: string,
    @Query('branch') branch?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getBalanceDetailMKO(month, year, report, branch));
  }

  @Get('balance/getBalanceCompare')
  async getBalanceCompare(@Query('report_date') report_date?: string): Promise<Rows> {
    return setResponse(await this.repo.getBalanceCompare(report_date));
  }

  @Get('balance/getBalanceByBranch')
  async getBalanceByBranch(@Query('report_date') report_date?: string, @Query('bank') bank?: string): Promise<Rows> {
    return setResponse(await this.repo.getBalanceByBranch(report_date, bank));
  }

  @Get('balance/getBalanceByOffice')
  async getBalanceByOffice(@Query('report_date') report_date?: string, @Query('bank') bank?: string): Promise<Rows> {
    return setResponse(await this.repo.getBalanceByOffice(report_date, bank));
  }

  @Get('balance/getBalanceDetail')
  async getBalanceDetail(
    @Query('report_date') report_date?: string,
    @Query('report') report?: string,
    @Query('bank') bank?: string,
    @Query('branch') branch?: string,
    @Query('type') type?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getBalanceDetail(report_date, report, bank, branch, type));
  }
}
