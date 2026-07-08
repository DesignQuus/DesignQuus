import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    exposedHeaders: ['content-length', 'content-type'],
  });
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
