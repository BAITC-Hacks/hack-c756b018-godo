import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentType } from '../../../common/interfaces/case.interface';

export class GenerateDraftDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    default: DocumentType.EOTINISH,
    description: 'Тип документа: обращение в eOtinish или заявление в РОВД',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType = DocumentType.EOTINISH;
}

export class PatchDraftDto {
  @ApiProperty({
    description: 'Отредактированный пользователем текст черновика',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  @MaxLength(100_000)
  documentText!: string;
}

export class DocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty({ enum: DocumentType })
  type!: DocumentType;

  @ApiProperty({ example: 'Обращение в eOtinish (черновик)' })
  title!: string;

  @ApiProperty({ description: 'Текст документа для копирования и правки' })
  documentText!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ description: 'Пользователь уже редактировал черновик' })
  isEditedByUser!: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Только при генерации: поля, которые нужно заполнить' })
  placeholders?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Только при генерации: предупреждения' })
  warnings?: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
