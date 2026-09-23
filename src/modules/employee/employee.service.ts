import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Event } from '../../entities/event.entity';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { AiService } from '../ai/ai.service';
import { AIRecommendation, CompleteActivityResponse } from '../../../types';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);
  constructor(
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeSkill) private empSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(ActivityHistory) private historyRepo: Repository<ActivityHistory>,
    private aiService: AiService,
  ) {}

  async getProfile(employeeId: string, requestorId: string) {
    // Приватность: сотрудник может смотреть только свой профиль
    if (employeeId !== requestorId) {
      throw new ForbiddenException('Приватность: вы не можете просматривать данные других сотрудников.');
    }

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['skills', 'skills.skill'],
    });

    if (!employee) throw new NotFoundException('Сотрудник не найден');

    return {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      currentGrade: employee.currentGrade,
      targetGrade: employee.targetGrade,
      tenureMonths: employee.tenureMonths,
      readinessScore: employee.readinessScore,
      history: (await this.historyRepo.find({ where: { employeeId }, relations: ['event'], order: { date: 'DESC' } })).map((h) => ({ eventId: h.eventId, title: h.event?.title || h.eventId, status: h.status, date: h.date })),
      skills: employee.skills.map((es) => ({
        skillId: es.skillId,
        skillName: es.skill?.name || es.skillId,
        category: es.skill?.category || 'hard',
        currentLevel: es.currentLevel,
        requiredLevel: es.requiredLevel,
      })),
    };
  }

  async getRecommendations(employeeId: string, requestorId: string) {
    if (employeeId !== requestorId) {
      throw new ForbiddenException('Приватность: просмотр рекомендаций ограничен.');
    }

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['skills', 'skills.skill', 'history', 'history.event'],
    });
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    const completedEventIds = new Set(employee.history.filter((entry) => entry.status === ActivityStatus.COMPLETED).map((entry) => entry.eventId));
    const skillGaps = new Set(employee.skills.filter((skill) => skill.currentLevel < skill.requiredLevel).map((skill) => skill.skillId));
    const availableEvents = (await this.eventRepo.find()).filter((event) =>
      !completedEventIds.has(event.id) && event.skillsDeveloped?.some((skill) => skillGaps.has(skill.skillId)),
    );
    if (availableEvents.length === 0) {
      this.logger.log(`Career AI skipped employeeId=${employeeId} reason=${skillGaps.size ? 'no_relevant_events' : 'no_skill_gaps'} skillGaps=${skillGaps.size}`);
      return [];
    }

    const targetRequirements = employee.skills.map((es) => ({
      skillId: es.skillId,
      requiredLevel: es.requiredLevel,
    }));

    const historyData = employee.history.map((h) => ({
      eventId: h.eventId,
      status: h.status,
      date: h.date,
      event: h.event,
    }));

    const recommendations = await this.aiService.generateExplainableRecommendations(
      {
        id: employee.id,
        role: employee.role,
        currentGrade: employee.currentGrade,
        targetGrade: employee.targetGrade,
        tenureMonths: employee.tenureMonths,
        skills: employee.skills.map((s) => ({ skillId: s.skillId, name: s.skill?.name || s.skillId, level: s.currentLevel })),
      },
      targetRequirements,
      historyData,
      availableEvents,
    );
    const availableIds = new Set(availableEvents.map((event) => event.id));
    return recommendations.filter((recommendation) => availableIds.has(recommendation.eventId)).slice(0, 3).map((recommendation): AIRecommendation => ({
      ...recommendation,
      title: availableEvents.find((event) => event.id === recommendation.eventId)?.title || recommendation.eventId,
      targetSkillName: employee.skills.find((skill) => skill.skillId === recommendation.targetSkillId)?.skill?.name || recommendation.targetSkillId,
    }));
  }

  async completeActivity(employeeId: string, eventId: string): Promise<CompleteActivityResponse> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['skills', 'skills.skill'],
    });
    const event = await this.eventRepo.findOne({ where: { id: eventId } });

    if (!employee || !event) throw new NotFoundException('Сотрудник или Активность не найдены');

    // Обновляем навыки
    const alreadyCompleted = await this.historyRepo.exists({ where: { employeeId, eventId, status: ActivityStatus.COMPLETED } });
    if (alreadyCompleted) throw new ConflictException('Активность уже выполнена');

    for (const dev of event.skillsDeveloped) {
      const empSkill = employee.skills.find((s) => s.skillId === dev.skillId);
      if (empSkill) {
        empSkill.currentLevel = Math.min(empSkill.currentLevel + dev.gain, dev.maxLevel ?? 5);
        await this.empSkillRepo.save(empSkill);
      }
    }

    // Добавляем историю
    const newHistory = this.historyRepo.create({
      employeeId,
      eventId,
      status: ActivityStatus.COMPLETED,
    });
    await this.historyRepo.save(newHistory);

    // Пересчитываем готовность
    const updatedEmployee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['skills', 'skills.skill'],
    });
    if (!updatedEmployee) throw new NotFoundException('Сотрудник не найден');

    let totalReq = 0;
    let totalCurr = 0;
    updatedEmployee.skills.forEach((s) => {
      totalReq += s.requiredLevel;
      totalCurr += Math.min(s.currentLevel, s.requiredLevel);
    });

    const newScore = totalReq > 0 ? Math.round((totalCurr / totalReq) * 100) : 100;
    updatedEmployee.readinessScore = newScore;
    await this.employeeRepo.save(updatedEmployee);

    return {
      success: true,
      newReadinessScore: newScore,
      updatedSkills: updatedEmployee.skills.map((s) => ({
        skillId: s.skillId,
        skillName: s.skill?.name || s.skillId,
        category: (s.skill?.category === 'soft' ? 'soft' : 'hard') as 'soft' | 'hard',
        currentLevel: s.currentLevel,
        requiredLevel: s.requiredLevel,
      })),
    };
  }
}
