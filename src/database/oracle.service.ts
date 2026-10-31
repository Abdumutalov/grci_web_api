import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// require-импорт: нужен реальный объект модуля, чтобы присваивать глобальные настройки (fetchAsString)
import oracledb = require('oracledb');
import { protocolWrite } from '../common/protocol/protocol-log';
import { safeParse } from '../common/utils/json.util';
import { toBool, toInt } from '../common/utils/env.util';
import { Binds, DbContext, OracleParamType, OutResult, Pool, Row, toOracleType } from './oracle-types';

/**
 * Работа с Oracle — порт public/db/dbAdapter.js (oraConnection / oraModel / oracleParam).
 *
 * Контракт методов повторяет оригинал: любые ошибки БД НЕ пробрасываются,
 * а пишутся в протокол `DataBase` и превращаются в `null`. Контроллеры
 * оборачивают результат в `setResponse`, где `null` → `{ code: '0', result: [] }`.
 *
 * Улучшения относительно оригинала (на ответы API не влияют):
 *  - соединение закрывается всегда (в оригинале при ошибке execute
 *    `executeSelectResult` не закрывал соединение — утечка из пула);
 *  - `oracledb.fetchAsString = [CLOB]` выставляется один раз при старте
 *    (в оригинале — глобально после первого CLOB-запроса, что меняло поведение
 *    всех последующих запросов процесса);
 *  - пулы закрываются при остановке приложения.
 */
@Injectable()
export class OracleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Oracle');
  private readonly aliases: Record<Pool, string>;

  constructor(private readonly config: ConfigService) {
    this.aliases = {
      [Pool.Main]: this.config.get<string>('DB_POOL_ALIAS') || 'real',
      [Pool.Iabs]: this.config.get<string>('IABS_POOL_ALIAS') || 'odbank',
    };
  }

  // ---------------------------------------------------------------- lifecycle

  async onModuleInit(): Promise<void> {
    // Оригинал всегда вызывал oracledb.initOracleClient() (Thick-режим) и
    // подключался по TNS-алиасам (GRCI, IABSDB). По умолчанию делаем так же.
    if (toBool(this.config.get<string>('ORACLE_THICK_MODE'), true)) {
      try {
        const opts: oracledb.InitialiseOptions = {};
        const libDir = this.config.get<string>('ORACLE_CLIENT_LIB_DIR');
        const configDir = this.config.get<string>('ORACLE_TNS_ADMIN');
        if (libDir) opts.libDir = libDir;
        if (configDir) opts.configDir = configDir;
        oracledb.initOracleClient(opts);
        this.logger.log('Oracle client: Thick-режим');
      } catch (err) {
        this.logger.error(`Не удалось включить Thick-режим: ${(err as Error).message}`);
      }
    } else {
      this.logger.log('Oracle client: Thin-режим');
    }

    oracledb.fetchAsString = [oracledb.CLOB];

    await Promise.all([this.createPool(Pool.Main, 'DB'), this.createPool(Pool.Iabs, 'IABS')]);
  }

  async onModuleDestroy(): Promise<void> {
    for (const alias of Object.values(this.aliases)) {
      try {
        await oracledb.getPool(alias).close(10);
      } catch {
        // пул мог не создаться — игнорируем
      }
    }
  }

  private async createPool(pool: Pool, prefix: 'DB' | 'IABS'): Promise<void> {
    const get = (key: string) => this.config.get<string>(`${prefix}_${key}`);
    const poolAlias = this.aliases[pool];
    try {
      await oracledb.createPool({
        user: get('USER'),
        password: get('PASSWORD'),
        connectString: get('CONNECT_STRING'),
        enableStatistics: true,
        poolAlias,
        poolMin: toInt(get('POOL_MIN'), 1),
        poolMax: toInt(get('POOL_MAX'), 100),
        poolIncrement: toInt(get('POOL_INCREMENT'), 1),
        poolTimeout: toInt(get('POOL_TIMEOUT'), 15),
      });
      this.logger.log(`Пул "${poolAlias}" создан (${get('CONNECT_STRING')})`);
    } catch (err) {
      // как в оригинале (oraConnection.Start) — процесс не роняем
      this.logger.error(`Пул "${poolAlias}" не создан: ${(err as Error).message}`);
      void protocolWrite(
        `| NotConnection to Database : ${(err as Error).message} |`,
        'DataBase',
        'Server',
        false,
        false,
      );
    }
  }

  // ------------------------------------------------------------------ helpers

  private logError(prefix: string, ctx: DbContext, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`${prefix} ${ctx.fn}.${ctx.method}: ${message}`);
    void protocolWrite(
      `| ${prefix} : | FunctionName : | ${ctx.fn} | MethodName : | ${ctx.method} | Exception : | ${message} |`,
      'DataBase',
      'Server',
      false,
      false,
    );
  }

  private async getConnection(pool: Pool, ctx: DbContext): Promise<oracledb.Connection | null> {
    try {
      return await oracledb.getConnection(this.aliases[pool]);
    } catch (err) {
      this.logError('NotConnection to Database con_execute', ctx, err);
      return null;
    }
  }

  private async close(conn: oracledb.Connection, ctx: DbContext): Promise<void> {
    try {
      await conn.close();
    } catch (err) {
      this.logError('NotConnection to Database con_execute', ctx, err);
    }
  }

  /** OUT-bind `:result` (порт setFunction / setFunctionCursor). null — неизвестный тип. */
  private resultBind(out: OutResult): oracledb.BindParameter | null {
    const type = toOracleType(out.type);
    if (type === null) return null;
    const bind: oracledb.BindParameter = { dir: oracledb.BIND_OUT, type: type as oracledb.DbType };
    if (out.maxSize !== undefined && !isCursor(out.type)) bind.maxSize = out.maxSize;
    return bind;
  }

  /** CLOB-колонки в строках курсора → строки (порт цикла getData() в executeFunctionCursor). */
  private async readLobColumns(rows: Row[]): Promise<void> {
    if (!rows.length) return;
    for (const key of Object.keys(rows[0])) {
      if (isClob(rows[0][key])) {
        for (const row of rows) {
          if (isClob(row[key])) row[key] = await (row[key] as oracledb.Lob).getData();
        }
      }
    }
  }

  // ------------------------------------------------------------------- public

  /**
   * Порт OUT-параметра функции (`oracleParam.getParamInOut`): используется
   * для дополнительных OUT-параметров (например `pResText` в USERS.CheckUser).
   */
  outParam(type: OracleParamType, maxSize?: number): oracledb.BindParameter | null {
    return this.resultBind({ type, maxSize });
  }

  /**
   * SELECT → массив строк (outFormat OBJECT). Порт `executeSelectResult`
   * (и `executeSelectResultClob` — CLOB всегда отдаются строкой).
   * @returns строки или null при любой ошибке
   */
  async select<T extends Row = Row>(pool: Pool, sql: string, binds: Binds | null, ctx: DbContext): Promise<T[] | null> {
    const conn = await this.getConnection(pool, ctx);
    if (!conn) return null;
    try {
      const result = await conn.execute<T>(sql, (binds ?? {}) as oracledb.BindParameters, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      return result.rows ?? null;
    } catch (err) {
      this.logError('executeSelectResult', ctx, err);
      return null;
    } finally {
      await this.close(conn, ctx);
    }
  }

  /**
   * Вызов функции `BEGIN :result := PKG.fn(...); END;` — порт
   * `setFunction` + `functionResult` (`executeFunctionResult`).
   *
   * Логика фиксации как в оригинале: execute выполняется с `autoCommit`,
   * затем, если OUT-результат — JSON с `code`, commit только при `code === "1"`,
   * иначе (нет поля code) — commit.
   *
   * @returns значение `:result` или null при ошибке
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callFunction(
    pool: Pool,
    sql: string,
    binds: Binds,
    out: OutResult,
    autoCommit: boolean,
    ctx: DbContext,
  ): Promise<any> {
    const outBinds = await this.executeFunction(pool, sql, binds, out, autoCommit, ctx);
    return outBinds ? outBinds.result : null;
  }

  /**
   * То же, что callFunction, но возвращает все OUT-параметры — порт `functionInoutResult`.
   * @returns объект outBinds (`{ result, <другие OUT> }`) или null при ошибке
   */
  async callFunctionInOut(
    pool: Pool,
    sql: string,
    binds: Binds,
    out: OutResult,
    autoCommit: boolean,
    ctx: DbContext,
  ): Promise<Row | null> {
    return this.executeFunction(pool, sql, binds, out, autoCommit, ctx);
  }

  private async executeFunction(
    pool: Pool,
    sql: string,
    binds: Binds,
    out: OutResult,
    autoCommit: boolean,
    ctx: DbContext,
  ): Promise<Row | null> {
    const resultBind = this.resultBind(out);
    const conn = await this.getConnection(pool, ctx);
    if (!conn) return null;
    // объявлено вне try: как в оригинале, при ошибке commit результат execute
    // всё равно возвращается (result присваивался до conn.commit())
    let outBinds: Row | null = null;
    try {
      // в оригинале при неизвестном типе binds = null → execute падал → null
      if (!resultBind) throw new Error(`Unknown result type "${out.type}"`);
      const result = await conn.execute<unknown>(sql, { ...binds, result: resultBind } as oracledb.BindParameters, {
        autoCommit,
      });
      outBinds = (result.outBinds ?? null) as Row | null;
      if (outBinds) {
        const answer = safeParse(outBinds.result);
        if (answer && answer.code) {
          if (answer.code === '1') await conn.commit();
        } else {
          await conn.commit();
        }
      }
      return outBinds;
    } catch (err) {
      this.logError('NotConnection to Database con_execute', ctx, err);
      return outBinds;
    } finally {
      await this.close(conn, ctx);
    }
  }

  /**
   * Функция, возвращающая SYS_REFCURSOR — порт `setFunctionCursor` + `functionCursor`
   * (`executeFunctionCursor`) и `functionCursorWithCommit`.
   *
   * @param rowCount сколько строк читать из курсора; falsy → все строки
   * @param commit   выполнить commit после чтения (functionCursorWithCommit)
   * @returns строки курсора (outFormat OBJECT, CLOB → string) или null при ошибке
   */
  async callFunctionCursor<T extends Row = Row>(
    pool: Pool,
    sql: string,
    binds: Binds,
    autoCommit: boolean,
    ctx: DbContext,
    rowCount?: number,
    commit = false,
  ): Promise<T[] | null> {
    const conn = await this.getConnection(pool, ctx);
    if (!conn) return null;
    // как в оригинале: если строки уже прочитаны, а ошибка случилась позже
    // (CLOB getData, commit, close курсора) — строки всё равно возвращаются.
    // Отличие: при ошибке getRows (в т.ч. NULL-курсор) оригинал возвращал сырой
    // результат execute (`{ outBinds: { result: ... } }`), здесь — null.
    let rows: T[] | null = null;
    try {
      const result = await conn.execute<unknown>(
        sql,
        { ...binds, result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } } as oracledb.BindParameters,
        { autoCommit, outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const resultSet = (result.outBinds as { result: oracledb.ResultSet<T> }).result;
      try {
        rows = rowCount ? await resultSet.getRows(rowCount) : await resultSet.getRows();
        await this.readLobColumns(rows);
        if (commit) await conn.commit();
        return rows;
      } finally {
        await resultSet.close();
      }
    } catch (err) {
      this.logError('NotConnection to Database con_execute', ctx, err);
      return rows;
    } finally {
      await this.close(conn, ctx);
    }
  }

  /**
   * Функция, возвращающая CLOB — порт `setFunction('CLOB')` + `executeFunctionResultClob`.
   *
   * ВНИМАНИЕ: в оригинале при любой ошибке (или NULL-результате) метод возвращал
   * не строку (`{}` либо сырой результат execute), и последующий `JSON.parse`
   * в контроллере бросал исключение → HTTP 500. Здесь такой случай — `null`;
   * вызывающий код должен сам решить, как его обработать.
   *
   * Фиксация: оригинал НЕ передавал autoCommit в conn.execute (действовал
   * дефолт oracledb.autoCommit = false, commit не выполнялся). Для паритета
   * вызывающий код должен передавать `autoCommit = false`.
   *
   * @returns содержимое CLOB строкой или null
   */
  async callFunctionClob(
    pool: Pool,
    sql: string,
    binds: Binds,
    maxSize: number,
    autoCommit: boolean,
    ctx: DbContext,
  ): Promise<string | null> {
    const conn = await this.getConnection(pool, ctx);
    if (!conn) return null;
    try {
      const result = await conn.execute<unknown>(
        sql,
        {
          ...binds,
          result: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_CLOB, maxSize },
        } as oracledb.BindParameters,
        { autoCommit, outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const lob = (result.outBinds as { result: oracledb.Lob | string | null }).result;
      if (lob === null || lob === undefined) return null;
      if (typeof lob === 'string') return lob;
      try {
        return (await lob.getData()) as string;
      } finally {
        lob.destroy();
      }
    } catch (err) {
      this.logError('executeSelectResultClob', ctx, err);
      return null;
    } finally {
      await this.close(conn, ctx);
    }
  }
}

function isClob(value: unknown): value is oracledb.Lob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as oracledb.Lob).getData === 'function' &&
    (value as oracledb.Lob).type === oracledb.CLOB
  );
}

function isCursor(type: string): boolean {
  const t = type.toUpperCase();
  return t === 'CURSOR' || t === 'SYS_REFCURSOR';
}
