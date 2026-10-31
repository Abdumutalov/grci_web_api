/**
 * Стандартная обёртка ответа — порт getParam.setResponse.
 * ВАЖНО: проверка строго на `null` (как в оригинале). `undefined` даёт
 * `{ code: '1' }` без поля result после сериализации.
 */
export interface ApiResponse<T = unknown> {
  code: '0' | '1';
  result: T | never[];
}

export function setResponse<T>(data: T | null): ApiResponse<T> {
  if (data !== null) {
    return { code: '1', result: data };
  }
  return { code: '0', result: [] };
}
