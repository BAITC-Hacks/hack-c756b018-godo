import { Inject, Injectable } from '@nestjs/common';
import type {
  AiAttachment,
  AiRoleName,
} from '../../common/interfaces/ai.interface';
import { parseAndValidateAiJson } from '../../common/utils/validate-ai-json';
import { AI_ROLES } from './ai-roles';
import { AI_PROVIDER } from './ai-provider.interface';
import type { AiProvider } from './ai-provider.interface';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER)
    private readonly provider: AiProvider,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Выполняет AI-роль и возвращает провалидированный структурированный ответ.
   * Все ответы AI проходят валидацию по DTO-схеме роли.
   */
  async run<T>(
    role: AiRoleName,
    input: unknown,
    attachments?: AiAttachment[],
  ): Promise<T> {
    const definition = AI_ROLES[role];
    const raw = await this.provider.complete({
      role,
      system: definition.system,
      input,
      attachments,
    });
    return parseAndValidateAiJson(role, definition.dto, raw) as T;
  }
}
