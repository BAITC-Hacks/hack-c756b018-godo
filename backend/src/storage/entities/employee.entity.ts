import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('career_employees')
export class EmployeeEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 120 })
  role: string;

  @Column({ type: 'varchar', length: 40 })
  currentGrade: string;

  @Column({ type: 'varchar', length: 40 })
  targetGrade: string;

  @Column({ type: 'int', default: 0 })
  tenureMonths: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  skills: Record<string, number>;
}
