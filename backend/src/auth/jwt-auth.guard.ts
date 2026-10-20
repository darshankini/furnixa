import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { ALLOW_CLIENTS_KEY } from './allow-clients.decorator.js';
import {
  AUTH_COOKIE,
  CLIENT_ROLE,
  toPublicUser,
  type AuthenticatedRequest,
  type JwtPayload,
  type PublicUser,
} from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
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

    // The token says which table `sub` belongs to; tokens issued before userType existed are staff users
    const user = payload.userType === 'client' ? await this.loadClient(payload.sub) : await this.loadUser(payload.sub);
    if (!user) throw new UnauthorizedException('Not authenticated');

    // Clients only reach routes marked @AllowClients(); every other route is staff-only
    if (user.userType === 'client' && !this.allowsClients(context)) {
      throw new ForbiddenException('You do not have permission to do this.');
    }

    req.user = user;
    return true;
  }

  private allowsClients(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_CLIENTS_KEY, [context.getHandler(), context.getClass()]) ===
      true
    );
  }

  // Re-check the database so disabled users are logged out immediately
  private async loadUser(id: number): Promise<PublicUser | null> {
    const user = await this.prisma.orm.public.User.select('id', 'firstName', 'lastName', 'email', 'role')
      .where({ id, isActive: true })
      .first();
    return user ? toPublicUser(user, 'user') : null;
  }

  private async loadClient(id: number): Promise<PublicUser | null> {
    const client = await this.prisma.orm.public.Client.select('id', 'firstName', 'lastName', 'email')
      .where({ id })
      .first();
    return client ? toPublicUser({ ...client, email: client.email ?? '', role: CLIENT_ROLE }, 'client') : null;
  }
}
