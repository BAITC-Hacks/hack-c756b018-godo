import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentType } from '../../../common/interfaces/case.interface';

export class GenerateDocumentDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID кейса из ответа POST /api/v1/cases/analyze',
  })
  @IsUUID()
  caseId!: string;

  @ApiPropertyOptional({
    enum: DocumentType,
    default: DocumentType.EOTINISH,
    description: 'Тип документа: обращение в eOtinish или заявление в РОВД',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType = DocumentType.EOTINISH;
}

export class DocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty({ enum: DocumentType })
  type!: DocumentType;

  @ApiProperty({ example: 'Заявление в РОВД (черновик)' })
  title!: string;

  @ApiProperty({
    description: 'Готовый текст документа для копирования',
    type: String,
  })
  documentText!: string;
}
