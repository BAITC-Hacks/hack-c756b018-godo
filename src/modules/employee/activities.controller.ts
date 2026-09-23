import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { EmployeeService } from './employee.service';

@ApiTags('Employee Portal')
@ApiHeader({ name: 'x-user-id', description: 'ID сотрудника', example: 'E0028' })
@ApiHeader({ name: 'x-user-role', description: 'Роль', example: 'EMPLOYEE' })
@UseGuards(RolesGuard)
@Roles(UserRole.EMPLOYEE)
@Controller('api/activities')
export class ActivitiesController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('complete')
  @ApiOperation({ summary: 'Завершить активность и обновить прогресс' })
  complete(@Body() dto: CompleteActivityDto, @CurrentUser() user: AuthUser) {
    if (dto.employeeId !== user.id) {
      // EmployeeService checks ownership for profile calls; keep this endpoint equally scoped.
      throw new ForbiddenException('Доступ к данным другого сотрудника запрещён');
    }
    return this.employeeService.completeActivity(dto.employeeId, dto.eventId);
  }
}
