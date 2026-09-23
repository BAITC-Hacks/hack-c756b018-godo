import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('career_events')
export class EventEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 240 })
  title: string;

  @Column({ type: 'varchar', length: 64 })
  targetSkillId: string;

  @Column({ type: 'int' })
  gain: number;

  @Column({ type: 'int' })
  maxLevel: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  audience: string[];

  @Column({ type: 'varchar', length: 64 })
  type: string;
}
