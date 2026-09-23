import type { AiAttachment, AiRoleName } from '../../common/interfaces/ai.interface';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type { AiAttachment };

export interface AiCompleteRequest {
  role: AiRoleName;
  system: string;
  /** Структурированный вход роли; провайдер сам сериализует его в промпт. */
  input: unknown;
  attachments?: AiAttachment[];
}

export interface AiProvider {
  readonly name: string;
  /** Возвращает сырой текст, содержащий JSON-ответ роли. Валидация — в AiService. */
  complete(request: AiCompleteRequest): Promise<string>;
}
