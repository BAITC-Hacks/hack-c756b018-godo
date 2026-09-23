import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('career_skill_requirements')
export class SkillRequirementEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  skillId: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 24 })
  category: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  requirementsByGrade: Record<string, unknown>;
}
