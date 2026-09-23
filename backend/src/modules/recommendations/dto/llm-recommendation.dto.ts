import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Guardrail поверх ответа LLM: структура проверяется class-validator,
 * любое отклонение приводит к алгоритмическому фолбеку без падения API.
 */
export class LlmBreakdownFactors {
  @IsOptional()
  @IsNumber()
  gradeGap?: number;

  @IsOptional()
  @IsNumber()
  historyPenalty?: number;

  @IsOptional()
  @IsNumber()
  skillUrgency?: number;
}

export class LlmRecommendationItem {
  @IsString()
  eventId!: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsNumber()
  predictedGain?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LlmBreakdownFactors)
  breakdown?: LlmBreakdownFactors;
}

export class LlmRecommendationResponse {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LlmRecommendationItem)
  recommendations!: LlmRecommendationItem[];
}
