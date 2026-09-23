import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Employee } from './employee.entity';
import { Event } from './event.entity';
import { ActivityStatus } from '../common/enums/activity-status.enum';

@Entity('activity_history')
export class ActivityHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  eventId: string;

  @Column({ type: 'enum', enum: ActivityStatus })
  status: ActivityStatus;

  @CreateDateColumn()
  date: Date;

  @ManyToOne(() => Employee, (e) => e.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Event, { eager: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;
}
