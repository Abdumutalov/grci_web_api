import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { protocolWrite } from './common/protocol/protocol-log';
import { toBool, toInt } from './common/utils/env.util';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ====== базовые мидлвары (как в server.js) ======
  app.useBodyParser('json', { limit: '1024mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1024mb' });
  app.use(cookieParser());

  if (toBool(process.env.TRUST_PROXY, false)) {
    app.set('trust proxy', true);
  }

  // ====== CORS: отражаем Origin запроса, cookies разрешены ======
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'x-csrf',
      'xcsrf',
      'Authorization',
      'X-Requested-With',
      'x-csrf-token',
      'x-xsrf-token',
    ],
    exposedHeaders: ['auth-token'],
    optionsSuccessStatus: 204,
  });

  // ====== статика SPA (build) + fallback на index.html для неизвестных GET ======
  const staticDir = path.resolve(process.env.STATIC_DIR || path.join(process.cwd(), 'build'));
  app.useStaticAssets(staticDir);
  app.useGlobalFilters(new AllExceptionsFilter(staticDir));

  // ====== Swagger ======
  if (toBool(process.env.SWAGGER_ENABLED, true)) {
    const swaggerPath = process.env.SWAGGER_PATH || 'api-docs';
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('GRCI Web API')
        .setDescription(
          'Backend ГРКИ (NestJS-порт grci-web-api). Токен передаётся в заголовке Authorization без префикса.',
        )
        .setVersion('2.0.0')
        .addApiKey({ type: 'apiKey', in: 'header', name: 'Authorization' }, 'token')
        .build(),
    );
    SwaggerModule.setup(swaggerPath, app, document);
  }

  app.enableShutdownHooks();

  // ====== запуск ======
  const port = toInt(process.env.SERVER_PORT, 3000);
  await app.listen(port);
  await protocolWrite(`|Start node js Process set port : ${port} |`, 'BeginProcess', 'Server', true, false);
  Logger.log(`Server started on port ${port}`, 'Bootstrap');
}

void bootstrap();
