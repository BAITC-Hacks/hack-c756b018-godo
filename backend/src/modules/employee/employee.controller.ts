import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Employee Portal')
@ApiHeader({ name: 'x-user-id', description: 'ID пользователя', example: 'E0028' })
@ApiHeader({ name: 'x-user-role', description: 'Роль (EMPLOYEE / HR)', example: 'EMPLOYEE' })
@UseGuards(RolesGuard)
@Controller('api/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get(':id')
  @Roles(UserRole.EMPLOYEE, UserRole.HR)
  @ApiOperation({ summary: 'Получение профиля сотрудника и его навыков' })
  getProfile(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeService.getProfile(id, user.id, user.role);
  }

  @Get(':id/recommendations')
  @Roles(UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Получение AI-рекомендаций с понятным обоснованием (Explainability)' })
  getRecommendations(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.employeeService.getRecommendations(id, user.id);
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
