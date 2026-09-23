import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { Skill } from '../../entities/skill.entity';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Event } from '../../entities/event.entity';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { ImportDatasetDto } from '../hr/dto/import-dataset.dto';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private dataSource: DataSource) {}

  async importFullDataset(dto: ImportDatasetDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Сохраняем навыки
      for (const s of dto.skills) {
        await queryRunner.manager.save(Skill, {
          id: s.id,
          name: s.name,
          category: s.category || 'hard',
        });
      }

      // 2. Сохраняем события
      for (const ev of dto.events) {
        await queryRunner.manager.save(Event, {
          id: ev.id || ev.event_id,
          title: ev.title,
          type: ev.type || 'training',
          targetAudience: ev.target_audience || ['Middle'],
          skillsDeveloped: (ev.skills_developed || ev.skillsDeveloped || []).map((skill: any) => ({
            skillId: skill.skillId || skill.skill_id,
            gain: Number(skill.gain) || 1,
            maxLevel: Number(skill.maxLevel || skill.max_level) || 5,
          })),
        });
      }

      // 3. Сохраняем сотрудников и их навыки
      for (const emp of dto.employees) {
        const newEmp = await queryRunner.manager.save(Employee, {
          id: emp.employee_id || emp.id,
          name: emp.name || `Сотрудник ${emp.employee_id}`,
          role: emp.role,
          currentGrade: emp.grade || 'Middle',
          targetGrade: 'Senior',
          tenureMonths: emp.tenure_months || 12,
          readinessScore: emp.skills && Object.keys(emp.skills).length > 0
            ? Math.round(Object.values(emp.skills).reduce<number>((sum, level) => sum + Math.min(Number(level), 4), 0) / (Object.keys(emp.skills).length * 4) * 100)
            : 0,
        });

        await queryRunner.manager.delete(EmployeeSkill, { employeeId: newEmp.id });
        await queryRunner.manager.delete(ActivityHistory, { employeeId: newEmp.id });

        if (emp.skills) {
          for (const [skillId, level] of Object.entries(emp.skills)) {
            await queryRunner.manager.save(EmployeeSkill, {
              employeeId: newEmp.id,
              skillId: skillId,
              currentLevel: Number(level),
              requiredLevel: 4, // Базовое требование для теста
            });
          }
        }
      }

      // 4. История
      if (dto.history) {
        for (const h of dto.history) {
          await queryRunner.manager.save(ActivityHistory, {
            employeeId: h.employee_id,
            eventId: h.event_id,
            status: h.status,
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
