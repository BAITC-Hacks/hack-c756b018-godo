import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { appConfig } from './config/app.config';
import { AdiletModule } from './modules/adilet-kb/adilet.module';
import { CasesModule } from './modules/cases/cases.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: appConfig.database,
      autoLoadEntities: true,
      synchronize: true,
    }),
    CasesModule,
    AdiletModule,
    DocumentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
