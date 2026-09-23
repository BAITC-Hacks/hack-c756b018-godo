import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIRecommendationOutput {
  eventId: string;
  priority: number;
  targetSkillId: string;
  predictedGain: number;
  reason: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(@Optional() private readonly config?: ConfigService) {}

  async generateExplainableRecommendations(employee: any, requirements: any[], history: any[], events: any[]): Promise<AIRecommendationOutput[]> {
    const levels = new Map<string, number>(employee.skills.map((s: any) => [s.skillId, Number(s.level)]));
    const names = new Map<string, string>(employee.skills.map((s: any) => [s.skillId, s.name || s.skillId]));
    const required = new Map<string, number>(requirements.map((s: any) => [s.skillId, Number(s.requiredLevel)]));
    const historyBySkill = new Map<string, { completed: number; skipped: number }>();
    for (const entry of history) {
      for (const dev of entry.event?.skillsDeveloped || []) {
        const counts = historyBySkill.get(dev.skillId) || { completed: 0, skipped: 0 };
        if (entry.status === 'completed') counts.completed++;
        if (entry.status === 'skipped' || entry.status === 'refused') counts.skipped++;
        historyBySkill.set(dev.skillId, counts);
      }
    }
    const ranked = events.flatMap((event: any) => {
      const audience = event.targetAudience || [];
      if (audience.length && !audience.some((a: string) =>
        [employee.currentGrade, employee.targetGrade, employee.role, 'all'].some((value) => value?.toLowerCase() === a.toLowerCase()))) return [];
      const impacts = (event.skillsDeveloped || []).map((dev: any) => {
        const current = levels.get(dev.skillId) ?? 0;
        const target = required.get(dev.skillId) ?? 0;
        const gap = Math.max(0, target - current);
        const gain = Math.max(0, Math.min(Number(dev.gain) || 0, (Number(dev.maxLevel) || 5) - current, gap));
        const participation = historyBySkill.get(dev.skillId) || { completed: 0, skipped: 0 };
        return { skillId: dev.skillId, current, target, gap, gain, participation,
          score: gain * 8 + gap * 3 + Math.min(participation.completed, 2) - Math.min(participation.skipped, 4) * 4 };
      }).filter((impact: any) => impact.gain > 0);
      if (!impacts.length) return [];
      impacts.sort((a: any, b: any) => b.score - a.score);
      const best = impacts[0];
      const p = best.participation;
      const historyText = p.completed || p.skipped
        ? `По истории: выполнено ${p.completed}, пропущено или отклонено ${p.skipped} похожих активностей.`
        : 'По истории похожих активностей пока нет; шаг подходит для начала.';
      return [{ eventId: event.id, targetSkillId: best.skillId, predictedGain: best.gain,
        score: best.score + impacts.slice(1).reduce((sum: number, item: any) => sum + item.gain * 2, 0),
        reason: `${employee.currentGrade} → ${employee.targetGrade}: ${names.get(best.skillId)} сейчас ${best.current}, требуется ${best.target} (разрыв ${best.gap}). ${event.title} даёт до +${best.gain} уровня. ${historyText}` }];
    });
    ranked.sort((a: any, b: any) => b.score - a.score || a.eventId.localeCompare(b.eventId));
    const selected = await this.orderWithLlm(ranked, employee);
    return selected.slice(0, 3).map(({ score, ...item }: any, index: number) => ({ ...item, priority: index + 1 }));
  }

  private async orderWithLlm(ranked: any[], employee: any): Promise<any[]> {
    if (this.config?.get<string>('ai.provider') !== 'openai' || !this.config.get<string>('ai.openai.apiKey')) return ranked;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(7000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.get<string>('ai.openai.apiKey')}` },
        body: JSON.stringify({
          model: this.config.get<string>('ai.openai.model') || 'gpt-4o-mini',
          max_completion_tokens: this.config.get<number>('ai.openai.maxTokens') || 4096,
          messages: [
            { role: 'system', content: 'Select career development activities from the grounded candidates. Consider grade gap, gain, participation history, and audience. Return only a JSON array of up to 3 event IDs. Never invent IDs.' },
            { role: 'user', content: JSON.stringify({ employee: { role: employee.role, currentGrade: employee.currentGrade, targetGrade: employee.targetGrade }, candidates: ranked.slice(0, 10).map(({ eventId, score, reason }) => ({ eventId, score, reason })) }) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return ranked;
      const ids = JSON.parse(content) as unknown;
      if (!Array.isArray(ids) || !ids.length || ids.length > 3 || ids.some((id) => typeof id !== 'string' || !ranked.some((item) => item.eventId === id))) return ranked;
      const unique = [...new Set(ids)];
      return [...unique.map((id) => ranked.find((item) => item.eventId === id)), ...ranked.filter((item) => !unique.includes(item.eventId))];
    } catch (error) {
      this.logger.warn(`LLM unavailable, using grounded ranking: ${error instanceof Error ? error.message : String(error)}`);
      return ranked;
    }
  }
}
