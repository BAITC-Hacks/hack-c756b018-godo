import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity, ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';
import { readinessScore, targetRequirementsForEmployee } from '../../storage/grade-requirements';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(EventEntity) private readonly events: Repository<EventEntity>,
    @InjectRepository(SkillRequirementEntity) private readonly requirements: Repository<SkillRequirementEntity>,
    @InjectRepository(ActivityHistoryEntity) private readonly histories: Repository<ActivityHistoryEntity>,
    private readonly recommendations: RecommendationsService,
  ) {}

  private async calculate() {
    const [employees, requirements, events, histories] = await Promise.all([this.employees.find(), this.requirements.find(), this.events.find(), this.histories.find()]);
    const historyByEmployee = new Map<string, ActivityHistoryEntity[]>();
    for (const item of histories) historyByEmployee.set(item.employeeId, [...(historyByEmployee.get(item.employeeId) ?? []), item]);
    const gaps = new Map<string, { skillId: string; skillName: string; totalGap: number; affectedEmployees: number }>();
    const summaries = employees.map((employee) => {
      const target = targetRequirementsForEmployee(requirements, employee.role, employee.targetGrade);
      for (const [skillId, requirement] of target) {
        const gap = Math.max(0, requirement.level - (employee.skills[skillId] ?? 0));
        if (!gap) continue;
        const aggregate = gaps.get(skillId) ?? { skillId, skillName: requirement.name, totalGap: 0, affectedEmployees: 0 };
        aggregate.totalGap += gap; aggregate.affectedEmployees++;
        gaps.set(skillId, aggregate);
      }
      return { id: employee.id, name: employee.name, role: employee.role, currentGrade: employee.currentGrade, targetGrade: employee.targetGrade, tenureMonths: employee.tenureMonths, readinessScore: readinessScore(employee.skills, target), hasRecommendations: this.recommendations.selectTopCandidates(employee, requirements, historyByEmployee.get(employee.id) ?? [], events).length > 0 };
    });
    return { summaries, gaps, events, histories };
  }
  async getEmployees() { return (await this.calculate()).summaries.sort((first, second) => first.name.localeCompare(second.name)); }
  async getAnalytics() {
    const { summaries, gaps, events, histories } = await this.calculate();
    const counts = new Map<string, { completed: number; skipped: number; refused: number }>();
    for (const item of histories) {
      const count = counts.get(item.eventId) ?? { completed: 0, skipped: 0, refused: 0 };
      if (item.status === ActivityHistoryStatus.COMPLETED) count.completed++;
      if (item.status === ActivityHistoryStatus.MISSED) count.skipped++;
      if (item.status === ActivityHistoryStatus.REFUSED) count.refused++;
      counts.set(item.eventId, count);
    }
    return { laggingSkills: [...gaps.values()].sort((first, second) => second.totalGap - first.totalGap || first.skillId.localeCompare(second.skillId)).slice(0, 5), withoutRecommendations: summaries.filter((employee) => !employee.hasRecommendations).map(({ id, name }) => ({ id, name })), employeesAtRisk: [...summaries].sort((first, second) => first.readinessScore - second.readinessScore).slice(0, 10), participationByActivity: events.map((event) => ({ eventId: event.id, title: event.title, ...(counts.get(event.id) ?? { completed: 0, skipped: 0, refused: 0 }) })) };
  }
}
