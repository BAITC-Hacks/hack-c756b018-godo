import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryColumn()
  id: string; // e.g. "SK_SYSTEM_DESIGN"

  @Column()
  name: string;

  @Column({ default: 'hard' })
  category: string;
}
