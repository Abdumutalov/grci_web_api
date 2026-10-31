import * as oracledb from 'oracledb';

/**
 * Имена типов, которые использовал оригинал (`oracleParam.setParamType`).
 * Сравнение регистронезависимое, как в оригинале ('Number' === 'NUMBER').
 */
export type OracleParamType =
  | 'String'
  | 'STRING'
  | 'Number'
  | 'NUMBER'
  | 'CLOB'
  | 'CURSOR'
  | 'SYS_REFCURSOR'
  | 'VARCHAR2'
  | 'DATE'
  | 'TIMESTAMP'
  | 'BLOB'
  | 'BOOLEAN'
  | 'CHAR'
  | 'NCHAR'
  | 'NCLOB'
  | 'NVARCHAR'
  | 'RAW';

/** Порт oracleParam.setParamType: имя типа → тип oracledb (null — неизвестный тип). */
export function toOracleType(type: string): oracledb.DbType | number | null {
  switch (type.toUpperCase()) {
    case 'STRING':
      return oracledb.STRING;
    case 'BFILE':
      return oracledb.DB_TYPE_BFILE;
    case 'BINARY_DOUBLE':
      return oracledb.DB_TYPE_BINARY_DOUBLE;
    case 'BINARY_FLOAT':
      return oracledb.DB_TYPE_BINARY_FLOAT;
    case 'SMALLINT':
      return oracledb.DB_TYPE_BINARY_INTEGER;
    case 'BLOB':
      return oracledb.DB_TYPE_BLOB;
    case 'BOOLEAN':
      return oracledb.DB_TYPE_BOOLEAN;
    case 'CHAR':
      return oracledb.DB_TYPE_CHAR;
    case 'CLOB':
      return oracledb.DB_TYPE_CLOB;
    case 'SYS_REFCURSOR':
      return oracledb.DB_TYPE_CURSOR;
    case 'CURSOR':
      return oracledb.CURSOR;
    case 'DATE':
      return oracledb.DB_TYPE_DATE;
    case 'DAY_TO_SECOND':
      return oracledb.DB_TYPE_INTERVAL_DS;
    case 'YEAR_TO_MONTH':
      return oracledb.DB_TYPE_INTERVAL_YM;
    case 'LONG':
      return oracledb.DB_TYPE_LONG;
    case 'LONG_RAW':
      return oracledb.DB_TYPE_LONG_RAW;
    case 'NCHAR':
      return oracledb.DB_TYPE_NCHAR;
    case 'NCLOB':
      return oracledb.DB_TYPE_NCLOB;
    case 'NUMBER':
      return oracledb.DB_TYPE_NUMBER;
    case 'NVARCHAR':
      return oracledb.DB_TYPE_NVARCHAR;
    case 'OBJECT':
      return oracledb.DB_TYPE_OBJECT;
    case 'RAW':
      return oracledb.DB_TYPE_RAW;
    case 'ROWID':
      return oracledb.DB_TYPE_ROWID;
    case 'TIMESTAMP':
      return oracledb.DB_TYPE_TIMESTAMP;
    case 'TIMESTAMP_LOCAL_TIME':
      return oracledb.DB_TYPE_TIMESTAMP_LTZ;
    case 'TIMESTAMP_TIME':
      return oracledb.DB_TYPE_TIMESTAMP_TZ;
    case 'VARCHAR2':
      return oracledb.DB_TYPE_VARCHAR;
    default:
      return null;
  }
}

/** Пулы соединений приложения (алиасы берутся из .env). */
export enum Pool {
  /** Основная БД ГРКИ (DB_*) */
  Main = 'main',
  /** БД ИАБС / odbank (IABS_*) */
  Iabs = 'iabs',
}

/** Метки для файлового протокола (funtionName / methodName оригинала). */
export interface DbContext {
  fn: string;
  method: string;
}

/** Описание OUT-результата функции (`:result`). */
export interface OutResult {
  type: OracleParamType;
  maxSize?: number;
}

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Binds = Record<string, unknown>;
