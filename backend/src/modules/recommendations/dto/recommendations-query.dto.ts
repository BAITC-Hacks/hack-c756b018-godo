import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class RecommendationsQueryDto {
  @ApiPropertyOptional({ enum: ['simple', 'multifactor'], default: 'multifactor', description: 'simple — наивная эвристика по наименьшему навыку, multifactor — многофакторный AI' })
  @IsOptional()
  @IsIn(['simple', 'multifactor'])
  mode?: 'simple' | 'multifactor';
}

export class SimulateQueryDto {
  @ApiPropertyOptional({ example: 'DevOps Engineer', description: 'Целевая роль для симуляции «What-If»' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  targetRole?: string;

  @ApiPropertyOptional({ example: 'Senior', description: 'Целевой грейд для симуляции «What-If»' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  targetGrade?: string;
}
