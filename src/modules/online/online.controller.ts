import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse, setResponse } from '../../common/response/set-response';
import { Row } from '../../database/oracle-types';
import { OnlineObservableRepository } from './online-observable.repository';
import { OnlineRepository } from './online.repository';

type Wrapped = ApiResponse<unknown>;

/**
 * /online — онлайн-запросы: статистика, доступы, факты, поиск, мониторинг.
 * Порт controllers/online. Все маршруты под verify. Большинство обработчиков
 * отдают «сырую» модель (без setResponse) — как в оригинале; body читается
 * напрямую (без body → TypeError → 500, как в Express).
 *
 * «Сырые» ответы отправляются через `@Res()` + `res.json(model)`: стандартный
 * ответ Nest для null отдаёт пустое тело, а для чисел/строк — `send(String(x))`
 * с text/html, что отличалось бы от оригинального `res.status(200).json(model)`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@ApiTags('online')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('online')
export class OnlineController {
  constructor(
    private readonly repo: OnlineRepository,
    private readonly observable: OnlineObservableRepository,
  ) {}

  /** Порт `res.status(200).json(model)` — байт-в-байт, включая null и примитивы. */
  private send(res: Response, model: unknown): void {
    res.status(200).json(model);
  }

  // ------------------------------------------------------------ статистика

  @Post('getStatTableColumns')
  @HttpCode(200)
  async getStatTableColumns(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getStatTableColumns(body.level));
  }

  @Post('getRequest')
  @HttpCode(200)
  async request(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getRequest());
  }

  @Post('getRequestByDate')
  @HttpCode(200)
  async requestByDate(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRequestByDate(body.to, body.from));
  }

  @Post('getRequestLevel2')
  @HttpCode(200)
  async requestLevel2(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRequestLevel2(body.org, body.qtype, body.state, body.begin, body.end));
  }

  @Post('getRequestLevel3')
  @HttpCode(200)
  async requestLevel3(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRequestLevel3(body.org, body.qtype, body.date, body.state));
  }

  @Post('getRequestLevel4')
  @HttpCode(200)
  async requestLevel4(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRequestLevel4(body.query_id));
  }

  @Post('getRequestLevel4Errors')
  @HttpCode(200)
  async requestLevel4Errors(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRequestLevel4Errors(body.query_id));
  }

  // ------------------------------------------------- мониторинг: ошибки

  @Get('observable/reqError/getErrorGroup')
  @ApiQuery({ name: 'date', required: false, description: 'dd.mm.yyyy' })
  async getErrorGroup(@Query('date') date?: string): Promise<Wrapped> {
    return setResponse(await this.observable.getErrorByDate(date));
  }

  /** errors = коды ошибок через запятую; null из БД → TypeError на .map (500), как в оригинале. */
  @Get('observable/reqError/getErrorByBank')
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'orgType', required: false })
  async getErrorByBank(@Query('date') date?: string, @Query('orgType') orgType?: string): Promise<Wrapped> {
    const iError = (await this.observable.getErrorByDate(date, orgType)) as Row[];
    const errors = iError.map((t) => t.CODE).join(',');
    return setResponse(await this.observable.getSearchByBank(date, errors, orgType));
  }

  @Get('observable/reqError/getErrorDetail')
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'error', required: false })
  async getErrorDetail(
    @Query('date') date?: string,
    @Query('bank') bank?: string,
    @Query('error') error?: string,
  ): Promise<Wrapped> {
    return setResponse(await this.observable.getSearchErrorDetail(date, bank, error));
  }

  // ------------------------------------------------- мониторинг: журнал

  @Get('observable/handle/getLog')
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'orgType', required: false })
  @ApiQuery({ name: 'queryID', required: false })
  @ApiQuery({ name: 'states', required: false })
  @ApiQuery({ name: 'banks', required: false })
  async getLog(
    @Query('date') date?: string,
    @Query('orgType') orgType?: string,
    @Query('queryID') queryID?: string,
    @Query('states') states?: string,
    @Query('banks') banks?: string,
  ): Promise<Wrapped> {
    return setResponse(await this.observable.getLog(date, orgType, queryID, states, banks));
  }

  @Get('observable/handle/getLogError')
  @ApiQuery({ name: 'queryID', required: false })
  async getLogError(@Query('queryID') queryID?: string): Promise<Wrapped> {
    return setResponse(await this.observable.getLogError(queryID));
  }

  @Get('observable/handle/getLogQuery')
  @ApiQuery({ name: 'queryID', required: false })
  async getLogQuery(@Query('queryID') queryID?: string): Promise<Wrapped> {
    return setResponse(await this.observable.getLogQuery(queryID));
  }

  // ------------------------------------------------- удаление / доступы

  @Get('delByBank')
  @ApiQuery({ name: 'contract', required: false })
  async delByBank(@CurrentUser() user: JwtUser, @Query('contract') contract?: string): Promise<Wrapped> {
    return setResponse(await this.repo.delByBank(user.journal, contract));
  }

  @Get('getQueryTypes')
  async getQueryTypes(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getQueryTypes());
  }

  @Get('getMethodsAllowed')
  async getMethodsAllowed(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getMethodsAllowed());
  }

  @Post('setQueryPermission')
  @HttpCode(200)
  async setQueryPermission(@Res() res: Response, @CurrentUser() user: JwtUser, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.setQueryPermission(user.journal, body.org_code, body.query_id, body.allow));
  }

  @Get('getBankList')
  async getBankList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getBankList());
  }

  @Post('setBankAccess')
  @HttpCode(200)
  async setBankAccess(@Res() res: Response, @CurrentUser() user: JwtUser, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.setBankAccess(user.journal, body.org_code, body.login, body.pass, body.allow));
  }

  @Get('getControlList')
  async getControlList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getControlList());
  }

  @Get('getControlsAllowed')
  async getControlsAllowed(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getControlsAllowed());
  }

  @Post('setControlAllow')
  @HttpCode(200)
  async setControlAllow(@Res() res: Response, @CurrentUser() user: JwtUser, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.setControlAllow(user.journal, body.org_code, body.ctrl_id, body.allow));
  }

  // ----------------------------------------------------------------- факты

  @Post('getFactsLevel1')
  @HttpCode(200)
  async factsLevel1(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getFactsLevel1());
  }

  @Post('getFactsLevel2')
  @HttpCode(200)
  async factsLevel2(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getFactsLevel2(body.cat, body.code, body.type));
  }

  @Post('getFactsLevel3')
  @HttpCode(200)
  async factsLevel3(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getFactsLevel3(body.cat, body.code, body.type, body.branch));
  }

  @Post('getFactsLevel4')
  @HttpCode(200)
  async factsLevel4(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(
      res,
      await this.repo.getFactsLevel4(
        body.cat,
        body.code,
        body.type,
        body.branch,
        body.item,
        body.prov_item,
        body.prov_id,
        body.norder,
      ),
    );
  }

  // ----------------------------------------------------------- справочники

  @Post('getConfigList')
  @HttpCode(200)
  async configList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getConfigList());
  }

  @Post('getRefContent')
  @HttpCode(200)
  async refContent(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getRefContent(body.ref_alias));
  }

  // ----------------------------------------------------------------- поиск

  @Post('getSearchInfoTypesList')
  @HttpCode(200)
  async searchInfoTypesList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getSearchInfoTypesList());
  }

  @Post('getSearchRelationsList')
  @HttpCode(200)
  async searchRelationsList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getSearchRelationsList());
  }

  @Post('getSearchRelationByTypeList')
  @HttpCode(200)
  async searchRelationByTypeList(@Res() res: Response): Promise<void> {
    this.send(res, await this.repo.getSearchRelationByTypeList());
  }

  @Post('getSearchParams')
  @HttpCode(200)
  async searchParams(@Res() res: Response, @CurrentUser() user: JwtUser, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getSearchParams(user.journal, body.info_type));
  }

  @Post('getResultFields')
  @HttpCode(200)
  async resultFields(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getResultFields(body.info_type));
  }

  @Post('search')
  @HttpCode(200)
  async searchResult(@Res() res: Response, @CurrentUser() user: JwtUser, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getSearchResult(user.journal, body.info_type, body.search));
  }

  @Post('getSearchDetail')
  @HttpCode(200)
  async searchDetail(@Res() res: Response, @Body() body: any): Promise<void> {
    this.send(res, await this.repo.getSearchDetail(body.info_type, body.primary, body.secondary, body.norder));
  }

  // ------------------------------------------------- удалённые / восстановление

  @Get('setting/getContractDel')
  @ApiQuery({ name: 'date_begin', required: false })
  @ApiQuery({ name: 'date_end', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'branch', required: false })
  async getContractDel(
    @Query('date_begin') dateBegin?: string,
    @Query('date_end') dateEnd?: string,
    @Query('bank') bank?: string,
    @Query('branch') branch?: string,
  ): Promise<Wrapped> {
    return setResponse(await this.observable.getContractDel(dateBegin, dateEnd, bank, branch));
  }

  @Get('setting/getClaimDel')
  @ApiQuery({ name: 'date_begin', required: false })
  @ApiQuery({ name: 'date_end', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'branch', required: false })
  async getClaimDel(
    @Query('date_begin') dateBegin?: string,
    @Query('date_end') dateEnd?: string,
    @Query('bank') bank?: string,
    @Query('branch') branch?: string,
  ): Promise<Wrapped> {
    return setResponse(await this.observable.getClaimDel(dateBegin, dateEnd, bank, branch));
  }

  @Get('getRequestsForRestore')
  @ApiQuery({ name: 'date_begin', required: false })
  @ApiQuery({ name: 'date_end', required: false })
  @ApiQuery({ name: 'bank', required: false })
  @ApiQuery({ name: 'branch', required: false })
  async getRequestsForRestore(
    @Query('date_begin') dateBegin?: string,
    @Query('date_end') dateEnd?: string,
    @Query('bank') bank?: string,
    @Query('branch') branch?: string,
  ): Promise<Wrapped> {
    return setResponse(await this.observable.getRequestsForRestore(dateBegin, dateEnd, bank, branch));
  }

  @Post('restoreRequestByBank')
  @HttpCode(200)
  async restoreRequestByBank(@CurrentUser() user: JwtUser, @Body() body: any): Promise<Wrapped> {
    return setResponse(await this.repo.restoreRequestByBank(user.journal, body.contract));
  }
}
