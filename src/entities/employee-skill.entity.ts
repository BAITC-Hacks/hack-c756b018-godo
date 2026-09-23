import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';
import { Skill } from './skill.entity';

@Entity('employee_skills')
export class EmployeeSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  skillId: string;

  @Column({ type: 'int', default: 0 })
  currentLevel: number;

  @Column({ type: 'int', default: 0 })
  requiredLevel: number;

  @ManyToOne(() => Employee, (e) => e.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Skill, { eager: true })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;
}
