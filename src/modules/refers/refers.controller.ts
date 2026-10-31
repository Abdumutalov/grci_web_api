import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../common/response/set-response';
import { deep } from '../../common/utils/deep-keys.util';
import { Row } from '../../database/oracle-types';
import { RefersRepository } from './refers.repository';

type Rows = ApiResponse<Row[]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = ApiResponse<any>;

/**
 * /refer — справочники. Порт controllers/refers.
 * GET /refer/getBranch — без токена (в оригинале зарегистрирован до verify),
 * остальные маршруты защищены JwtAuthGuard на уровне метода.
 */
@ApiTags('refer')
@Controller('refer')
export class RefersController {
  constructor(private readonly repo: RefersRepository) {}

  @Get('getBranch')
  @ApiQuery({ name: 'value', required: false, description: 'Код банка' })
  async getBranch(@Query('value') value?: string): Promise<Any> {
    const model = await this.repo.getBranch(value);
    return setResponse(deep(model, 3));
  }

  @Get('getBank')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getBank(): Promise<Rows> {
    return setResponse(await this.repo.getBank());
  }

  @Get('getBankFilter')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getBankFilter(): Promise<Any> {
    return setResponse(deep(await this.repo.getBankFilter(), 3));
  }

  @Get('getCurrency')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getCurrency(): Promise<Rows> {
    return setResponse(await this.repo.getCurrency());
  }

  @Get('getReportBalanceCurrency')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getReportBalanceCurrency(): Promise<Any> {
    return setResponse(deep(await this.repo.getReportBalanceCurrency(), 3));
  }

  @Get('getLogState')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getLogState(): Promise<Any> {
    return setResponse(deep(await this.repo.getLogState(), 3));
  }

  @Get('getLoanCoa')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getLoanCoa(): Promise<Rows> {
    return setResponse(await this.repo.getLoanCoa());
  }

  @Get('getLayout')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getLayout(): Promise<Rows> {
    return setResponse(await this.repo.getLayout());
  }

  /** В оригинале маршрут /getWorkDate обслуживает обработчик getOperDate. */
  @Get('getWorkDate')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getOperDate(): Promise<Any> {
    const model = await this.repo.getOperDate();
    if (model) {
      return setResponse(model[0]);
    }
    return setResponse({});
  }

  @Get('get')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getRefers(): Promise<Rows> {
    return setResponse(await this.repo.getRefer());
  }

  @Get('getNko')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getNKO(): Promise<Rows> {
    return setResponse(await this.repo.getNKO());
  }

  @Get('getRefByCode')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'value', required: false, description: 'Код справочника' })
  async getRefByCode(@Query('value') value?: string): Promise<Rows> {
    return setResponse(await this.repo.getRefByCode(value));
  }

  @Get('getRefByTable')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'value', required: false, description: 'Имя таблицы (SOURCE)' })
  async getRefByTable(@Query('value') value?: string): Promise<Rows> {
    return setResponse(await this.repo.getRefByTable(value));
  }

  /** req.query.value в оригинале передавался, но repo его игнорировал. */
  @Get('getReport')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getReport(): Promise<Any> {
    return setResponse(deep(await this.repo.getReport(), 3));
  }

  @Get('getCreditOperationReport')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getCreditOperationReport(): Promise<Any> {
    return setResponse(deep(await this.repo.getCreditOperationReport(), 3));
  }

  @Get('getBalanceState')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getBalanceState(): Promise<Any> {
    return setResponse(deep(await this.repo.getBalanceState(), 3));
  }

  @Get('getReportBasePeriod')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getReportBasePeriod(): Promise<Rows> {
    return setResponse(await this.repo.getReportBasePeriod());
  }

  @Get('getReportForm')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getReportForm(): Promise<Rows> {
    return setResponse(await this.repo.getReportForm());
  }

  @Get('getReportTypeForm')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getReportTypeForm(): Promise<Any> {
    return setResponse(deep(await this.repo.getReportTypeForm(), 3));
  }

  @Get('getCreditOrganization')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getCreditOrganization(): Promise<Any> {
    return setResponse(deep(await this.repo.getCreditOrganization(), 3));
  }

  /** В оригинале всегда 500 (ReferenceError в repo) — исправлено, см. репозиторий. */
  @Get('getCreditOperation')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getCreditOperation(): Promise<Any> {
    return setResponse(deep(await this.repo.getCreditOperation(), 3));
  }

  @Get('getCreditOrganizationTypes')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getCreditOrganizationTypes(): Promise<Any> {
    return setResponse(deep(await this.repo.getCreditOrganizationTypes(), 3));
  }

  @Get('getOrgTypes')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  async getOrgTypes(): Promise<Rows> {
    return setResponse(await this.repo.getOrgTypes());
  }

  @Get('getOrganizations')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'type', required: false, description: 'Тип организации' })
  async getOrganizations(@Query('type') type?: string): Promise<Rows> {
    return setResponse(await this.repo.getOrganizations(type));
  }
}
