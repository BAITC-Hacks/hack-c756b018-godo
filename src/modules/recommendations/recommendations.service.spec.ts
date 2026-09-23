import { RecommendationsService } from './recommendations.service';
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
});
