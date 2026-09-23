import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Employee } from '../../entities/employee.entity';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(EmployeeSkill) private empSkillRepo: Repository<EmployeeSkill>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

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
      .orderBy('affectedEmployees', 'DESC')
      .getRawMany();

    // Сотрудники с низким рейтингом готовности
    const employeesAtRisk = await this.employeeRepo.find({
      where: {},
      order: { readinessScore: 'ASC' },
      take: 10,
    });

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
    };
  }
}
