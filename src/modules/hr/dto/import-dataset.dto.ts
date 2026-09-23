import { IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportDatasetDto {
  @ApiProperty({ description: 'Массив профилей сотрудников из employees.json' })
  @IsArray()
  @IsNotEmpty()
  employees: any[];

  @ApiProperty({ description: 'Массив событий из events.json' })
  @IsArray()
  @IsNotEmpty()
  events: any[];

  @ApiProperty({ description: 'Массив навыков из skills.json' })
  @IsArray()
  @IsNotEmpty()
  skills: any[];

  @ApiProperty({ description: 'История из activity_history.csv' })
  @IsArray()
  history: any[];
}
