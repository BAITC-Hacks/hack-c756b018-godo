import { SkillRequirementEntity } from './entities/skill-requirement.entity';

function levelFromValue(value: unknown): number {
  const candidate = typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>).level ?? (value as Record<string, unknown>).required_level
    : value;
  const level = Number(candidate);
  return Number.isFinite(level) && level > 0 ? Math.min(5, Math.floor(level)) : 0;
}

export function requiredLevelForGrade(requirement: SkillRequirementEntity, role: string, grade: string): number {
  const matrix = requirement.requirementsByGrade;
  const roleMatrix = matrix[role] ?? matrix[role.toLowerCase()];
  const gradeMap = typeof roleMatrix === 'object' && roleMatrix !== null
    ? roleMatrix as Record<string, unknown>
    : matrix;
  return levelFromValue(gradeMap[grade] ?? gradeMap[grade.toLowerCase()]);
}

export function targetRequirementsForEmployee(
  requirements: SkillRequirementEntity[], role: string, targetGrade: string,
): Map<string, { name: string; category: string; level: number }> {
  const result = new Map<string, { name: string; category: string; level: number }>();
  for (const requirement of requirements) {
    const level = requiredLevelForGrade(requirement, role, targetGrade);
    if (level > 0) result.set(requirement.skillId, { name: requirement.name, category: requirement.category, level });
  }
  return result;
}

export function readinessScore(skills: Record<string, number>, requirements: Map<string, { level: number }>): number {
  let achieved = 0;
  let total = 0;
  for (const [skillId, requirement] of requirements) {
    total += requirement.level;
    achieved += Math.min(skills[skillId] ?? 0, requirement.level);
  }
  return total === 0 ? 0 : Math.round(achieved / total * 100);
}
