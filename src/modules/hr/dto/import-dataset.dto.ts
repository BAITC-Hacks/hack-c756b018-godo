import { IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportDatasetDto {
  @ApiPropertyOptional({ description: 'Массив профилей сотрудников из employees.json' })
  @IsArray()
  @IsOptional()
  employees?: any[];

  @ApiPropertyOptional({ description: 'Массив событий из events.json' })
  @IsArray()
  @IsOptional()
  events?: any[];

  @ApiPropertyOptional({ description: 'Массив навыков из skills.json' })
  @IsArray()
  @IsOptional()
  skills?: any[];

  @ApiPropertyOptional({ description: 'История из activity_history.csv' })
  @IsArray()
  @IsOptional()
  history?: any[];
}
