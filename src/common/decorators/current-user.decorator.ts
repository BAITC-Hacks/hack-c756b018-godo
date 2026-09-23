import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    // Эмуляция извлечения из JWT/Session (header: x-user-id / x-user-role)
    return {
      id: request.headers['x-user-id'] || 'E0028',
      role: request.headers['x-user-role'] || 'EMPLOYEE',
    };
  },
);
