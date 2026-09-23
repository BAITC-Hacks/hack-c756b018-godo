import { Module } from '@nestjs/common';
import { DataImporterController } from './data-importer.controller';
import { DataImporterService } from './data-importer.service';

@Module({ controllers: [DataImporterController], providers: [DataImporterService], exports: [DataImporterService] })
export class DataImporterModule {}
