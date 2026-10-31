import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse, setResponse } from '../../common/response/set-response';
import { Row } from '../../database/oracle-types';
import { REPORT_LIST } from './report-refs';
import { ReportRepository } from './report.repository';

type Rows = ApiResponse<Row[]>;

/** Тип информации «банк» для отчётов по балансу. */
const bankInfoType = '01';

/** /report — отчёты (баланс, операции, журнал запусков). Порт controllers/report. */
@ApiTags('report')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('report')
export class ReportController {
  constructor(private readonly repo: ReportRepository) {}

  /** Баланс + регистрация запуска отчёта (результат RunReport игнорируется). */
  @Get('getBalance')
  @ApiQuery({ name: 'report_date', required: false })
  @ApiQuery({ name: 'report', required: false, description: "'008' | '009'" })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'state', required: false })
  async getBalance(
    @CurrentUser() user: JwtUser,
    @Query('report_date') reportDate?: string,
    @Query('report') report?: string,
    @Query('bank') bank?: string,
    @Query('state') state?: string,
  ): Promise<Rows> {
    const model = await this.repo.balance(reportDate, report, bank, state);
    await this.repo.runReport(user.journal, REPORT_LIST.diffBalance, reportDate, reportDate, bankInfoType, bank);
    return setResponse(model);
  }

  /** Операции + регистрация запуска отчёта. */
  @Get('getOperation')
  @ApiQuery({ name: 'begin', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'infoType', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'operation', required: false })
  async getOperation(
    @CurrentUser() user: JwtUser,
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('infoType') infoType?: string,
    @Query('bank') bank?: string,
    @Query('operation') operation?: string,
  ): Promise<Rows> {
    const model = await this.repo.operationReport(begin, end, infoType, bank, operation);
    await this.repo.runReport(user.journal, REPORT_LIST.operation, begin, end, infoType, bank);
    return setResponse(model);
  }

  @Get('getReports')
  @ApiQuery({ name: 'begin', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getReports(@Query('begin') begin?: string, @Query('end') end?: string): Promise<Rows> {
    return setResponse(await this.repo.getReports(begin, end));
  }

  @Get('getRunReport')
  @ApiQuery({ name: 'form', required: false })
  @ApiQuery({ name: 'beginDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'infoType', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'reportType', required: false })
  async getRunReport(
    @CurrentUser() user: JwtUser,
    @Query('form') form?: string,
    @Query('beginDate') beginDate?: string,
    @Query('endDate') endDate?: string,
    @Query('infoType') infoType?: string,
    @Query('bank') bank?: string,
    @Query('reportType') reportType?: string,
  ): Promise<ApiResponse> {
    return setResponse(await this.repo.runReport(user.journal, form, beginDate, endDate, infoType, bank, reportType));
  }

  @Get('getCancelReport')
  @ApiQuery({ name: 'reportId', required: false })
  async getCancelReport(@CurrentUser() user: JwtUser, @Query('reportId') reportId?: string): Promise<ApiResponse> {
    return setResponse(await this.repo.getCancelReport(user.journal, reportId));
  }

  /** Баланс по валютам + регистрация запуска отчёта. */
  @Get('getBalanceCurrency')
  @ApiQuery({ name: 'report_date', required: false })
  @ApiQuery({ name: 'currency', required: false })
  @ApiQuery({ name: 'bank', required: false })
  async getReportBalanceByCurrency(
    @CurrentUser() user: JwtUser,
    @Query('report_date') reportDate?: string,
    @Query('currency') currency?: string,
    @Query('bank') bank?: string,
  ): Promise<Rows> {
    const model = await this.repo.getReportBalanceByCurrency(reportDate, currency);
    await this.repo.runReport(user.journal, REPORT_LIST.currencyBalance, reportDate, reportDate, bankInfoType, bank);
    return setResponse(model);
  }
}
