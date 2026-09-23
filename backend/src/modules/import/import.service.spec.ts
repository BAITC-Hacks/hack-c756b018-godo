import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ImportService } from './import.service';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { Employee } from '../../entities/employee.entity';
import { Event } from '../../entities/event.entity';

describe('ImportService partial imports', () => {
  const save = jest.fn(async (_entity: unknown, value: unknown) => value);
  const manager = { find: jest.fn(async (entity: unknown) => entity === Employee ? [{ id: 'E1' }] : entity === Event ? [{ id: 'EV1' }] : []), save, delete: jest.fn() };
  const runner = { connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(), manager };
  const service = new ImportService({ createQueryRunner: () => runner } as unknown as DataSource);

  beforeEach(() => jest.clearAllMocks());

  it('imports a CSV history payload without replacing employee profiles', async () => {
    await service.importFullDataset({ history: [{ employee_id: 'E1', event_id: 'EV1', status: 'completed', date: '2026-01-02' }] });
    expect(save).toHaveBeenCalledWith(ActivityHistory, expect.objectContaining({ employeeId: 'E1', eventId: 'EV1', status: 'completed' }));
    expect(save).not.toHaveBeenCalledWith(Employee, expect.anything());
    expect(manager.delete).not.toHaveBeenCalled();
    expect(runner.commitTransaction).toHaveBeenCalled();
  });

  it('rejects an empty import with a useful message', async () => {
    await expect(service.importFullDataset({})).rejects.toThrow(BadRequestException);
  });

  it('explains when CSV refers to profiles or events that have not been loaded', async () => {
    await expect(service.importFullDataset({ history: [{ employee_id: 'OTHER', event_id: 'EV1', status: 'completed' }] }))
      .rejects.toThrow('Сначала загрузите профили и активности');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
});
