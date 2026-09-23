import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdiletModule } from '../adilet-kb/adilet.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseEntity } from './entities/case.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CaseEntity]), AdiletModule],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
