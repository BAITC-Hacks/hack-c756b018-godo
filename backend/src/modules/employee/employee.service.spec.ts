import { ForbiddenException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import type { EmployeeEntity } from '../../storage/entities/employee.entity';

describe('Employee profile access by role', () => {
  const employee = { id: 'E0031', name: 'Данияр', role: 'Backend Engineer', currentGrade: 'Junior', targetGrade: 'Middle', tenureMonths: 18, skills: { SK_PYTHON: 2 } } as EmployeeEntity;
  const service = new EmployeeService(
    { findOneBy: jest.fn(async () => employee) } as never,
    { find: jest.fn(async () => []) } as never,
    { find: jest.fn(async () => []) } as never,
    { find: jest.fn(async () => []) } as never,
    {} as never,
    {} as never,
  );

  it('does not reveal another employee profile to an employee', async () => {
    await expect(service.getProfile('E0031', 'E0028', 'EMPLOYEE')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets HR inspect a profile without completing events or requesting AI', async () => {
    const profile = await service.getProfile('E0031', 'HR_DEMO', 'HR');
    expect(profile.id).toBe('E0031');
    expect(profile.skills[0].currentLevel).toBe(2);
  });
});
