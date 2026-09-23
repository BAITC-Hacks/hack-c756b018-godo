import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

export class AiValidationError extends Error {
  constructor(
    readonly role: string,
    readonly details: string[],
  ) {
    super(
      `AI-ответ для роли «${role}» не прошёл валидацию JSON: ${details.join('; ')}`,
    );
    this.name = 'AiValidationError';
  }
}

export function extractJson(raw: string): unknown {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    // пробуем вырезать JSON из ответа с пояснениями или markdown-обёрткой
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // продолжаем
    }
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // продолжаем
    }
  }
  throw new Error('Ответ AI не содержит валидного JSON');
}

function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const own = error.constraints ? Object.values(error.constraints) : [];
    const nested = error.children ? collectMessages(error.children) : [];
    return [...own, ...nested];
  });
}

// dto приходит из реестра AI_ROLES, где классы разнотипны; строгая типизация результата — на вызывающей стороне
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAndValidateAiJson<T = any>(
  role: string,
  dto: ClassConstructor<any>,
  raw: string,
): T {
  let data: unknown;
  try {
    data = extractJson(raw);
  } catch (error) {
    throw new AiValidationError(role, [(error as Error).message]);
  }
  const instance = plainToInstance(dto, data);
  const errors = validateSync(instance, { whitelist: true });
  if (errors.length > 0) {
    throw new AiValidationError(role, collectMessages(errors));
  }
  return instance;
}
