import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const EMPLOYEE_SCOPE_KEY = 'employee-scope';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const EmployeeScope = () => SetMetadata(EMPLOYEE_SCOPE_KEY, true);
