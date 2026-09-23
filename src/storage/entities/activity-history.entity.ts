import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ActivityHistoryStatus {
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  REFUSED = 'REFUSED',
}

@Entity('career_activity_history')
@Index(['employeeId', 'skillId', 'status'])
export class ActivityHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  employeeId: string;

  @Column({ type: 'varchar', length: 64 })
  eventId: string;

  @Column({ type: 'varchar', length: 64 })
  skillId: string;

  @Column({ type: 'enum', enum: ActivityHistoryStatus, enumName: 'career_activity_status' })
  status: ActivityHistoryStatus;

  @Column({ type: 'timestamptz' })
  date: Date;
}
