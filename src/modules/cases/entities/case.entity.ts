import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FactExtraction, ClarifyingQuestion, ActionPlan } from '../../../common/interfaces/ai.interface';
import { jsonColumnType } from '../../../common/db/column-types';
import { CaseState } from '../../../common/interfaces/case.interface';
import type {
  LegalAnalysisResult,
  LegalResearchResult,
} from '../../../common/interfaces/legal.interface';
import { CaseDocumentEntity } from '../../documents/entities/case-document.entity';
import { EvidenceEntity } from '../../evidence/entities/evidence.entity';
import { CaseMessageEntity } from './case-message.entity';

// Центральная сущность приложения: хранит описание, извлечённые факты,
// уточняющие вопросы, результаты правового поиска и план действий.
@Entity('cases')
export class CaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', default: CaseState.NEW })
  state!: CaseState;

  @Column({ type: 'text', nullable: true })
  textDescription!: string | null;

  @Column({ type: jsonColumnType, nullable: true })
  facts!: FactExtraction | null;

  @Column({ type: jsonColumnType, nullable: true })
  questions!: ClarifyingQuestion[] | null;

  @Column({ type: jsonColumnType, nullable: true })
  legalResearch!: LegalResearchResult | null;

  @Column({ type: jsonColumnType, nullable: true })
  legalAnalysis!: LegalAnalysisResult | null;

  @Column({ type: jsonColumnType, nullable: true })
  actionPlan!: ActionPlan | null;

  @OneToMany(() => CaseMessageEntity, (message) => message.case, {
    cascade: ['insert'],
  })
  messages!: CaseMessageEntity[];

  @OneToMany(() => EvidenceEntity, (evidence) => evidence.case)
  evidence!: EvidenceEntity[];

  @OneToMany(() => CaseDocumentEntity, (document) => document.case)
  documents!: CaseDocumentEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
