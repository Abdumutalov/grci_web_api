import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../../common/response/set-response';
import { Row } from '../../../database/oracle-types';
import { RequestErrorRepository } from './request-error.repository';

type Rows = ApiResponse<Row[]>;

/** Коды ошибок через ' , ' для PIVOT. null из БД → TypeError → 500 (как в оригинале). */
const getError = (array_: Row[] | null): string =>
  (array_ as Row[]).map((element) => element.CODE as unknown).join(' , ');

/** /offline/observable/reqError — ошибки offline-отчётов. Порт controllers/offline/observable/requestError. */
@ApiTags('offline')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('offline')
export class RequestErrorController {
  constructor(private readonly repo: RequestErrorRepository) {}

  @Get('observable/reqError/getErrorGroup')
  async getErrorGroup(
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('info_type') info_type?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getErrorByDate(begin, end, info_type));
  }

  @Get('observable/reqError/getErrorByBank')
  async getErrorByBank(
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('info_type') info_type?: string,
  ): Promise<Rows> {
    const iError = await this.repo.getErrorByDate(begin, end, info_type);
    const errors = getError(iError);
    return setResponse(await this.repo.getSearchByBank(begin, end, errors, info_type));
  }

  @Get('observable/reqError/getErrorByBranch')
  async getErrorByBranch(
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('bank') bank?: string,
    @Query('info_type') info_type?: string,
  ): Promise<Rows> {
    const iError = await this.repo.getErrorByDate(begin, end, info_type);
    const errors = getError(iError);
    return setResponse(await this.repo.getSearchByBranch(begin, end, bank, errors, info_type));
  }
}
