import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { EmployeeEntity } from '../../storage/entities/employee.entity';
import { EventEntity } from '../../storage/entities/event.entity';
import { SkillRequirementEntity } from '../../storage/entities/skill-requirement.entity';
import { ActivityHistoryEntity } from '../../storage/entities/activity-history.entity';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { DataImporterModule } from '../data-importer/data-importer.module';

@Module({ imports: [TypeOrmModule.forFeature([EmployeeEntity, EventEntity, SkillRequirementEntity, ActivityHistoryEntity]), RecommendationsModule, DataImporterModule], controllers: [HrController], providers: [HrService] })
export class HrModule {}
