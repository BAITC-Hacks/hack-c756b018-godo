import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { ActivitiesController } from './activities.controller';
import { EmployeeService } from './employee.service';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity } from '../../storage/entities/activity-history.entity';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ProgressModule } from '../progress/progress.module';

@Module({ imports: [TypeOrmModule.forFeature([EmployeeEntity, EventEntity, SkillRequirementEntity, ActivityHistoryEntity]), RecommendationsModule, ProgressModule], controllers: [EmployeeController, ActivitiesController], providers: [EmployeeService], exports: [EmployeeService] })
export class EmployeeModule {}
