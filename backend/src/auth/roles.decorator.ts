import { SetMetadata } from '@nestjs/common';
import type { UserRole } from './auth.types.js';

export const ROLES_KEY = 'roles';

/** Restrict a route to users with one of these roles. Use together with JwtAuthGuard and RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
