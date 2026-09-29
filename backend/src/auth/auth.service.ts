import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toPublicUser,
  type JwtPayload,
  type PublicUser,
  type ResetTokenPayload,
  type User,
} from './auth.types.js';

const INVALID_RESET_LINK = 'This reset link is invalid or has expired.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
    const user = await this.prisma.orm.public.User.where({ email }).first();

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Your account is disabled. Contact the administrator.');
    }

    const payload: JwtPayload = { sub: user.id };
    const token = await this.jwt.signAsync(payload);

    return { user: toPublicUser(user), token };
  }

  /**
   * The reset token is a short-lived JWT signed with JWT_SECRET + the user's current
   * password hash. Once the password changes, the hash changes, so the link stops
   * working: it can only be used once, and no extra database table is needed.
   */
  private resetSecret(user: User): string {
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:${user.passwordHash}`;
  }

  async forgotPassword(email: string): Promise<{ message: string; devResetLink?: string }> {
    // Same message whether or not the email exists, so nobody can check which emails are registered
    const result: { message: string; devResetLink?: string } = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    const user = await this.prisma.orm.public.User.where({ email, isActive: true }).first();
    if (!user) return result;

    const ttlMinutes = Number(this.config.get('RESET_TOKEN_TTL_MINUTES', 30));
    const payload: ResetTokenPayload = { sub: user.id, purpose: 'password-reset' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.resetSecret(user),
      expiresIn: ttlMinutes * 60,
    });

    const link = `${this.config.getOrThrow<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.mail.send(
      user.email,
      'Furnixa - Reset your password',
      `Hello ${user.firstName},\n\n` +
        `We received a request to reset your Furnixa password.\n` +
        `Open this link within ${ttlMinutes} minutes:\n\n${link}\n\n` +
        `If you did not request this, you can ignore this email.`,
    );

    if (this.config.get('NODE_ENV') !== 'production') {
      result.devResetLink = link;
    }
    return result;
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    // Read the user id without verifying yet: the signing secret depends on that user
    const unverified: unknown = this.jwt.decode(token);
    const userId = (unverified as Partial<ResetTokenPayload> | null)?.sub;
    if (typeof userId !== 'number') throw new BadRequestException(INVALID_RESET_LINK);

    const user = await this.prisma.orm.public.User.where({ id: userId, isActive: true }).first();
    if (!user) throw new BadRequestException(INVALID_RESET_LINK);

    try {
      const payload = await this.jwt.verifyAsync<ResetTokenPayload>(token, {
        secret: this.resetSecret(user),
      });
      if (payload.purpose !== 'password-reset') throw new Error('wrong purpose');
    } catch {
      throw new BadRequestException(INVALID_RESET_LINK);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.orm.public.User.where({ id: user.id }).update({
      passwordHash,
      updatedAt: Temporal.Now.instant(),
    });

    return { message: 'Your password has been updated. Please sign in.' };
  }
}
