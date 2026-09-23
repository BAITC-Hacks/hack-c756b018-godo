import { Module } from '@nestjs/common';
import { aiConfig } from '../../config/ai.config';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './ai-provider.interface';
import { AnthropicAiProvider } from './providers/anthropic-ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: () => {
        if (aiConfig.provider === 'anthropic') {
          if (!aiConfig.anthropic.apiKey) {
            throw new Error(
              'AI_PROVIDER=anthropic, но ANTHROPIC_API_KEY не задан. ' +
                'Укажите ключ в окружении или верните AI_PROVIDER=mock.',
            );
          }
          return new AnthropicAiProvider(aiConfig.anthropic);
        }
        return new MockAiProvider();
      },
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
