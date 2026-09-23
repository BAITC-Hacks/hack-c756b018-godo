import { ConflictException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { ActivityHistoryEntity, ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';

describe('ProgressService transaction', () => {
  function setup(alreadyCompleted = false) {
    const employee = { id: 'E0028', name: 'Айдана', role: 'Backend Engineer', currentGrade: 'Middle', targetGrade: 'Senior', tenureMonths: 52, skills: { SK_SYSTEM: 2 } } as EmployeeEntity;
    const event = { id: 'EV_SYSTEM', targetSkillId: 'SK_SYSTEM', gain: 2, maxLevel: 3 } as EventEntity;
    const saveEmployee = jest.fn(async (value: EmployeeEntity) => value);
    const saveHistory = jest.fn(async (value: ActivityHistoryEntity) => value);
    const manager = { getRepository: jest.fn((entity: unknown) => {
      if (entity === EmployeeEntity) return { findOne: jest.fn(async () => employee), save: saveEmployee };
      if (entity === EventEntity) return { findOneBy: jest.fn(async () => event) };
      return { existsBy: jest.fn(async () => alreadyCompleted), create: jest.fn((value: ActivityHistoryEntity) => value), save: saveHistory };
    }) };
    const dataSource = { transaction: jest.fn(async (callback: (value: typeof manager) => Promise<unknown>) => callback(manager)) };
    return { service: new ProgressService(dataSource as never), employee, saveEmployee, saveHistory };
  }
  it('caps gain and records completion inside one transaction', async () => {
    const { service, saveEmployee, saveHistory } = setup();
    const result = await service.completeEvent('E0028', 'EV_SYSTEM');
    expect(result.skills.SK_SYSTEM).toBe(3);
    expect(saveEmployee).toHaveBeenCalledTimes(1);
    expect(saveHistory).toHaveBeenCalledWith(expect.objectContaining({ status: ActivityHistoryStatus.COMPLETED, skillId: 'SK_SYSTEM' }));
  });
  it('rejects duplicate completion before changing skills', async () => {
    const { service, saveEmployee, saveHistory } = setup(true);
    await expect(service.completeEvent('E0028', 'EV_SYSTEM')).rejects.toBeInstanceOf(ConflictException);
    expect(saveEmployee).not.toHaveBeenCalled();
    expect(saveHistory).not.toHaveBeenCalled();
  });
});
