import { Body, Controller, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/roles.decorator';
import { ImportDatasetDto } from '../hr/dto/import-dataset.dto';
import { ImportService } from './import.service';

@ApiTags('Dataset')
@ApiHeader({ name: 'X-Role', example: 'hr', required: true })
@Roles('hr')
@Controller(['dataset', 'api/dataset'])
export class DatasetController {
  constructor(private readonly importService: ImportService) {}

  @Post('load')
  load(@Body() dto: ImportDatasetDto) {
    return this.importService.importFullDataset(dto);
  }
}
