import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Pool, Row } from '../../database/oracle-types';

/** Порт controllers/chart/online/repo.js и controllers/chart/offline/repo.js */
@Injectable()
export class ChartRepository {
  constructor(private readonly db: OracleService) {}

  private online(script: string, method: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, null, { fn: 'ONLINE', method });
  }

  private offline(script: string, method: string): Promise<Row[] | null> {
    return this.db.select(Pool.Main, script, null, { fn: 'OFFLINE', method });
  }

  // ---------------------------------------------------------------- online

  onlineRequestLine(): Promise<Row[] | null> {
    return this.online(`select * from V_ONLINE_GRAPH_REQUEST`, 'onlineRequestLine');
  }

  onlineRequestPie(): Promise<Row[] | null> {
    return this.online(`select * from V_ONLINE_GRAPH_REQUEST_PIE`, 'onlineRequestPie');
  }

  onlineRequestGroupedState(): Promise<Row[] | null> {
    return this.online(`select * from v_online_graph_grouped_state`, 'onlineRequestGroupedState');
  }

  onlineRequestGroupedBank(): Promise<Row[] | null> {
    return this.online(`select * from v_online_graph_grouped_bank`, 'onlineRequestGroupedBank');
  }

  // --------------------------------------------------------------- offline

  offlineRequestLine(): Promise<Row[] | null> {
    return this.offline(`select * from V_OFFLINE_GRAPH_REQUEST`, 'offlineRequestLine');
  }

  offlineRequestPie(): Promise<Row[] | null> {
    return this.offline(`select * from V_OFFLINE_GRAPH_REQUEST_PIE`, 'offlineRequestPie');
  }

  offlineRequestColumn(): Promise<Row[] | null> {
    return this.offline(`select * from V_OFFLINE_GRAPH_COLUMN`, 'offlineRequestColumn');
  }

  offlineRequestAverageHandle(): Promise<Row[] | null> {
    return this.offline(`select * from v_offline_handle_average`, 'offlineRequestAverageHandle');
  }

  /**
   * Колонка статуса выбирается по отчёту ('008' | '009'). Для любого другого
   * значения SQL получается невалидным (`ON state.code = `) — как в оригинале,
   * результат null → `{ code: '0', result: [] }`.
   */
  offlineRequestBalance(report: string | undefined): Promise<Row[] | null> {
    let addScript = ``;
    if (report === '008') addScript = 't.check_008';
    if (report === '009') addScript = 't.check_009';
    const script = `select bank.CODE_BANK bank, state.name state, count(*) value from LOADER.OBSERVABLE_BALANCE_BRANCH t
      INNER JOIN loader.r_balance_state state ON state.code = ${addScript}
      INNER JOIN R_BANK_SHORT bank on bank.CODE_BANK = t.bank
      where t.report_date = offline_model.getOperationDate
      group by bank.CODE_BANK, state.code, state.name, state.norder
      order by  bank.CODE_BANK, state.norder`;
    return this.offline(script, 'offlineRequestBalance');
  }

  offlineBalance(): Promise<Row[] | null> {
    return this.offline(`select * from v_offline_graph_balance`, 'offlineBalance');
  }

  offlineRequestGroupedState(): Promise<Row[] | null> {
    return this.offline(`select * from v_offline_graph_grouped_state`, 'offlineRequestGroupedState');
  }

  offlineRequestGroupedBank(): Promise<Row[] | null> {
    return this.offline(`select * from v_offline_graph_grouped_bank`, 'offlineRequestGroupedBank');
  }

  offlineRequestBalanceBank(): Promise<Row[] | null> {
    return this.offline(`select * from V_OFFLINE_GRAPH_BALANCE_BANK`, 'offlineRequestBalanceBank');
  }
}
