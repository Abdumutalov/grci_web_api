import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { RawResponseException } from '../exceptions/raw-response.exception';
import { protocolWrite } from '../protocol/protocol-log';

/**
 * Глобальный фильтр исключений.
 *
 *  - RawResponseException → тело отдаётся как есть (см. класс);
 *  - 404 на GET без маршрута → index.html SPA (порт `app.get(/.*\/, sendFile(build/index.html))`);
 *  - HttpException → стандартный ответ Nest;
 *  - http-errors из мидлваров (413/415 body-parser) → их статус (тело JSON вместо HTML finalhandler);
 *  - прочие ошибки (в оригинале — необработанные исключения в контроллерах,
 *    которые Express 5 превращал в 500) → 500 + запись в протокол.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  constructor(private readonly staticDir: string) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (res.headersSent) return;

    if (exception instanceof RawResponseException) {
      res.status(exception.status).json(exception.body);
      return;
    }

    // app.get(/.*/) в Express обслуживал и HEAD
    if (exception instanceof NotFoundException && (req.method === 'GET' || req.method === 'HEAD')) {
      const index = path.join(this.staticDir, 'index.html');
      if (fs.existsSync(index)) {
        res.sendFile(index);
        return;
      }
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res
        .status(exception.getStatus())
        .json(typeof body === 'string' ? { statusCode: exception.getStatus(), message: body } : body);
      return;
    }

    // Ошибки http-errors из мидлваров (body-parser: 413 entity.too.large,
    // 415 charset/encoding.unsupported и т.п.) — finalhandler Express отвечал
    // их собственным статусом, а не 500. Тело — JSON (в оригинале HTML-страница).
    const httpStatus = (exception as { status?: unknown; expose?: unknown } | null)?.status;
    if (
      exception instanceof Error &&
      typeof httpStatus === 'number' &&
      httpStatus >= 400 &&
      httpStatus < 500 &&
      (exception as { expose?: unknown }).expose === true
    ) {
      res.status(httpStatus).json({ statusCode: httpStatus, message: exception.message });
      return;
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    this.logger.error(
      `${req.method} ${req.originalUrl}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    void protocolWrite(
      `| ${req.method} ${req.originalUrl} | Exception : | ${message} |`,
      'Exception',
      'Server',
      false,
      false,
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Internal server error' });
  }
}
