import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { LegalArticle } from '../../../common/interfaces/case.interface';

@Entity('cases')
export class CaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  textDescription!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  facts!: string[];

  @Column({ type: 'simple-json', nullable: true })
  legalArticles!: LegalArticle[];

  @Column({ type: 'simple-json', nullable: true })
  nextSteps!: string[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
