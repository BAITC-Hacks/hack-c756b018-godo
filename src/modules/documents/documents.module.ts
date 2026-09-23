import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaseEntity } from '../cases/entities/case.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([CaseEntity])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
