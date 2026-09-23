import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { resolveDatabaseUrlFromEnv } from './config/app.config';
import { AdiletModule } from './modules/adilet-kb/adilet.module';
import { AiModule } from './modules/ai/ai.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { LegalModule } from './modules/legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (configService.get<string>('DB_TYPE') !== 'postgres') {
          // локальный режим для разработки и e2e-тестов (временный SQLite)
          return {
            type: 'sqlite' as const,
            database: configService.get<string>('DB_PATH') ?? 'db.sqlite',
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        const env = configService.get<string>('DB_URL')
          ? { DB_URL: configService.get<string>('DB_URL') ?? '' }
          : {
              DB_HOST: configService.get<string>('DB_HOST') ?? '',
              DB_PORT: configService.get<string>('DB_PORT') ?? '5432',
              DB_USER: configService.get<string>('DB_USER') ?? 'postgres',
              DB_PASSWORD: configService.get<string>('DB_PASSWORD') ?? '',
              DB_NAME: configService.get<string>('DB_NAME') ?? 'postgres',
            };
        const url = resolveDatabaseUrlFromEnv(env);
        if (!url) {
          throw new Error(
            'DB_TYPE=postgres, но строка подключения не задана. ' +
              'Укажите DB_URL (postgresql://...) или DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME в .env.',
          );
        }

        // Supabase требует SSL; rejectUnauthorized: false — из-за chain-сертификатов пула
        const ssl = (configService.get<string>('DB_SSL') ?? 'true') !== 'false';
        return {
          type: 'postgres' as const,
          url,
          ssl: ssl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    AdiletModule,
    AiModule,
    LegalModule,
    CasesModule,
    EvidenceModule,
    DocumentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
