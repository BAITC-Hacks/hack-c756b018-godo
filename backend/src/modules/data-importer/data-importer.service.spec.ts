import { DataImporterService } from './data-importer.service';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';

describe('DataImporterService startup', () => {
  it('loads the bundled dataset only into completely empty storage', async () => {
    const counts = new Map<unknown, number>([[EmployeeEntity, 0], [EventEntity, 0], [SkillRequirementEntity, 0]]);
    const dataSource = { getRepository: jest.fn((entity: unknown) => ({ count: jest.fn(async () => counts.get(entity) ?? 0) })) };
    const service = new DataImporterService(dataSource as never);
    const importer = jest.spyOn(service, 'importFromFiles').mockResolvedValue({ success: true, message: 'Dataset imported', counts: { employees: 2, events: 3, skills: 3, history: 4 } });
    await service.onApplicationBootstrap();
    expect(importer).toHaveBeenCalledTimes(1);
    counts.set(EmployeeEntity, 1);
    await service.onApplicationBootstrap();
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
