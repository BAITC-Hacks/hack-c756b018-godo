import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { EmployeeSkill } from './employee-skill.entity';
import { ActivityHistory } from './activity-history.entity';

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @Column()
  currentGrade: string;

  @Column()
  targetGrade: string;

  @Column({ type: 'int' })
  tenureMonths: number;

  @Column({ type: 'float', default: 0 })
  readinessScore: number;

  @OneToMany(() => EmployeeSkill, (es) => es.employee, { cascade: true })
  skills: EmployeeSkill[];

  @OneToMany(() => ActivityHistory, (ah) => ah.employee)
  history: ActivityHistory[];
}
