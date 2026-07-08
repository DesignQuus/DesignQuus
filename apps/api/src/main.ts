import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  requestIdMiddleware,
  REQUEST_ID_HEADER,
} from './common/request-id.middleware';
import { HttpExceptionFilter } from './observability/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('v1');
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    exposedHeaders: ['content-length', 'content-type', REQUEST_ID_HEADER],
  });

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
