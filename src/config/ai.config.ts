import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  provider: (process.env.AI_PROVIDER ?? 'mock').toLowerCase(),
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 4096),
  },
}));
