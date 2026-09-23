import { RecommendationsService } from './recommendations.service';
import { UnprocessableEntityException } from '@nestjs/common';
import { ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';
import type { EmployeeEntity } from '../../storage/entities/employee.entity';
import type { EventEntity } from '../../storage/entities/event.entity';
import type { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import type { ActivityHistoryEntity } from '../../storage/entities/activity-history.entity';

describe('RecommendationsService multi-factor prefilter', () => {
  const employee = { id: 'E0028', name: 'Айдана', role: 'Backend Engineer', currentGrade: 'Middle', targetGrade: 'Senior', tenureMonths: 52, skills: { SK_SYSTEM: 2, SK_SPEAK: 1 } } as EmployeeEntity;
  const requirements = [
    { skillId: 'SK_SYSTEM', name: 'System Design', category: 'hard', requirementsByGrade: { Senior: 4 } },
    { skillId: 'SK_SPEAK', name: 'Public Speaking', category: 'soft', requirementsByGrade: { Senior: 2 } },
  ] as SkillRequirementEntity[];
  const events = [
    { id: 'EV_SYSTEM', title: 'System Design Lab', targetSkillId: 'SK_SYSTEM', gain: 1, maxLevel: 5, audience: ['Middle'], type: 'workshop' },
    { id: 'EV_SPEAK', title: 'Speaking Club', targetSkillId: 'SK_SPEAK', gain: 1, maxLevel: 5, audience: ['Middle'], type: 'club' },
  ] as EventEntity[];
  const histories = [1, 2, 3].map((number) => ({ employeeId: employee.id, eventId: 'EV_SPEAK', skillId: 'SK_SPEAK', status: ActivityHistoryStatus.MISSED, date: new Date(`2026-0${number}-01`) })) as ActivityHistoryEntity[];
  const service = new RecommendationsService({} as never, {} as never, {} as never, {} as never);

  it('excludes repeatedly missed skill despite its low current level', () => {
    expect(service.selectTopCandidates(employee, requirements, histories, events).map((candidate) => candidate.event.id)).toEqual(['EV_SYSTEM']);
  });

  it('enforces event max level and completed-event exclusion', () => {
    const completed = { ...histories[0], eventId: 'EV_SYSTEM', skillId: 'SK_SYSTEM', status: ActivityHistoryStatus.COMPLETED } as ActivityHistoryEntity;
    expect(service.selectTopCandidates(employee, requirements, [completed], events).map((candidate) => candidate.event.id)).toEqual(['EV_SPEAK']);
    const capped = { ...events[0], maxLevel: 2 } as EventEntity;
    expect(service.selectTopCandidates(employee, requirements, [], [capped]).length).toBe(0);
  });

  it('reports incomplete storage before attempting an OpenAI request', async () => {
    const employeeRepository = { findOneBy: jest.fn(async () => ({ ...employee, skills: {} })) };
    const eventsRepository = { find: jest.fn(async () => []) };
    const requirementsRepository = { find: jest.fn(async () => []) };
    const historyRepository = { findBy: jest.fn(async () => []) };
    const recommendations = new RecommendationsService(employeeRepository as never, eventsRepository as never, requirementsRepository as never, historyRepository as never);
    await expect(recommendations.getRecommendationsForEmployee('E0028')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(employeeRepository.findOneBy).toHaveBeenCalledWith({ id: 'E0028' });
  });

  it('sends only eligible candidates to OpenAI and returns a grounded recommendation', async () => {
    const previousProvider = process.env.AI_PROVIDER;
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const response = new Response(JSON.stringify({ usage: { total_tokens: 20 }, choices: [{ message: { content: JSON.stringify({ recommendations: [{ eventId: 'EV_SYSTEM', reason: 'Следующий шаг к Senior.' }] }) } }] }), { status: 200, headers: { 'x-request-id': 'request-test' } });
    const request = jest.spyOn(global, 'fetch').mockResolvedValue(response);
    try {
      const recommendations = new RecommendationsService(
        { findOneBy: jest.fn(async () => employee) } as never,
        { find: jest.fn(async () => events) } as never,
        { find: jest.fn(async () => requirements) } as never,
        { findBy: jest.fn(async () => histories) } as never,
      );
      const result = await recommendations.getRecommendationsForEmployee('E0028');
      expect(request).toHaveBeenCalledTimes(1);
      const body = JSON.parse((request.mock.calls[0][1] as RequestInit).body as string) as { messages: Array<{ content: string }> };
      const context = JSON.parse(body.messages[1].content) as { candidates: Array<{ eventId: string }> };
      expect(context.candidates.map((candidate) => candidate.eventId)).toEqual(['EV_SYSTEM']);
      expect(result).toHaveLength(1);
      expect(result[0].reason).toContain('2 из требуемых 4');
    } finally {
      request.mockRestore();
      if (previousProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previousProvider;
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    }
  });
});
