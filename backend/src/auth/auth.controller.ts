import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AUTH_COOKIE, type PublicUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true, // JavaScript in the browser cannot read the token
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/',
    };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.auth.login(dto.email.trim().toLowerCase(), dto.password);
    res.cookie(AUTH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: Number(this.config.get('JWT_EXPIRES_IN_SECONDS', 86400)) * 1000,
    });
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, this.cookieOptions());
    return { message: 'Logged out.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PublicUser) {
    return { user };
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email.trim().toLowerCase());
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}
