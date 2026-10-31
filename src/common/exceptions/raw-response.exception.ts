/**
 * Исключение, ответ которого отдаётся клиенту «как есть»: `res.status(status).json(body)`.
 *
 * Нужно там, где оригинал отвечал произвольным JSON с не-200 статусом
 * (verify.js → 401 с ответом USER_WS.erToken, login → 401 и т.п.):
 * стандартный HttpException Nest оборачивает строки/null в `{ statusCode, message }`.
 */
export class RawResponseException extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`RawResponse ${status}`);
  }
}
