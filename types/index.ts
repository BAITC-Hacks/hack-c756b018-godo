export interface SkillProgress {
  skillId: string;
  skillName: string;
  category: 'hard' | 'soft';
  currentLevel: number;
  requiredLevel: number;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  currentGrade: string;
  targetGrade: string;
  tenureMonths: number;
  readinessScore: number;
  skills: SkillProgress[];
  history: Array<{ eventId: string; title: string; status: string; date: string }>;
}

export interface AIRecommendation {
  eventId: string;
  title: string;
  targetSkillId: string;
  targetSkillName: string;
  predictedGain: number;
  priority: number;
  reason: string;
}

export interface CompleteActivityDto {
  employeeId: string;
  eventId: string;
}

export interface CompleteActivityResponse {
  success: boolean;
  updatedSkills: SkillProgress[];
  newReadinessScore: number;
}

export interface HrEmployeeSummary {
  id: string;
  name: string;
  role: string;
  currentGrade: string;
  targetGrade: string;
  tenureMonths: number;
  readinessScore: number;
  hasRecommendations: boolean;
}

export interface HrAnalytics {
  laggingSkills: Array<{ skillId: string; skillName: string; affectedEmployees: number }>;
  employeesAtRisk: HrEmployeeSummary[];
  withoutRecommendations: Array<{ id: string; name: string }>;
  participationByActivity: Array<{ eventId: string; title: string; completed: number; skipped: number; refused: number }>;
}
