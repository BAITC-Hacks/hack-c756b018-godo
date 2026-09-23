import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CaseEntity } from '../cases/entities/case.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CaseDocumentEntity } from './entities/case-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CaseEntity, CaseDocumentEntity]),
    AiModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
