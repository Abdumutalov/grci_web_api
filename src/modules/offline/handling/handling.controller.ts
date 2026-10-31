import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ApiResponse, setResponse } from '../../../common/response/set-response';
import { Row } from '../../../database/oracle-types';
import { spliceFlat } from '../splice-flat';
import { HandlingRepository } from './handling.repository';

type Rows = ApiResponse<Row[]>;

/** /offline/observable/handling — обработка файлов. Порт controllers/offline/observable/handling. */
@ApiTags('offline')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('offline')
export class HandlingController {
  constructor(private readonly repo: HandlingRepository) {}

  @Get('observable/handling/getSearch')
  async search(
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('inFile') inFile?: string,
    @Query('ctp') ctp?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.getSearch(begin, end, inFile, ctp));
  }

  @Get('observable/handling/bFileProtocol')
  async bFileProtocol(@Query('journalId') journalId?: string): Promise<Rows> {
    return setResponse(await this.repo.bFileProtocol(journalId));
  }

  @Get('observable/handling/inPackageFile')
  async inPackageFile(@Query('journalId') journalId?: string): Promise<Rows> {
    return setResponse(await this.repo.inPackageFile(journalId));
  }

  /** null из БД → TypeError в spliceFlat → 500 (как в оригинале). */
  @Get('observable/handling/bFlatFile')
  async bFlatProtocol(@Query('journalId') journalId?: string): Promise<Rows> {
    const model = await this.repo.bFlatProtocol(journalId);
    return setResponse(spliceFlat(model, 1));
  }
}
