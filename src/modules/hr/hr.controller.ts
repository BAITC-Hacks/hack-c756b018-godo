import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { ImportDatasetDto } from './dto/import-dataset.dto';
import { DataImporterService } from '../data-importer/data-importer.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('HR Management')
@ApiHeader({ name: 'x-user-role', description: 'Роль (должна быть HR)', example: 'HR' })
@UseGuards(RolesGuard)
@Roles(UserRole.HR)
@Controller('api/hr')
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly importService: DataImporterService,
  ) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Аналитика для HR: проседающие навыки и зона риска' })
  getAnalytics() {
    return this.hrService.getAnalytics();
  }

  @Get('employees')
  @ApiOperation({ summary: 'Список сотрудников для HR-дашборда' })
  getEmployees() {
    return this.hrService.getEmployees();
  }

  @Post('import')
  @ApiOperation({ summary: 'Импорт датасета для тестирования жюри' })
  importDataset(@Body() dto: ImportDatasetDto) {
    return this.importService.importDataset(dto, false);
  }
}
