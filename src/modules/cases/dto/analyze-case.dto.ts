import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeCaseDto {
  @ApiPropertyOptional({
    description: 'Текстовое описание ситуации пользователя',
    example:
      'Купил телефон в рассрочку, устройство оказалось неисправным, продавец отказывается возвращать деньги и требует платить дальше',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  textDescription?: string;
}
