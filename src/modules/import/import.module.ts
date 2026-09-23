import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { DatasetController } from './dataset.controller';

@Module({
  controllers: [DatasetController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
