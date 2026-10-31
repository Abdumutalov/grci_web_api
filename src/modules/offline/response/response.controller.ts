import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../../common/response/set-response';
import { Row } from '../../../database/oracle-types';
import { spliceFlat } from '../splice-flat';
import { ResponseRepository } from './response.repository';

type Rows = ApiResponse<Row[]>;

/** /offline/observable — ответы на offline-запросы. Порт controllers/offline/observable/response. */
@ApiTags('offline')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('offline')
export class ResponseController {
  constructor(private readonly repo: ResponseRepository) {}

  /** Сводка по типам (01 — банки, 02 — МКО, 03 — ЛМО). Имена to/from перепутаны — как в оригинале. */
  @Get('observable/response')
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'from', required: false })
  async request(
    @Query('to') to?: string,
    @Query('from') from?: string,
  ): Promise<ApiResponse<{ bank: Row[] | null; mko: Row[] | null; lmo: Row[] | null }>> {
    const [bank, mko, lmo] = await Promise.all([
      this.repo.getRequest(to, from, '01'),
      this.repo.getRequest(to, from, '02'),
      this.repo.getRequest(to, from, '03'),
    ]);
    return setResponse({ bank, mko, lmo });
  }

  /** to → begin, from → end (как в оригинале). */
  @Get('observable/responseByBank')
  async requestByBank(
    @Query('info_type') info_type?: string,
    @Query('bank') bank?: string,
    @Query('report') report?: string,
    @Query('state') state?: string,
    @Query('to') to?: string,
    @Query('from') from?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getRequestByBank(info_type, bank, report, state, to, from));
  }

  @Get('observable/protocol')
  async getProtocol(@Query('journalId') journalId?: string): Promise<Rows> {
    return setResponse(await this.repo.getProtocol(journalId));
  }

  /** null из БД → TypeError в spliceFlat → 500 (как в оригинале). */
  @Get('observable/badProtocolByLine')
  async getBadProtocolByLine(@Query('mailId') mailId?: string): Promise<Rows> {
    const result = await this.repo.getBadProtocol(mailId);
    return setResponse(spliceFlat(result, 1));
  }

  /** null из БД → TypeError в spliceFlat → 500 (как в оригинале). */
  @Get('observable/inFlatFile')
  async getInFlatFile(@Query('mailId') mailId?: string): Promise<Rows> {
    const model = await this.repo.getInFlatFile(mailId);
    return setResponse(spliceFlat(model, 0));
  }
}
