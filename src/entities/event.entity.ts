import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('events')
export class Event {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  type: string;

  @Column('simple-array')
  targetAudience: string[];

  @Column({ type: 'jsonb' })
  skillsDeveloped: Array<{ skillId: string; gain: number; maxLevel: number }>;
}
