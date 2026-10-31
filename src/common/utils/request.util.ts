import type { Request } from 'express';
import { getDateTime } from './date-time.util';
import { safeStringify } from './json.util';

export interface RequestParams {
  requestBody: string;
  requestDT: string;
  ip?: string;
}

/** Порт getParam.getBody: тело запроса строкой + время + IP клиента. */
export function getBody(req: Request): RequestParams {
  const forwarded = req.headers['x-forwarded-for'];
  return {
    requestBody: safeStringify(req.body),
    requestDT: getDateTime(),
    ip:
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) || (req.socket.remoteAddress ?? '').replace('::ffff:', ''),
  };
}

/** Порт getParam.getParam: произвольный объект строкой + время. */
export function getParam(body: unknown): RequestParams {
  return {
    requestBody: safeStringify(body),
    requestDT: getDateTime(),
  };
}
