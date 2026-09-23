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
  dataStatus?: { hasEmployeeSkills: boolean; hasTargetRequirements: boolean; hasEvents: boolean };
  skills: SkillProgress[];
  history: Array<{ eventId: string; title: string; status: string; date: string }>;
}

export type RecommendationMode = 'simple' | 'multifactor';

export interface RecommendationFactor {
  type: 'positive' | 'penalty';
  label: string;
  detail?: string;
}

export interface ModelScores {
  gradeGap?: number;
  historyPenalty?: number;
  skillUrgency?: number;
}

export interface AIRecommendation {
  eventId: string;
  title: string;
  targetSkillId: string;
  targetSkillName: string;
  predictedGain: number;
  priority: number;
  reason: string;
  breakdown: RecommendationFactor[];
  modelScores?: ModelScores;
  source: 'llm' | 'algorithm';
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
  laggingSkills: Array<{ skillId: string; skillName: string; affectedEmployees: number; totalGap: number }>;
  employeesAtRisk: HrEmployeeSummary[];
  withoutRecommendations: Array<{ id: string; name: string }>;
  participationByActivity: Array<{ eventId: string; title: string; completed: number; skipped: number; refused: number }>;
}

export interface SimulationResult {
  employeeId: string;
  name: string;
  currentRole: string;
  currentGrade: string;
  targetRole: string;
  targetGrade: string;
  readinessScore: number;
  availableRoles: string[];
  availableGrades: string[];
  skills: SkillProgress[];
  recommendations: AIRecommendation[];
  ignoredSkills: Array<{ skillId: string; skillName: string; missedOrRefused: number }>;
}

export interface GroupTrainingPlan {
  title: string;
  summary: string;
  modules: Array<{ title: string; description: string }>;
  invitationText: string;
}

export interface GroupTraining {
  skillId: string;
  skillName: string;
  totalGap: number;
  affectedCount: number;
  affected: Array<{ id: string; name: string; role: string; currentGrade: string; targetGrade: string; currentLevel: number; requiredLevel: number; gap: number; readinessScore: number }>;
  suggestedEvents: Array<{ eventId: string; title: string; type: string; gain: number; maxLevel: number }>;
  plan: GroupTrainingPlan;
}
