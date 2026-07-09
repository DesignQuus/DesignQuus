import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { payloadErrorMiddleware } from './common/payload-error.middleware';
import {
  requestIdMiddleware,
  REQUEST_ID_HEADER,
} from './common/request-id.middleware';
import { HttpExceptionFilter } from './observability/http-exception.filter';
import { validateSecurityEnvironment } from './security/security-environment';

async function bootstrap(): Promise<void> {
  validateSecurityEnvironment();

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('v1');
  app.use(requestIdMiddleware);
  app.use(json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.JSON_BODY_LIMIT ?? '1mb',
    }),
  );
  app.use(payloadErrorMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    exposedHeaders: [
      'content-length',
      'content-type',
      REQUEST_ID_HEADER,
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ],
  });

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
