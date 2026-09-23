import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from './decorators/current-user.decorator';
import { UserRole } from './enums/role.enum';
import { EMPLOYEE_SCOPE_KEY, ROLES_KEY } from './roles.decorator';

export type RoleRequest = Request & { authUser: AuthUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RoleRequest>();
    const role = request.headers['x-role'] ?? UserRole.EMPLOYEE;
    if (role !== UserRole.EMPLOYEE && role !== UserRole.HR) {
      throw new ForbiddenException('Unknown role');
    }

    const targets = [context.getHandler(), context.getClass()];
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(role)) {
      throw new ForbiddenException('Доступ разрешён только для указанных ролей');
    }

    const headerId = request.headers['x-employee-id'];
    const id = typeof headerId === 'string' ? headerId.trim() : '';
    const employeeScope = this.reflector.getAllAndOverride<boolean>(EMPLOYEE_SCOPE_KEY, targets);
    if (employeeScope && role === UserRole.EMPLOYEE) {
      if (!id) throw new ForbiddenException('X-Employee-Id is required');
      const targetId = request.params.id ?? request.body?.employeeId;
      if (targetId !== undefined && targetId !== id) {
        throw new ForbiddenException('Доступ к данным другого сотрудника запрещён');
      }
    }
    request.authUser = { id, role };
    return true;
  }
}
