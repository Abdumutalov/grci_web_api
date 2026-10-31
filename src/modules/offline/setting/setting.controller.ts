import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../../common/decorators/current-user.decorator';
import { ApiResponse, setResponse } from '../../../common/response/set-response';
import { Row } from '../../../database/oracle-types';
import { SettingRepository } from './setting.repository';

type Rows = ApiResponse<Row[]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = ApiResponse<any>;

/**
 * /offline/setting — настройки контроля offline-отчётов.
 * Порт controllers/offline/setting/contract (handleRequest → next(error) = 500 через глобальный фильтр).
 */
@ApiTags('offline')
@ApiSecurity('token')
@UseGuards(JwtAuthGuard)
@Controller('offline')
export class SettingController {
  constructor(private readonly repo: SettingRepository) {}

  // -------------------------------------------------------------- contract

  @Get('setting/updContractPayment')
  async updContractPayment(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractPayment(bank, value));
  }

  @Get('setting/updContractProvision')
  async updContractProvision(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractProvision(bank, value));
  }

  @Get('setting/updContractProlongation')
  async updContractProlongation(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractProlongation(bank, value));
  }

  @Get('setting/updContractClosedAction')
  async updContractClosedAction(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractClosedAction(bank, value));
  }

  @Get('setting/updContractOfficeClosedAction')
  async updContractOfficeClosedAction(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractOfficeClosedAction(bank, value));
  }

  @Get('setting/selBalanceMkoCondition')
  async selBalanceMkoCondition(): Promise<Rows> {
    return setResponse(await this.repo.selBalanceMkoCondition());
  }

  @Get('setting/updBalanceMkoCondition')
  async updBalanceMkoCondition(
    @Query('type') type?: string,
    @Query('mko') mko?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updBalanceMkoCondition(type, mko, value));
  }

  @Get('setting/updBalanceCheck')
  async updBalanceCheck(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updBalanceCheck(bank, value));
  }

  @Get('setting/reportCoaCondition')
  async selReportCoaCondition(): Promise<Rows> {
    return setResponse(await this.repo.selReportCoaCondition());
  }

  @Get('setting/updReportBalanceCoa')
  async updReportBalanceCoa(
    @Query('bank') bank?: string,
    @Query('coa') coa?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updReportBalanceCoa(bank, coa, value));
  }

  @Get('setting/updCorAccount')
  async updCorAccount(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updCorAccount(bank, value));
  }

  @Get('setting/selCorAccount')
  async selCorAccount(): Promise<Rows> {
    return setResponse(await this.repo.selCorAccount());
  }

  /** model === null → TypeError на model[0] → 500 (как в оригинале). */
  @Get('setting/selCorAccountDate')
  async selCorAccountDate(): Promise<Result> {
    const model = await this.repo.selCorAccountDate();
    const started: unknown = (model as Row[])[0]?.STARTED_CH;
    return setResponse(started);
  }

  @Get('setting/updCorAccountDate')
  async updCorAccountDate(@Query('date') date?: string): Promise<Result> {
    return setResponse(await this.repo.updCorAccountDate(date));
  }

  @Get('setting/updContractByBranch')
  async updContractByBranch(@Query('branch') branch?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updContractByBranch(branch, value));
  }

  @Get('setting/selContractByBank')
  async selContractByBank(): Promise<Rows> {
    return setResponse(await this.repo.selContractByBank());
  }

  @Get('setting/selContractByBranch')
  async selContractByBranch(@Query('bank') bank?: string): Promise<Rows> {
    return setResponse(await this.repo.selContractByBranch(bank));
  }

  // ------------------------------------------------------ report condition

  /**
   * Флаги → 1/0. Для infoType === '01' — последовательный вызов по массиву branch,
   * иначе один вызов. Ответ всегда setResponse(1) (результаты функции не проверяются).
   * Отсутствие body / branch не массив → TypeError → 500 (как в оригинале).
   */
  @Post('setting/reportCondition')
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async reportCondition(@CurrentUser() user: JwtUser, @Body() body: any): Promise<ApiResponse<number>> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const { report, infoType, bank, reason, begin, end, branch } = body;
    const reload = body.reload ? 1 : 0;
    const balance = body.balance ? 1 : 0;
    const contract = body.contract ? 1 : 0;
    const operation = body.operation ? 1 : 0;
    const loan = body.loan ? 1 : 0;
    const grci_coas = body.grci_coas ? 1 : 0;
    const active_passive = body.active_passive ? 1 : 0;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    if (infoType === '01') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      for (const element of branch) {
        await this.repo.reportCondition(
          user.journal,
          report,
          infoType,
          bank,
          element,
          reason,
          begin,
          end,
          reload,
          balance,
          contract,
          operation,
          loan,
          grci_coas,
          active_passive,
        );
      }
    } else {
      await this.repo.reportCondition(
        user.journal,
        report,
        infoType,
        bank,
        branch,
        reason,
        begin,
        end,
        reload,
        balance,
        contract,
        operation,
        loan,
        grci_coas,
        active_passive,
      );
    }
    return setResponse(1);
  }

  /** Отсутствие body → TypeError → 500 (как в оригинале). */
  @Post('setting/delReportCondition')
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async delReportCondition(@CurrentUser() user: JwtUser, @Body() body: any): Promise<Result> {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    return setResponse(
      await this.repo.delReportCondition(
        user.journal,
        body.report,
        body.bank,
        body.branch,
        body.created,
        body.begin,
        body.end,
      ),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  }

  @Get('setting/selCondition')
  async selCondition(@Query('state') state?: string): Promise<Rows> {
    return setResponse(await this.repo.selReportCondition(state));
  }

  @Get('setting/selConditionDetail')
  async selConditionDetail(
    @Query('report') report?: string,
    @Query('branch') branch?: string,
    @Query('begin') begin?: string,
    @Query('end') end?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.selReportConditionDetail(report, branch, begin, end));
  }

  // ------------------------------------------------------------------ прочее

  @Get('setting/updPrevBalanceComprasion')
  async updPrevBalanceComprasion(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updPrevBalanceComprasion(bank, value));
  }

  @Get('setting/updTransactionCheckDebitCredit')
  async updTransactionCheckDebitCredit(@Query('bank') bank?: string, @Query('value') value?: string): Promise<Result> {
    return setResponse(await this.repo.updTransactionCheckDebitCredit(bank, value));
  }

  @Get('setting/selPrevBalanceComprasion')
  async selPrevBalanceComprasion(): Promise<Rows> {
    return setResponse(await this.repo.selPrevBalanceComprasion());
  }

  @Get('setting/selOperationTypeCondition')
  async selOperationTypeCondition(): Promise<Rows> {
    return setResponse(await this.repo.selOperationTypeCondition());
  }

  @Get('setting/updOperationTypeAction')
  async updOperationTypeAction(
    @Query('bank') bank?: string,
    @Query('code') code?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updOperationTypeAction(bank, code, value));
  }

  @Get('setting/selReportCreditCoaCondition')
  async selReportCreditCoaCondition(): Promise<Rows> {
    return setResponse(await this.repo.selReportCreditCoaCondition());
  }

  @Get('setting/selReportCreditBankCondition')
  async selReportCreditBankCondition(): Promise<Rows> {
    return setResponse(await this.repo.selReportCreditBankCondition());
  }

  @Get('setting/updReportCreditBank')
  async updReportCreditBank(
    @Query('bank') bank?: string,
    @Query('type') type?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updReportCreditBank(bank, type, value));
  }

  @Get('setting/updReportCreditCoa')
  async updReportCreditCoa(
    @Query('info_type') info_type?: string,
    @Query('credit_type') credit_type?: string,
    @Query('coa') coa?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updReportCreditCoa(info_type, credit_type, coa, value));
  }

  @Get('setting/selReportVersionModeCondition')
  async selReportVersionModeCondition(): Promise<Rows> {
    return setResponse(await this.repo.selReportVersionModeCondition());
  }

  @Get('setting/updReportVersionModeCondition')
  async updReportVersionModeCondition(
    @Query('type') type?: string,
    @Query('code') code?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updReportVersionModeCondition(type, code, value));
  }

  @Get('setting/updReportBalanceAccreditiveCondition')
  async updReportBalanceAccreditiveCondition(
    @Query('code') code?: string,
    @Query('value') value?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updReportBalanceAccreditiveCondition(code, value));
  }

  @Get('setting/selCreditOperationCorrectionCondition')
  async selCreditOperationCorrectionCondition(
    @Query('begin') begin?: string,
    @Query('end') end?: string,
    @Query('inFile') inFile?: string,
  ): Promise<Rows> {
    return setResponse(await this.repo.selCreditOperationCorrectionCondition(begin, end, inFile));
  }

  @Get('setting/updCreditOperationCorrection')
  async updCreditOperationCorrection(
    @CurrentUser() user: JwtUser,
    @Query('id') id?: string,
    @Query('state') state?: string,
  ): Promise<Result> {
    return setResponse(await this.repo.updCreditOperationCorrection(user.journal, id, state));
  }
}
