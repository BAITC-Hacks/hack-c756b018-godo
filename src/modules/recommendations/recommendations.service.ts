import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity, ActivityHistoryStatus } from '../../storage/entities/activity-history.entity';
import { targetRequirementsForEmployee } from '../../storage/grade-requirements';

export interface RecommendationCandidate {
  event: EventEntity;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  skillGap: number;
  missedOrRefused: number;
  completedForSkill: number;
  priority: number;
}
export interface Recommendation {
  eventId: string; title: string; targetSkillId: string; targetSkillName: string;
  predictedGain: number; priority: number; reason: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  constructor(
    @InjectRepository(EmployeeEntity) private readonly employees: Repository<EmployeeEntity>,
    @InjectRepository(EventEntity) private readonly events: Repository<EventEntity>,
    @InjectRepository(SkillRequirementEntity) private readonly requirements: Repository<SkillRequirementEntity>,
    @InjectRepository(ActivityHistoryEntity) private readonly history: Repository<ActivityHistoryEntity>,
  ) {}

  selectTopCandidates(employee: EmployeeEntity, requirements: SkillRequirementEntity[], history: ActivityHistoryEntity[], events: EventEntity[]): RecommendationCandidate[] {
    const target = targetRequirementsForEmployee(requirements, employee.role, employee.targetGrade);
    const missed = new Map<string, number>();
    const completed = new Map<string, number>();
    const completedEvents = new Set<string>();
    for (const entry of history) {
      if (entry.status === ActivityHistoryStatus.MISSED || entry.status === ActivityHistoryStatus.REFUSED) missed.set(entry.skillId, (missed.get(entry.skillId) ?? 0) + 1);
      if (entry.status === ActivityHistoryStatus.COMPLETED) { completed.set(entry.skillId, (completed.get(entry.skillId) ?? 0) + 1); completedEvents.add(entry.eventId); }
    }
    return events.flatMap((event): RecommendationCandidate[] => {
      const requirement = target.get(event.targetSkillId);
      if (!requirement) return [];
      const currentLevel = employee.skills[event.targetSkillId] ?? 0;
      const skillGap = requirement.level - currentLevel;
      const missedOrRefused = missed.get(event.targetSkillId) ?? 0;
      if (skillGap <= 0 || currentLevel >= event.maxLevel || missedOrRefused >= 2 || completedEvents.has(event.id)) return [];
      if (event.audience.length && !event.audience.some((audience) => audience.toLowerCase() === employee.currentGrade.toLowerCase() || audience.toLowerCase() === employee.role.toLowerCase() || audience.toLowerCase() === 'all')) return [];
      const completedForSkill = completed.get(event.targetSkillId) ?? 0;
      const priority = skillGap * 100 + Math.min(event.gain, skillGap) * 20 + Math.min(completedForSkill, 3) * 5 - missedOrRefused * 25;
      return [{ event, skillName: requirement.name, currentLevel, requiredLevel: requirement.level, skillGap, missedOrRefused, completedForSkill, priority }];
    }).sort((first, second) => second.priority - first.priority || first.event.id.localeCompare(second.event.id)).slice(0, 5);
  }

  async getRecommendationsForEmployee(employeeId: string): Promise<Recommendation[]> {
    const employee = await this.employees.findOneBy({ id: employeeId });
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    const [requirements, history, events] = await Promise.all([
      this.requirements.find(), this.history.findBy({ employeeId }), this.events.find(),
    ]);
    const candidates = this.selectTopCandidates(employee, requirements, history, events);
    if (!candidates.length) { this.logger.log(`Career AI skipped employeeId=${employeeId} reason=no_eligible_candidates`); return []; }
    const selected = await this.selectWithOpenAi(employee, candidates);
    return selected.map(({ candidate, explanation }, index) => {
      const status = candidate.missedOrRefused ? `${candidate.missedOrRefused} пропуск/отказ по навыку` : 'пропусков и отказов по навыку нет';
      const previous = candidate.completedForSkill ? `ранее завершено ${candidate.completedForSkill} активностей по навыку` : 'завершённых активностей по навыку пока нет';
      const facts = `${employee.currentGrade} → ${employee.targetGrade}: ${candidate.skillName} — ${candidate.currentLevel} из требуемых ${candidate.requiredLevel} (разрыв ${candidate.skillGap}). ${candidate.event.title} повысит навык на ${Math.min(candidate.event.gain, candidate.event.maxLevel - candidate.currentLevel)}; ${previous}; ${status}.`;
      return { eventId: candidate.event.id, title: candidate.event.title, targetSkillId: candidate.event.targetSkillId, targetSkillName: candidate.skillName, predictedGain: Math.min(candidate.event.gain, candidate.event.maxLevel - candidate.currentLevel), priority: index + 1, reason: explanation ? `${facts} ${explanation}` : facts };
    });
  }

  private async selectWithOpenAi(employee: EmployeeEntity, candidates: RecommendationCandidate[]): Promise<Array<{ candidate: RecommendationCandidate; explanation: string }>> {
    const fallback = candidates.slice(0, 3).map((candidate) => ({ candidate, explanation: '' }));
    if ((process.env.AI_PROVIDER ?? 'openai').toLowerCase() !== 'openai' || !process.env.OPENAI_API_KEY) {
      this.logger.warn('Career AI skipped reason=provider_or_api_key_unavailable; using local ranking');
      return fallback;
    }
    const requestId = randomUUID();
    const context = { employee: { role: employee.role, currentGrade: employee.currentGrade, targetGrade: employee.targetGrade, tenureMonths: employee.tenureMonths }, candidates: candidates.map((candidate) => ({ eventId: candidate.event.id, title: candidate.event.title, type: candidate.event.type, skillId: candidate.event.targetSkillId, skillName: candidate.skillName, currentLevel: candidate.currentLevel, requiredLevel: candidate.requiredLevel, skillGap: candidate.skillGap, gain: candidate.event.gain, maxLevel: candidate.event.maxLevel, missedOrRefused: candidate.missedOrRefused, completedForSkill: candidate.completedForSkill })) };
    const started = Date.now();
    this.logger.log(`OpenAI request start requestId=${requestId} model=${process.env.OPENAI_MODEL || 'gpt-4o-mini'} employeeId=${employee.id} candidates=${candidates.length}`);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.timeout(1500),
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json', 'X-Client-Request-Id': requestId },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 500, temperature: 0, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: 'You are a career recommendation reasoner. Consider target grade, skill gaps, attendance and event gains together. Choose 1 to 3 event IDs ONLY from candidates. Prefer critical target-grade gaps and reliable participation. Never invent facts or recommend an ignored skill. Return JSON object {"recommendations":[{"eventId":"...","reason":"one concise specific explanation in Russian"}]}.' },
          { role: 'user', content: JSON.stringify(context) },
        ] }),
      });
      const payload = await response.json() as { id?: string; error?: { message?: string }; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; choices?: Array<{ message?: { content?: string } }> };
      this.logger.log(`OpenAI request end requestId=${requestId} openaiRequestId=${response.headers.get('x-request-id') ?? payload.id ?? 'unknown'} status=${response.status} durationMs=${Date.now() - started} usage=${JSON.stringify(payload.usage ?? {})}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${payload.error?.message ?? 'unknown error'}`);
      const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}') as { recommendations?: Array<{ eventId?: string; reason?: string }> };
      const selected = new Set<string>();
      const result = (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).flatMap((item) => {
        const candidate = candidates.find((entry) => entry.event.id === item.eventId);
        if (!candidate || selected.has(candidate.event.id)) return [];
        selected.add(candidate.event.id);
        return [{ candidate, explanation: typeof item.reason === 'string' ? item.reason.slice(0, 500) : '' }];
      }).slice(0, 3);
      if (!result.length) throw new Error('OpenAI returned no valid candidate IDs');
      return result;
    } catch (error) {
      this.logger.warn(`OpenAI fallback requestId=${requestId} durationMs=${Date.now() - started} reason=${error instanceof Error ? error.message : String(error)}`);
      return fallback;
    }
  }
}
