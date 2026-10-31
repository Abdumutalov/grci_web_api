import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Row } from '../../database/oracle-types';
import { InteractionRepository } from './interaction.repository';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ответы модуля — литерал `{ code: "1", result }` (не setResponse), как в оригинале. */
interface InteractionResponse<T> {
  code: '1';
  result: T;
}

/** /interaction — проекты взаимодействия. Порт controllers/interaction. */
@ApiTags('interaction')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('interaction')
export class InteractionController {
  constructor(private readonly repo: InteractionRepository) {}

  @Post('getProjectList')
  @HttpCode(200)
  async getProjectList(@Body() body: any): Promise<InteractionResponse<Row[] | null>> {
    const result = await this.repo.getProjectList(body);
    return { code: '1', result };
  }

  /**
   * В оригинале при ошибке БД / NULL-результате JSON.parse падал на не-строке → 500.
   * Здесь null → Error → 500 через глобальный фильтр.
   */
  @Post('getProjectDetails')
  @HttpCode(200)
  async getProjectDetails(@Body() body: any): Promise<InteractionResponse<any>> {
    const raw = await this.repo.getProjectDetails(body);
    if (raw === null) throw new Error('getProjectDetails: CLOB result is not a string');
    const result = JSON.parse(raw);
    return { code: '1', result };
  }

  /** null из БД → TypeError на .map → 500, как в оригинале. */
  @Get('getDestinationLists')
  async getDestinationLists(): Promise<InteractionResponse<{ value: any; label: any }[]>> {
    const rows = (await this.repo.getDestinationLists()) as Row[];
    const result = rows.map((item) => ({ value: item.CODE, label: item.NAME }));
    return { code: '1', result };
  }

  @Get('getProjectStateLists')
  async getProjectStateLists(): Promise<InteractionResponse<Row[] | null>> {
    const result = await this.repo.getProjectStateLists();
    return { code: '1', result };
  }

  @Get('getSyncStateLists')
  async getSyncStateLists(): Promise<InteractionResponse<Row[] | null>> {
    const result = await this.repo.getSyncStateLists();
    return { code: '1', result };
  }
}
