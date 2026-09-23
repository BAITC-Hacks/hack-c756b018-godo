import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  provider: (process.env.AI_PROVIDER ?? 'openai').toLowerCase(),
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 4096),
  },
}));
