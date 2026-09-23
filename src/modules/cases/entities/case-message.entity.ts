import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CaseEntity } from './case.entity';

@Entity('case_messages')
export class CaseMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  caseId!: string;

  @ManyToOne(() => CaseEntity, (kase) => kase.messages)
  @JoinColumn({ name: 'caseId' })
  case!: CaseEntity;

  @Column({ type: 'varchar', default: 'user' })
  sender!: string;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
