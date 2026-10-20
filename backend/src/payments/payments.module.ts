import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard + JwtService
  controllers: [PaymentsController],
  providers: [PaymentsService, RolesGuard],
})
export class PaymentsModule {}
