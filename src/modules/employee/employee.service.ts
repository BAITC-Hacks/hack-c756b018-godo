import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity } from '../../storage/entities/activity-history.entity';
import { readinessScore, targetRequirementsForEmployee } from '../../storage/grade-requirements';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(EventEntity) private readonly events: Repository<EventEntity>,
    @InjectRepository(SkillRequirementEntity) private readonly requirements: Repository<SkillRequirementEntity>,
    @InjectRepository(ActivityHistoryEntity) private readonly histories: Repository<ActivityHistoryEntity>,
    private readonly recommendations: RecommendationsService,
    private readonly progress: ProgressService,
  ) {}
  private checkAccess(employeeId: string, requestorId: string) {
    if (employeeId !== requestorId) throw new ForbiddenException('Доступ к данным другого сотрудника запрещён');
  }
  async getProfile(employeeId: string, requestorId: string) {
    this.checkAccess(employeeId, requestorId);
    const employee = await this.employees.findOneBy({ id: employeeId });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    const [requirements, history, events] = await Promise.all([this.requirements.find(), this.histories.find({ where: { employeeId }, order: { date: 'DESC' } }), this.events.find()]);
    const target = targetRequirementsForEmployee(requirements, employee.role, employee.targetGrade);
    const eventById = new Map(events.map((event) => [event.id, event]));
    const requirementById = new Map(requirements.map((requirement) => [requirement.skillId, requirement]));
    const skillIds = new Set([...Object.keys(employee.skills), ...target.keys()]);
    return { id: employee.id, name: employee.name, role: employee.role, currentGrade: employee.currentGrade, targetGrade: employee.targetGrade, tenureMonths: employee.tenureMonths, readinessScore: readinessScore(employee.skills, target), skills: [...skillIds].map((skillId) => ({ skillId, skillName: requirementById.get(skillId)?.name ?? skillId, category: requirementById.get(skillId)?.category === 'soft' ? 'soft' : 'hard', currentLevel: employee.skills[skillId] ?? 0, requiredLevel: target.get(skillId)?.level ?? 0 })), history: history.map((entry) => ({ eventId: entry.eventId, title: eventById.get(entry.eventId)?.title ?? entry.eventId, status: entry.status.toLowerCase(), date: entry.date })) };
  }
  async getRecommendations(employeeId: string, requestorId: string) {
    this.checkAccess(employeeId, requestorId);
    return this.recommendations.getRecommendationsForEmployee(employeeId);
  }
  async completeEvent(employeeId: string, eventId: string, requestorId: string) {
    this.checkAccess(employeeId, requestorId);
    await this.progress.completeEvent(employeeId, eventId);
    return this.getProfile(employeeId, requestorId);
  }
  async completeActivity(employeeId: string, eventId: string) {
    const profile = await this.completeEvent(employeeId, eventId, employeeId);
    return { success: true, newReadinessScore: profile.readinessScore, updatedSkills: profile.skills };
  }
}
