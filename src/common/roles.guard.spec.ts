import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { EmployeeController } from '../modules/employee/employee.controller';
import { ActivitiesController } from '../modules/employee/activities.controller';
import { EmployeeService } from '../modules/employee/employee.service';
import { HrController } from '../modules/hr/hr.controller';
import { HrService } from '../modules/hr/hr.service';
import { DatasetController } from '../modules/import/dataset.controller';
import { ImportService } from '../modules/import/import.service';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return { ok: true };
  }
}

@Controller('role-override')
@Roles('hr')
class RoleOverrideController {
  @Get()
  @Roles('employee')
  employeeOnly() {
    return { ok: true };
  }
}

describe('Header role authorization (HTTP)', () => {
  let app: INestApplication;
  const employeeService = {
    getProfile: jest.fn().mockResolvedValue({ id: 'E0028' }),
    getRecommendations: jest.fn().mockResolvedValue([]),
    completeActivity: jest.fn().mockResolvedValue({ success: true }),
  };
  const hrService = {
    getAnalytics: jest.fn().mockResolvedValue({}),
    getEmployees: jest.fn().mockResolvedValue([]),
  };
  const importService = {
    importFullDataset: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EmployeeController, ActivitiesController, HrController, DatasetController, HealthController, RoleOverrideController],
      providers: [
        { provide: EmployeeService, useValue: employeeService },
        { provide: HrService, useValue: hrService },
        { provide: ImportService, useValue: importService },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => { await app?.close(); });

  it.each(['', '/recommendations'])('allows employee own profile endpoint %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/api/employees/E0028${suffix}`)
      .set('X-Role', 'employee').set('X-Employee-Id', 'E0028').expect(200);
    const service = suffix ? employeeService.getRecommendations : employeeService.getProfile;
    expect(service).toHaveBeenCalledWith('E0028', 'E0028');
  });

  it('defaults a missing role to employee for an owned profile', async () => {
    await request(app.getHttpServer()).get('/api/employees/E0028')
      .set('X-Employee-Id', 'E0028').expect(200);
  });

  it.each(['', '/recommendations'])('rejects another employee before calling the service %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/api/employees/E0029${suffix}`)
      .set('X-Role', 'employee').set('X-Employee-Id', 'E0028').expect(403);
    expect(employeeService.getProfile).not.toHaveBeenCalled();
    expect(employeeService.getRecommendations).not.toHaveBeenCalled();
  });

  it.each(['', '/recommendations'])('does not invent an employee identity %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/api/employees/E0028${suffix}`).expect(403);
    expect(employeeService.getProfile).not.toHaveBeenCalled();
    expect(employeeService.getRecommendations).not.toHaveBeenCalled();
  });

  it.each(['', '/recommendations'])('allows HR to inspect any employee %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/api/employees/E0029${suffix}`)
      .set('X-Role', 'hr').set('X-Employee-Id', 'E0028').expect(200);
    const service = suffix ? employeeService.getRecommendations : employeeService.getProfile;
    // Existing service ownership checks receive the profile owner for an authorized HR request.
    expect(service).toHaveBeenCalledWith('E0029', 'E0029');
  });

  it.each(['', '/recommendations'])('allows HR profile access without employee identity %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/api/employees/E0029${suffix}`)
      .set('X-Role', 'hr').expect(200);
    const service = suffix ? employeeService.getRecommendations : employeeService.getProfile;
    expect(service).toHaveBeenCalledWith('E0029', 'E0029');
  });

  it.each(['', '/recommendations'])('protects short employee aliases %s', async (suffix) => {
    await request(app.getHttpServer()).get(`/employees/E0028${suffix}`)
      .set('X-Employee-Id', 'E0029').expect(403);
    expect(employeeService.getProfile).not.toHaveBeenCalled();
    expect(employeeService.getRecommendations).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get(`/employees/E0028${suffix}`)
      .set('X-Employee-Id', 'E0028').expect(200);
    await request(app.getHttpServer()).get(`/employees/E0028${suffix}`)
      .set('X-Role', 'hr').expect(200);
  });

  it.each(['/api/hr/analytics', '/api/hr/employees', '/hr/analytics', '/hr/employees'])('restricts %s to HR', async (path) => {
    await request(app.getHttpServer()).get(path).expect(403);
    await request(app.getHttpServer()).get(path).set('X-Role', 'employee').expect(403);
    expect(hrService.getAnalytics).not.toHaveBeenCalled();
    expect(hrService.getEmployees).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get(path).set('X-Role', 'hr').expect(200);
  });

  it.each(['/api/hr/import', '/hr/import', '/dataset/load', '/api/dataset/load'])('restricts dataset writes at %s to HR', async (path) => {
    await request(app.getHttpServer()).post(path).send({ employees: [] }).expect(403);
    await request(app.getHttpServer()).post(path).set('X-Role', 'employee').send({ employees: [] }).expect(403);
    expect(importService.importFullDataset).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post(path).set('X-Role', 'hr').send({ employees: [] }).expect(201);
    expect(importService.importFullDataset).toHaveBeenCalledWith({ employees: [] });
  });

  it.each(['admin', 'HR', 'EMPLOYEE', ''])('rejects unknown role %s even without Roles metadata', async (role) => {
    const response = await request(app.getHttpServer()).get('/health').set('X-Role', role).expect(403);
    expect(response.body.message).toBe('Unknown role');
  });

  it('allows known and default roles on a route without role metadata', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/health').set('X-Role', 'hr').expect(200);
  });

  it('lets method role metadata override controller role metadata', async () => {
    await request(app.getHttpServer()).get('/role-override').set('X-Role', 'employee').expect(200);
    await request(app.getHttpServer()).get('/role-override').set('X-Role', 'hr').expect(403);
  });

  it.each(['/api/activities/complete', '/api/employees/activities/complete'])('denies HR activity completion at %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'hr')
      .set('X-Employee-Id', 'E0028').send({ employeeId: 'E0028', eventId: 'EV1' }).expect(403);
    expect(employeeService.completeActivity).not.toHaveBeenCalled();
  });

  it.each(['/api/activities/complete', '/api/employees/activities/complete'])('rejects completion ownership mismatch at %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'employee')
      .set('X-Employee-Id', 'E0028').send({ employeeId: 'E0029', eventId: 'EV1' }).expect(403);
    expect(employeeService.completeActivity).not.toHaveBeenCalled();
  });

  it.each(['/api/activities/complete', '/api/employees/activities/complete'])('requires employee identity for completion at %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'employee')
      .send({ employeeId: 'E0028', eventId: 'EV1' }).expect(403);
    expect(employeeService.completeActivity).not.toHaveBeenCalled();
  });

  it.each(['/api/activities/complete', '/api/employees/activities/complete'])('preserves own activity completion at %s', async (path) => {
    await request(app.getHttpServer()).post(path).set('X-Role', 'employee')
      .set('X-Employee-Id', 'E0028').send({ employeeId: 'E0028', eventId: 'EV1' }).expect(201);
    expect(employeeService.completeActivity).toHaveBeenCalledWith('E0028', 'EV1');
  });
});
