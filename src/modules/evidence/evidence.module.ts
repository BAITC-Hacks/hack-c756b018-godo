import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaseEntity } from '../cases/entities/case.entity';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { EvidenceEntity } from './entities/evidence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CaseEntity, EvidenceEntity])],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
