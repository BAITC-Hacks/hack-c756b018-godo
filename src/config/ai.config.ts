export const aiConfig = {
  provider: (process.env.AI_PROVIDER ?? 'mock').toLowerCase(),
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 16_000),
  },
  legalSource: (process.env.LEGAL_SOURCE ?? 'mock-kb').toLowerCase(),
};
