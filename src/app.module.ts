import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { aiConfig } from './config/ai.config';
import { Employee } from './entities/employee.entity';
import { Skill } from './entities/skill.entity';
import { EmployeeSkill } from './entities/employee-skill.entity';
import { Event } from './entities/event.entity';
import { ActivityHistory } from './entities/activity-history.entity';
import { EmployeeModule } from './modules/employee/employee.module';
import { HrModule } from './modules/hr/hr.module';
import { AiModule } from './modules/ai/ai.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres_password',
        database: process.env.DB_NAME || 'career_quest',
        entities: [Employee, Skill, EmployeeSkill, Event, ActivityHistory],
        synchronize: true, // Включаем авто-миграции для быстрого старта на хакатоне
      }),
    }),
    EmployeeModule,
    HrModule,
    AiModule,
    ImportModule,
  ],
})
export class AppModule {}
