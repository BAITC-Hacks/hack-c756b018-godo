import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  CaseState,
  DocumentType,
} from '../../../common/interfaces/case.interface';

// ---------- Входные DTO ----------

export class CreateCaseDto {
  @ApiProperty({
    description: 'Описание ситуации пользователя своими словами',
    example:
      'Оплатил телефон в интернет-магазине 15 сентября, продавец не отправил товар и перестал отвечать на сообщения',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description!: string;
}

export class CaseMessageDto {
  @ApiProperty({ description: 'Дополнительное сообщение пользователя по кейсу' })
  @IsString()
  @MinLength(2)
  @MaxLength(10_000)
  text!: string;
}

export class CaseAnswerDto {
  @ApiProperty({ example: 'q1', description: 'ID уточняющего вопроса' })
  @IsString()
  questionId!: string;

  @ApiProperty({ example: '45000 тенге, оплатил через Kaspi' })
  @IsString()
  @MaxLength(5_000)
  answer!: string;
}

export class CaseAnswersDto {
  @ApiProperty({
    type: [CaseAnswerDto],
    description: 'Ответы на уточняющие вопросы (можно пустой массив)',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CaseAnswerDto)
  answers!: CaseAnswerDto[];
}

// ---------- Ответные DTO (Swagger) ----------

export class CaseFullDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CaseState })
  state!: CaseState;

  @ApiProperty({ type: String, nullable: true })
  textDescription!: string | null;

  @ApiProperty({ type: Object, nullable: true, description: 'FactExtraction' })
  facts!: object | null;

  @ApiProperty({ type: [Object], nullable: true, description: 'Уточняющие вопросы' })
  questions!: object[] | null;

  @ApiProperty({ type: Object, nullable: true, description: 'LegalResearchResult' })
  legalResearch!: object | null;

  @ApiProperty({ type: Object, nullable: true, description: 'LegalAnalysisResult' })
  legalAnalysis!: object | null;

  @ApiProperty({ type: Object, nullable: true, description: 'ActionPlan' })
  actionPlan!: object | null;

  @ApiProperty({ type: [Object] })
  messages!: object[];

  @ApiProperty({ type: [Object] })
  evidence!: object[];

  @ApiProperty({ type: [Object] })
  documents!: object[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CaseSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: CaseState })
  state!: CaseState;

  @ApiProperty({ type: String, nullable: true })
  textDescription!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class FactsResponseDto {
  @ApiProperty({ type: Object, nullable: true, description: 'FactExtraction' })
  facts!: object | null;

  @ApiProperty({ type: [Object], nullable: true })
  questions!: object[] | null;
}

export class LegalResponseDto {
  @ApiProperty({ type: Object, nullable: true, description: 'LegalResearchResult с citedSources и ссылками adilet.zan.kz' })
  legalResearch!: object | null;

  @ApiProperty({ type: Object, nullable: true, description: 'LegalAnalysisResult' })
  legalAnalysis!: object | null;
}

export class ActionPlanResponseDto {
  @ApiProperty({ type: Object, nullable: true, description: 'ActionPlan' })
  actionPlan!: object | null;
}
