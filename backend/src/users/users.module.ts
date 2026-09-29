import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard + JwtService
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
