import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RoleRequest } from '../roles.guard';
import type { UserRole } from '../enums/role.enum';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<RoleRequest>().authUser;
  },
);
