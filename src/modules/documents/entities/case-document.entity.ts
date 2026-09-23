import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType } from '../../../common/interfaces/case.interface';
import { CaseEntity } from '../../cases/entities/case.entity';

// Редактируемый черновик документа по кейсу. Пользователь проверяет
// и правит текст (PATCH) перед отправкой — автоматической отправки нет.
@Entity('case_documents')
export class CaseDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  caseId!: string;

  @ManyToOne(() => CaseEntity, (kase) => kase.documents)
  @JoinColumn({ name: 'caseId' })
  case!: CaseEntity;

  @Column({ type: 'varchar' })
  type!: DocumentType;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  documentText!: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ type: 'boolean', default: true })
  isAiGenerated!: boolean;

  @Column({ type: 'boolean', default: false })
  isEditedByUser!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
