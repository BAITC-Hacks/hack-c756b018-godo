import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LegalArticleDto {
  @ApiProperty({ example: 'Ст. 190 УК РК' })
  code!: string;

  @ApiProperty({ example: 'Мошенничество' })
  title!: string;

  @ApiProperty({
    example:
      'Хищение чужого имущества путём обмана или злоупотребления доверием.',
  })
  summary!: string;
}

export class CaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  textDescription!: string | null;

  @ApiProperty({ type: [String] })
  facts!: string[];

  @ApiProperty({ type: [LegalArticleDto] })
  legalArticles!: LegalArticleDto[];

  @ApiProperty({ type: [String] })
  evidenceProvided!: string[];

  @ApiProperty({ type: [String] })
  evidenceMissing!: string[];

  @ApiProperty({ type: [String] })
  nextSteps!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
