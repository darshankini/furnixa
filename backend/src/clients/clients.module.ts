import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard + JwtService
  controllers: [ClientsController],
  providers: [ClientsService, RolesGuard],
})
export class ClientsModule {}
