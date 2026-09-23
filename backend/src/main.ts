import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Валидация DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS
  app.enableCors();

  // Настройка Swagger для удобства тестирования жюри
  const config = new DocumentBuilder()
    .setTitle('Career Quest API')
    .setDescription('AI-навигатор карьерного развития сотрудников — Halyk Bank Track')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Сервер запущен на порту: http://localhost:${port}`);
  console.log(`📚 Документация Swagger доступна по адресу: http://localhost:${port}/docs`);
}
bootstrap();
