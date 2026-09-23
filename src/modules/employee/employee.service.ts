import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Event } from '../../entities/event.entity';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { ActivityStatus } from '../../common/enums/activity-status.enum';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EmployeeService {
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

    const availableEvents = await this.eventRepo.find();

    const targetRequirements = employee.skills.map((es) => ({
      skillId: es.skillId,
      requiredLevel: es.requiredLevel,
    }));

    const historyData = employee.history.map((h) => ({
      eventId: h.eventId,
      status: h.status,
      date: h.date,
    }));

    return this.aiService.generateExplainableRecommendations(
      {
        id: employee.id,
        role: employee.role,
        currentGrade: employee.currentGrade,
        targetGrade: employee.targetGrade,
        tenureMonths: employee.tenureMonths,
        skills: employee.skills.map((s) => ({ skillId: s.skillId, level: s.currentLevel })),
      },
      targetRequirements,
      historyData,
      availableEvents,
    );
  }

  async completeActivity(employeeId: string, eventId: string) {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['skills'],
    });
    const event = await this.eventRepo.findOne({ where: { id: eventId } });

    if (!employee || !event) throw new NotFoundException('Сотрудник или Активность не найдены');

    // Обновляем навыки
    for (const dev of event.skillsDeveloped) {
      const empSkill = employee.skills.find((s) => s.skillId === dev.skillId);
      if (empSkill) {
        empSkill.currentLevel = Math.min(empSkill.currentLevel + dev.gain, dev.maxLevel);
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
      relations: ['skills'],
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
        currentLevel: s.currentLevel,
        requiredLevel: s.requiredLevel,
      })),
    };
  }
}
