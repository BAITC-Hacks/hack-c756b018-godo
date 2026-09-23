import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { Skill } from '../../entities/skill.entity';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Event } from '../../entities/event.entity';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { ImportDatasetDto } from '../hr/dto/import-dataset.dto';
import { ActivityStatus } from '../../common/enums/activity-status.enum';

const GRADE_ORDER = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'Principal'];
function nextGrade(grade: string) {
  const index = GRADE_ORDER.findIndex((value) => value.toLowerCase() === grade.toLowerCase());
  return index >= 0 && index < GRADE_ORDER.length - 1 ? GRADE_ORDER[index + 1] : grade;
}
function requiredLevel(skill: any, role: string, grade: string): number {
  const matrix = skill?.requirements || skill?.grade_requirements || skill?.requirements_by_grade || skill?.levels || {};
  const byRole = matrix[role] || matrix[role?.toLowerCase()] || matrix;
  const value = byRole?.[grade] ?? byRole?.[grade?.toLowerCase()] ?? skill?.required_level ?? skill?.requiredLevel;
  return Math.max(0, Math.min(5, Number(typeof value === 'object' ? value?.level ?? value?.required_level : value) || 0));
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private dataSource: DataSource) {}

  async importFullDataset(dto: ImportDatasetDto) {
    const skills = dto.skills ?? [];
    const events = dto.events ?? [];
    const employees = dto.employees ?? [];
    const history = dto.history ?? [];
    if (![skills, events, employees, history].some((items) => items.length > 0)) {
      throw new BadRequestException('Выберите хотя бы один непустой файл для импорта');
    }
    for (const [index, row] of history.entries()) {
      if (!row.employee_id || !row.event_id || !Object.values(ActivityStatus).includes(String(row.status).toLowerCase() as ActivityStatus)) {
        throw new BadRequestException(`Некорректная строка истории ${index + 1}: нужны employee_id, event_id и status (completed, skipped, refused)`);
      }
      if (row.date && Number.isNaN(new Date(row.date).getTime())) {
        throw new BadRequestException(`Некорректная дата в строке истории ${index + 1}`);
      }
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSkills = await queryRunner.manager.find(Skill);
      const skillsById = new Map(existingSkills.map((skill) => [skill.id, skill as any]));
      for (const skill of skills) skillsById.set(skill.id || skill.skill_id, skill);
      // 1. Сохраняем навыки
      for (const s of skills) {
        await queryRunner.manager.save(Skill, {
          id: s.id || s.skill_id,
          name: s.name || s.title || s.id || s.skill_id,
          category: s.category || 'hard',
          requirements: s.requirements || s.grade_requirements || s.requirements_by_grade || s.levels || null,
        });
      }

      // 2. Сохраняем события
      for (const ev of events) {
        await queryRunner.manager.save(Event, {
          id: ev.id || ev.event_id,
          title: ev.title,
          type: ev.type || 'training',
          targetAudience: ev.target_audience || ev.targetAudience || ['all'],
          skillsDeveloped: (ev.skills_developed || ev.skillsDeveloped || []).map((skill: any) => ({
            skillId: skill.skillId || skill.skill_id,
            gain: Number(skill.gain) || 1,
            maxLevel: Number(skill.maxLevel ?? skill.max_level ?? 5),
          })),
        });
      }

      // 3. Сохраняем сотрудников и их навыки
      for (const emp of employees) {
        const grade = emp.grade || emp.currentGrade || 'Middle';
        const targetGrade = emp.target_grade || emp.targetGrade || nextGrade(grade);
        const progress = Object.entries(emp.skills || {}).map(([id, level]) => {
          const required = requiredLevel(skillsById.get(id), emp.role, targetGrade);
          return { current: Number(level), required: required || Math.max(1, Math.min(5, Number(level) + 1)) };
        });
        const totalRequired = progress.reduce((sum, item) => sum + item.required, 0);
        const newEmp = await queryRunner.manager.save(Employee, {
          id: emp.employee_id || emp.id,
          name: emp.name || `Сотрудник ${emp.employee_id}`,
          role: emp.role,
          currentGrade: grade,
          targetGrade,
          tenureMonths: emp.tenure_months ?? emp.tenureMonths ?? 0,
          readinessScore: totalRequired ? Math.round(progress.reduce((sum, item) => sum + Math.min(item.current, item.required), 0) / totalRequired * 100) : 100,
        });

        await queryRunner.manager.delete(EmployeeSkill, { employeeId: newEmp.id });
        await queryRunner.manager.delete(ActivityHistory, { employeeId: newEmp.id });

        if (emp.skills) {
          for (const [skillId, level] of Object.entries(emp.skills)) {
            await queryRunner.manager.save(EmployeeSkill, {
              employeeId: newEmp.id,
              skillId: skillId,
              currentLevel: Number(level),
              requiredLevel: requiredLevel(skillsById.get(skillId), emp.role, targetGrade) || Math.max(1, Math.min(5, Number(level) + 1)),
            });
          }
        }
      }

      // 4. История
      if (history.length) {
        const knownEmployees = new Set((await queryRunner.manager.find(Employee)).map((item) => item.id));
        const knownEvents = new Set((await queryRunner.manager.find(Event)).map((item) => item.id));
        for (const h of history) {
          if (!knownEmployees.has(h.employee_id) || !knownEvents.has(h.event_id)) {
            throw new BadRequestException(`История ссылается на неизвестного сотрудника ${h.employee_id} или событие ${h.event_id}. Сначала загрузите профили и активности.`);
          }
          await queryRunner.manager.save(ActivityHistory, {
            employeeId: h.employee_id,
            eventId: h.event_id,
            status: String(h.status).toLowerCase() as ActivityStatus,
            date: h.date ? new Date(h.date) : new Date(),
          });
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log('Импорт датасета успешно выполнен');
      return { success: true, message: 'Данные успешно загружены' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Ошибка при импорте: ${err.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
