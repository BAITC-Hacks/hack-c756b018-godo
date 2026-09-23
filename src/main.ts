import 'dotenv/config';
import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  mkdirSync(appConfig.uploadDir, { recursive: true });

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appConfig.swaggerTitle)
    .setDescription(
      'API юридического ассистента «Қорғау AI» — анализ обращений, база знаний законов РК, генерация документов (MVP для хакатона).',
    )
    .setVersion(appConfig.version)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(appConfig.swaggerPath, app, document);

  await app.listen(appConfig.port);

  const url = await app.getUrl();
  console.log(`API:     ${url}/${appConfig.apiPrefix}`);
  console.log(`Swagger: ${url}/${appConfig.swaggerPath}`);
}

void bootstrap();
