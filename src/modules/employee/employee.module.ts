import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Employee } from '../../entities/employee.entity';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Event } from '../../entities/event.entity';
import { ActivityHistory } from '../../entities/activity-history.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeSkill, Event, ActivityHistory]), AiModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
