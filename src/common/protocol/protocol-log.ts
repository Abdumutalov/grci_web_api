import * as fs from 'fs';
import * as path from 'path';
import { getDDMMYYYY, getHHMMSS } from '../utils/date-time.util';

/**
 * Файловый протокол — порт public/helpers/log.js (`global.log.write`).
 *
 * Формат строки сохранён: `HH:mm:ss ~ <text> ~ <Успешно|Ошибки>`,
 * файлы: `<PROTOCOL_PATH>/<DDMMYYYY>/<method>/<fileName>.txt`.
 * Настройки читаются из окружения при каждой записи (PROTOCOL_WRITE, PROTOCOL_PATH),
 * поэтому модуль можно использовать и вне DI (утилиты, адаптер БД).
 *
 * Отличие от оригинала: путь для `writeError` в оригинале склеивался без
 * разделителя (`<PATH><date>/...`) и файл не создавался; здесь он пишется рядом
 * с основным протоколом (`e<fileName>.txt`).
 */
function protocolDir(): string {
  return process.env.PROTOCOL_PATH ? path.resolve(process.env.PROTOCOL_PATH) : path.join(process.cwd(), 'log');
}

async function append(fileName: string, text: string, isSuccess: boolean): Promise<void> {
  const line = `${getHHMMSS()} ~ ${text} ~ ${isSuccess ? 'Успешно' : 'Ошибки'}\n`;
  await fs.promises.mkdir(path.dirname(fileName), { recursive: true });
  await fs.promises.appendFile(fileName, line, { encoding: 'utf8' });
}

/**
 * @param text       текст записи
 * @param fileName   имя файла без расширения (например 'DataBase', 'BeginProcess')
 * @param method     подкаталог (в оригинале почти всегда 'Server')
 * @param isSuccess  true → «Успешно», false → «Ошибки» (в оригинале параметр назывался isError)
 * @param writeError дополнительно продублировать в файл `e<fileName>.txt`
 */
export async function protocolWrite(
  text: string,
  fileName: string,
  method: string,
  isSuccess: boolean,
  writeError = false,
): Promise<void> {
  try {
    const dir = path.join(protocolDir(), getDDMMYYYY(), method);
    if (process.env.PROTOCOL_WRITE === 'true') {
      await append(path.join(dir, `${fileName}.txt`), text, isSuccess);
    }
    if (writeError) {
      await append(path.join(dir, `e${fileName}.txt`), text, isSuccess);
    }
  } catch (err) {
    // как в оригинале — ошибки протокола не должны ронять запрос
    console.error(err);
  }
}
