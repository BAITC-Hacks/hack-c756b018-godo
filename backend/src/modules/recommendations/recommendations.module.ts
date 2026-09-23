import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity } from '../../storage/entities/activity-history.entity';
import { RecommendationsService } from './recommendations.service';

@Module({ imports: [TypeOrmModule.forFeature([EmployeeEntity, EventEntity, SkillRequirementEntity, ActivityHistoryEntity])], providers: [RecommendationsService], exports: [RecommendationsService] })
export class RecommendationsModule {}
