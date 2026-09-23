import { EmployeeService } from './employee.service';
import { ActivityStatus } from '../../common/enums/activity-status.enum';

describe('EmployeeService activity flow', () => {
  const skill = { skillId: 'SK_SYSTEM', currentLevel: 2, requiredLevel: 4, skill: { name: 'System Design', category: 'hard' } };
  const event = { id: 'EV_WORKSHOP', title: 'System Design Workshop', skillsDeveloped: [{ skillId: 'SK_SYSTEM', gain: 1, maxLevel: 5 }] };

  function createService() {
    const employeeRepo = { findOne: jest.fn(), save: jest.fn(async (value: unknown) => value) };
    const skillRepo = { save: jest.fn(async (value: unknown) => value) };
    const eventRepo = { find: jest.fn(), findOne: jest.fn() };
    const historyRepo = { exists: jest.fn(), create: jest.fn((value: unknown) => value), save: jest.fn(async (value: unknown) => value) };
    const aiService = { generateExplainableRecommendations: jest.fn() };
    const service = new EmployeeService(employeeRepo as never, skillRepo as never, eventRepo as never, historyRepo as never, aiService as never);
    return { service, employeeRepo, skillRepo, eventRepo, historyRepo, aiService };
  }

  it('returns only unfinished, relevant recommendations with display metadata', async () => {
    const { service, employeeRepo, eventRepo, aiService } = createService();
    employeeRepo.findOne.mockResolvedValue({ id: 'E1', name: 'A', role: 'Engineer', currentGrade: 'Middle', targetGrade: 'Senior', tenureMonths: 12, skills: [skill], history: [{ eventId: 'EV_DONE', status: ActivityStatus.COMPLETED }] });
    eventRepo.find.mockResolvedValue([event, { ...event, id: 'EV_DONE' }]);
    aiService.generateExplainableRecommendations.mockResolvedValue([
      { eventId: 'EV_WORKSHOP', targetSkillId: 'SK_SYSTEM', predictedGain: 1, priority: 1, reason: 'Gap' },
      { eventId: 'EV_DONE', targetSkillId: 'SK_SYSTEM', predictedGain: 1, priority: 2, reason: 'Stale' },
    ]);

    const recommendations = await service.getRecommendations('E1', 'E1');

    expect(recommendations).toEqual([{ eventId: 'EV_WORKSHOP', title: 'System Design Workshop', targetSkillId: 'SK_SYSTEM', targetSkillName: 'System Design', predictedGain: 1, priority: 1, reason: 'Gap' }]);
    expect(aiService.generateExplainableRecommendations.mock.calls[0][3]).toEqual([event]);
  });

  it('returns updated skill metadata and readiness after completion', async () => {
    const { service, employeeRepo, eventRepo, historyRepo, skillRepo } = createService();
    const currentSkill = { ...skill };
    const employee = { id: 'E1', skills: [currentSkill], readinessScore: 50 };
    employeeRepo.findOne.mockResolvedValue(employee);
    eventRepo.findOne.mockResolvedValue(event);
    historyRepo.exists.mockResolvedValue(false);

    const result = await service.completeActivity('E1', 'EV_WORKSHOP');

    expect(result).toEqual({ success: true, newReadinessScore: 75, updatedSkills: [{ skillId: 'SK_SYSTEM', skillName: 'System Design', category: 'hard', currentLevel: 3, requiredLevel: 4 }] });
    expect(skillRepo.save).toHaveBeenCalledWith(expect.objectContaining({ currentLevel: 3 }));
    expect(historyRepo.save).toHaveBeenCalled();
  });

  it('does not award skill gains twice for the same activity', async () => {
    const { service, employeeRepo, eventRepo, historyRepo, skillRepo } = createService();
    employeeRepo.findOne.mockResolvedValue({ id: 'E1', skills: [{ ...skill }] });
    eventRepo.findOne.mockResolvedValue(event);
    historyRepo.exists.mockResolvedValue(true);

    await expect(service.completeActivity('E1', 'EV_WORKSHOP')).rejects.toThrow('Активность уже выполнена');
    expect(skillRepo.save).not.toHaveBeenCalled();
  });
});
