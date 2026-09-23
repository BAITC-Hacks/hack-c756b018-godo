import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';

it('prioritizes a grade gap over a lower skill repeatedly skipped', async () => {
  const service = new AiService();
  const system = { id: 'SYSTEM', title: 'System Design Lab', targetAudience: ['Middle'], skillsDeveloped: [{ skillId: 'SK_SYSTEM', gain: 1, maxLevel: 5 }] };
  const speaking = { id: 'SPEAK', title: 'Public Speaking', targetAudience: ['Middle'], skillsDeveloped: [{ skillId: 'SK_SPEAK', gain: 1, maxLevel: 5 }] };
  const result = await service.generateExplainableRecommendations(
    { currentGrade: 'Middle', targetGrade: 'Senior', role: 'Engineer', skills: [{ skillId: 'SK_SYSTEM', level: 2 }, { skillId: 'SK_SPEAK', level: 1 }] },
    [{ skillId: 'SK_SYSTEM', requiredLevel: 4 }, { skillId: 'SK_SPEAK', requiredLevel: 2 }],
    [1, 2, 3].map(() => ({ status: 'skipped', event: speaking })),
    [speaking, system],
  );
  expect(result[0].eventId).toBe('SYSTEM');
  expect(result[0].reason).toContain('разрыв 2');
  expect(result.find((item) => item.eventId === 'SPEAK')?.reason).toContain('пропущено или отклонено 3');
});

it('uses the configured OpenAI model and token limit, then validates selected IDs', async () => {
  const config = { get: (key: string) => ({ 'ai.provider': 'openai', 'ai.openai.apiKey': 'test-key', 'ai.openai.model': 'gpt-4o-mini', 'ai.openai.maxTokens': 123 }[key]) };
  const request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, headers: new Headers({ 'x-request-id': 'req_test' }), json: async () => ({ choices: [{ message: { content: '["SPEAK","SYSTEM"]' } }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } }) } as Response);
  try {
    const service = new AiService(config as ConfigService);
    const result = await service.generateExplainableRecommendations(
      { currentGrade: 'Middle', targetGrade: 'Senior', role: 'Engineer', skills: [{ skillId: 'SK_SYSTEM', level: 2 }, { skillId: 'SK_SPEAK', level: 1 }] },
      [{ skillId: 'SK_SYSTEM', requiredLevel: 4 }, { skillId: 'SK_SPEAK', requiredLevel: 2 }], [],
      [{ id: 'SYSTEM', title: 'System', skillsDeveloped: [{ skillId: 'SK_SYSTEM', gain: 1, maxLevel: 5 }] }, { id: 'SPEAK', title: 'Speaking', skillsDeveloped: [{ skillId: 'SK_SPEAK', gain: 1, maxLevel: 5 }] }],
    );
    expect(result[0].eventId).toBe('SPEAK');
    const body = JSON.parse((request.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ model: 'gpt-4o-mini', max_completion_tokens: 123 });
    expect((request.mock.calls[0][1] as RequestInit).headers).toEqual(expect.objectContaining({ 'X-Client-Request-Id': expect.any(String) }));
  } finally { request.mockRestore(); }
});
