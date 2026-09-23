import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  Confidence,
  EvidenceStatus,
  FactCategory,
} from '../../common/interfaces/ai.interface';

// DTO соответствуют схемам из common/interfaces/ai.interface.ts.
// Ответы mock-провайдера и реального LLM проходят одну и ту же валидацию.

export class ExtractedFactDto {
  @IsString()
  @MaxLength(2_000)
  text!: string;

  @IsEnum(FactCategory)
  category!: FactCategory;

  @IsEnum(Confidence)
  confidence!: Confidence;
}

export class FactExtractionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedFactDto)
  facts!: ExtractedFactDto[];

  @IsArray()
  @IsString({ each: true })
  missingInformation!: string[];

  @IsBoolean()
  isEnoughForAnalysis!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClarifyingQuestionDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(1_000)
  question!: string;

  @IsString()
  @MaxLength(1_000)
  purpose!: string;

  @IsOptional()
  @IsBoolean()
  answered?: boolean;

  @IsOptional()
  @IsString()
  answer?: string;
}

export class QuestionGenerationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClarifyingQuestionDto)
  questions!: ClarifyingQuestionDto[];
}

export class EvidenceAnalysisItemDto {
  @IsString()
  evidenceId!: string;

  @IsEnum(EvidenceStatus)
  status!: EvidenceStatus;

  @IsArray()
  @IsString({ each: true })
  relevantFacts!: string[];

  @IsString()
  @MaxLength(2_000)
  note!: string;
}

export class EvidenceAnalysisDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceAnalysisItemDto)
  analyses!: EvidenceAnalysisItemDto[];

  @IsArray()
  @IsString({ each: true })
  limitations!: string[];
}

export class LegalQueryGenerationDto {
  @IsArray()
  @IsString({ each: true })
  queries!: string[];
}

export class LegalAnalysisExplanationDto {
  @IsString()
  articleId!: string;

  @IsString()
  @MaxLength(4_000)
  relevance!: string;

  @IsString()
  @MaxLength(4_000)
  sourceBasis!: string;
}

export class LegalAnalysisAiDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalAnalysisExplanationDto)
  explanations!: LegalAnalysisExplanationDto[];

  @IsBoolean()
  insufficientSources!: boolean;

  @IsString()
  disclaimer!: string;
}

export class ActionStepDto {
  @IsInt()
  order!: number;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(4_000)
  description!: string;

  @IsBoolean()
  optional!: boolean;
}

export class ActionPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionStepDto)
  steps!: ActionStepDto[];

  @IsArray()
  @IsString({ each: true })
  caveats!: string[];
}

export class DraftGenerationDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsString()
  @MaxLength(100_000)
  documentText!: string;

  @IsArray()
  @IsString({ each: true })
  warnings!: string[];

  @IsArray()
  @IsString({ each: true })
  placeholders!: string[];
}
