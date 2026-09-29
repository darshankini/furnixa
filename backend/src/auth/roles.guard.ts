import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest, UserRole } from './auth.types.js';
import { ROLES_KEY } from './roles.decorator.js';

/** Must run after JwtAuthGuard, which puts the signed-in user on the request */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to do this.');
    }
    return true;
  }
}
