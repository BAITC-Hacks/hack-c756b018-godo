import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DataImporterService } from './data-importer.service';

@ApiTags('Admin')
@ApiHeader({ name: 'x-user-role', example: 'HR' })
@UseGuards(RolesGuard)
@Roles(UserRole.HR)
@Controller('api/admin')
export class DataImporterController {
  constructor(private readonly importer: DataImporterService) {}
  @Post('import')
  @ApiOperation({ summary: 'Replace Career Quest data from ./data files' })
  importFiles() { return this.importer.importFromFiles(); }
}
