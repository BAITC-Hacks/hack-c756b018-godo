import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { EvidenceEntity } from '../evidence/entities/evidence.entity';
import { LegalModule } from '../legal/legal.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseEntity } from './entities/case.entity';
import { CaseMessageEntity } from './entities/case-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CaseEntity, CaseMessageEntity, EvidenceEntity]),
    AiModule,
    LegalModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
