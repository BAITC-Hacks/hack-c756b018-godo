import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EmployeeScope, Roles } from '../../common/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Employee Portal')
@ApiHeader({ name: 'X-Employee-Id', description: 'ID текущего сотрудника (обязателен для employee)', example: 'E0028' })
@ApiHeader({ name: 'X-Role', description: 'employee (по умолчанию) или hr', example: 'employee' })
@EmployeeScope()
@Controller(['api/employees', 'employees'])
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get(':id')
  @Roles(UserRole.EMPLOYEE, UserRole.HR)
  @ApiOperation({ summary: 'Получение профиля сотрудника и его навыков' })
  getProfile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    // The guard authorizes HR access; services retain their ownership invariant.
    return this.employeeService.getProfile(id, user.role === UserRole.HR ? id : user.id);
  }

  @Get(':id/recommendations')
  @Roles(UserRole.EMPLOYEE, UserRole.HR)
  @ApiOperation({ summary: 'Получение AI-рекомендаций с понятным обоснованием (Explainability)' })
  getRecommendations(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeService.getRecommendations(id, user.role === UserRole.HR ? id : user.id);
  }

  @Post(':id/complete-event/:eventId')
  @Roles(UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Complete event and return updated profile' })
  completeEvent(@Param('id') id: string, @Param('eventId') eventId: string, @CurrentUser() user: AuthUser) {
    return this.employeeService.completeEvent(id, eventId, user.id);
  }

  @Post('activities/complete')
  @Roles(UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Отметка о прохождении рекомендации и пересчет прогресса' })
  completeActivity(@Body() dto: CompleteActivityDto, @CurrentUser() user: AuthUser) {
    return this.employeeService.completeActivity(user.id, dto.eventId);
  }
}
