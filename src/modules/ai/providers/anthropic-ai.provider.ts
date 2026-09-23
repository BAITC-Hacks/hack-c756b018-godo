import Anthropic from '@anthropic-ai/sdk';
import type {
  AiAttachment,
  AiCompleteRequest,
  AiProvider,
} from '../ai-provider.interface';

interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

const JSON_OUTPUT_RULE =
  '\nВерни ответ СТРОГО в формате одного валидного JSON-объекта, без markdown-обёрток и пояснений.';

export class AnthropicAiProvider implements AiProvider {
  readonly name = 'anthropic';

  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.maxTokens = config.maxTokens;
  }

  async complete(request: AiCompleteRequest): Promise<string> {
    const content: Anthropic.ContentBlockParam[] = [
      ...this.attachmentBlocks(request.attachments ?? []),
      {
        type: 'text',
        text: [
          'Входные данные задания (JSON):',
          JSON.stringify(request.input, null, 2),
        ].join('\n'),
      },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      thinking: { type: 'adaptive' },
      system: request.system + JSON_OUTPUT_RULE,
      messages: [{ role: 'user', content }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  private attachmentBlocks(attachments: AiAttachment[]): Anthropic.ContentBlockParam[] {
    // mimeType уже отфильтрован в buildAttachments (только jpeg/png/gif/webp и pdf)
    const imageMediaType = (mimeType: string) => mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return attachments.map((attachment) =>
      attachment.kind === 'image'
        ? {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: imageMediaType(attachment.mimeType),
              data: attachment.base64,
            },
          }
        : {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf',
              data: attachment.base64,
            },
          },
    );
  }
}
