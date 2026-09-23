import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

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
  private anthropicClient: Anthropic | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.anthropic.apiKey');
    if (apiKey) {
      this.anthropicClient = new Anthropic({ apiKey });
    }
  }

  async generateExplainableRecommendations(
    employee: any,
    targetRequirements: any[],
    history: any[],
    availableEvents: any[],
  ): Promise<AIRecommendationOutput[]> {
    const provider = this.configService.get<string>('ai.provider');

    if (provider === 'mock' || !this.anthropicClient) {
      this.logger.log('Используется MOCK AI Engine');
      return this.getMockRecommendations(employee, availableEvents);
    }

    try {
      const systemPrompt = `Ты — AI-навигатор карьерного развития компании Halyk Bank (Career Quest).
Твоя задача — проанализировать данные сотрудника и предложить от 1 до 3 персональных рекомендаций по развитию.

ПРАВИЛА И ОГРАНИЧЕНИЯ:
1. НЕ предлагай исключительно тот навык, у которого самый низкий уровень, если сотрудник систематически пропускал/игнорировал мероприятия по нему в прошлом.
2. Первостепенный приоритет — навыкам, которые прямо критичны для перехода на следующий грейд.
3. Каждая рекомендация должна содержать ПОДРОБНОЕ ОБЪЯСНЕНИЕ (Explainability), опирающееся минимум на 3 фактора:
   - Разрыв между текущим уровнем и требованиями следующего грейда.
   - История посещений/отказов из прошлых активностей.
   - Специфика предложенного мероприятия и его вклад в карьерный рост.

ФОРМАТ ОТВЕТА:
Возвращай СТРОГО JSON-массив без какого-либо дополнительного текста или markdown-оформления:
[
  {
    "eventId": "string",
    "priority": 1,
    "targetSkillId": "string",
    "predictedGain": 1,
    "reason": "string"
  }
]`;

      const userPrompt = `ПРОФИЛЬ СОТРУДНИКА:
${JSON.stringify(employee, null, 2)}

ТРЕБОВАНИЯ ЦЕЛЕВОГО ГРЕЙДА:
${JSON.stringify(targetRequirements, null, 2)}

ИСТОРИЯ АКТИВНОСТЕЙ (24 МЕС):
${JSON.stringify(history, null, 2)}

ДОСТУПНЫЕ СОБЫТИЯ:
${JSON.stringify(availableEvents, null, 2)}`;

      const model = this.configService.get<string>('ai.anthropic.model');
      const response = await this.anthropicClient.messages.create({
        model: model ?? 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Пустой ответ от LLM');
      }

      const cleanJson = textBlock.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      this.logger.error(`Ошибка AI сервиса: ${error.message}. Переключение на fallback.`);
      return this.getMockRecommendations(employee, availableEvents);
    }
  }

  private getMockRecommendations(employee: any, availableEvents: any[]): AIRecommendationOutput[] {
    const targetEvent = availableEvents[0] || { id: 'EVT_SYS_01', skillsDeveloped: [{ skillId: 'SK_SYSTEM_DESIGN', gain: 1 }] };
    return [
      {
        eventId: targetEvent.id,
        priority: 1,
        targetSkillId: targetEvent.skillsDeveloped[0]?.skillId || 'SK_SYSTEM_DESIGN',
        predictedGain: targetEvent.skillsDeveloped[0]?.gain || 1,
        reason: `Рекомендуем данный интенсив. Навык системного дизайна требует повышения до уровня грейда ${employee.targetGrade}. Прошлые технические дисциплины пройдены вами успешно, а курс покрывает ключевые инженерные блокеры.`,
      },
    ];
  }
}
