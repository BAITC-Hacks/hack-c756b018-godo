import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { ActivityHistoryEntity, ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';

@Injectable()
export class ProgressService {
  constructor(private readonly dataSource: DataSource) {}

  async completeEvent(employeeId: string, eventId: string): Promise<EmployeeEntity> {
    return this.dataSource.transaction(async (manager) => {
      const employee = await manager.getRepository(EmployeeEntity).findOne({ where: { id: employeeId }, lock: { mode: 'pessimistic_write' } });
      const event = await manager.getRepository(EventEntity).findOneBy({ id: eventId });
      if (!employee || !event) throw new NotFoundException('Сотрудник или активность не найдены');
      const history = manager.getRepository(ActivityHistoryEntity);
      if (await history.existsBy({ employeeId, eventId, status: ActivityHistoryStatus.COMPLETED })) throw new ConflictException('Активность уже выполнена');
      const currentLevel = employee.skills[event.targetSkillId] ?? 0;
      if (currentLevel >= event.maxLevel) throw new ConflictException('Навык уже достиг максимума для этой активности');
      employee.skills = { ...employee.skills, [event.targetSkillId]: Math.min(currentLevel + event.gain, event.maxLevel) };
      await manager.getRepository(EmployeeEntity).save(employee);
      await history.save(history.create({ employeeId, eventId, skillId: event.targetSkillId, status: ActivityHistoryStatus.COMPLETED, date: new Date() }));
      return employee;
    });
  }
}
