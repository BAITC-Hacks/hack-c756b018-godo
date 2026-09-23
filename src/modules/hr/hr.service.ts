import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Employee } from '../../entities/employee.entity';
import { Event } from '../../entities/event.entity';
import { ActivityStatus } from '../../common/enums/activity-status.enum';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(EmployeeSkill) private empSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
  ) {}

  async getEmployees() {
    const [employees, events] = await Promise.all([
      this.employeeRepo.find({ order: { name: 'ASC' }, relations: ['skills', 'history'] }),
      this.eventRepo.find(),
    ]);
    return employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      currentGrade: employee.currentGrade,
      targetGrade: employee.targetGrade,
      tenureMonths: employee.tenureMonths,
      readinessScore: employee.readinessScore,
      hasRecommendations: events.some((event) =>
        !employee.history.some((entry) => entry.eventId === event.id && entry.status === ActivityStatus.COMPLETED) &&
        event.skillsDeveloped?.some((developed) => employee.skills.some((skill) => skill.skillId === developed.skillId && skill.currentLevel < skill.requiredLevel)),
      ),
    }));
  }

  async getAnalytics() {
    // Вычисляем проседающие компетенции
    const rawGaps = await this.empSkillRepo
      .createQueryBuilder('es')
      .leftJoinAndSelect('es.skill', 'skill')
      .select('es.skillId', 'skillId')
      .addSelect('skill.name', 'skillName')
      .addSelect('COUNT(*)', 'affectedEmployees')
      .where('es.currentLevel < es.requiredLevel')
      .groupBy('es.skillId')
      .addGroupBy('skill.name')
      .orderBy('"affectedEmployees"', 'DESC')
      .getRawMany();

    // Сотрудники с низким рейтингом готовности
    const employeesAtRisk = await this.employeeRepo.find({
      where: {},
      order: { readinessScore: 'ASC' },
      take: 10,
    });

    const employees = await this.getEmployees();
    const participation = await this.employeeRepo.find({ relations: ['history'] });
    const counts = new Map<string, { completed: number; skipped: number; refused: number }>();
    for (const employee of participation) for (const item of employee.history) {
      const count = counts.get(item.eventId) || { completed: 0, skipped: 0, refused: 0 };
      if (item.status === ActivityStatus.COMPLETED) count.completed++;
      if (item.status === ActivityStatus.SKIPPED) count.skipped++;
      if (item.status === ActivityStatus.REFUSED) count.refused++;
      counts.set(item.eventId, count);
    }
    const events = await this.eventRepo.find();
    return {
      laggingSkills: rawGaps.map((g) => ({
        skillId: g.skillId,
        skillName: g.skillName || g.skillId,
        affectedEmployees: Number(g.affectedEmployees),
      })),
      employeesAtRisk: employeesAtRisk.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        currentGrade: e.currentGrade,
        readinessScore: e.readinessScore,
      })),
      withoutRecommendations: employees.filter((employee) => !employee.hasRecommendations).map((employee) => ({ id: employee.id, name: employee.name })),
      participationByActivity: events.map((event) => ({ eventId: event.id, title: event.title, ...(counts.get(event.id) || { completed: 0, skipped: 0, refused: 0 }) })),
    };
  }
}
