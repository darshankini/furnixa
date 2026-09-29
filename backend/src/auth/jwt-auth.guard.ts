import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUTH_COOKIE, type AuthenticatedRequest, type JwtPayload } from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof token !== 'string') throw new UnauthorizedException('Not authenticated');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Re-check the database so disabled users are logged out immediately
    const user = await this.prisma.orm.public.User.select('id', 'firstName', 'lastName', 'email', 'role')
      .where({ id: payload.sub, isActive: true })
      .first();
    if (!user) throw new UnauthorizedException('Not authenticated');

    req.user = user;
    return true;
  }
}
