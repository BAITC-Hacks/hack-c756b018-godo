import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { ImportDatasetDto } from './dto/import-dataset.dto';
import { DataImporterService } from '../data-importer/data-importer.service';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { EmployeeService } from '../employee/employee.service';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('HR Management')
@ApiHeader({ name: 'X-Role', description: 'Доступ только для HR', example: 'hr', required: true })
@Roles(UserRole.HR)
@Controller(['api/hr', 'hr'])
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly importService: DataImporterService,
    private readonly employeeService: EmployeeService,
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

  @Get('employees/:id')
  @ApiOperation({ summary: 'Профиль сотрудника для HR: только просмотр' })
  getEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeService.getProfile(id, user.id, UserRole.HR);
  }

  @Post('import')
  @ApiOperation({ summary: 'Импорт датасета для тестирования жюри' })
  importDataset(@Body() dto: ImportDatasetDto) {
    return this.importService.importDataset(dto, false);
  }
}
