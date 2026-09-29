import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, PublicUser } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
