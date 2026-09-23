import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EvidenceAnalysisItem } from '../../../common/interfaces/ai.interface';
import { jsonColumnType } from '../../../common/db/column-types';
import { CaseEntity } from '../../cases/entities/case.entity';

export type EvidenceKind = 'image' | 'audio' | 'pdf' | 'other';

@Entity('evidence')
export class EvidenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  caseId!: string;

  @ManyToOne(() => CaseEntity, (kase) => kase.evidence)
  @JoinColumn({ name: 'caseId' })
  case!: CaseEntity;

  @Column({ type: 'varchar' })
  originalName!: string;

  @Column({ type: 'varchar' })
  filename!: string;

  @Column({ type: 'varchar' })
  mimeType!: string;

  @Column({ type: 'integer' })
  sizeBytes!: number;

  @Column({ type: 'varchar' })
  kind!: EvidenceKind;

  @Column({ type: jsonColumnType, nullable: true })
  analysis!: EvidenceAnalysisItem | null;

  @CreateDateColumn()
  createdAt!: Date;
}
