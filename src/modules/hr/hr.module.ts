import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { EmployeeSkill } from '../../entities/employee-skill.entity';
import { Employee } from '../../entities/employee.entity';
import { ImportModule } from '../import/import.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeSkill, Employee]), ImportModule],
  controllers: [HrController],
  providers: [HrService],
})
export class HrModule {}
