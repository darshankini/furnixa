import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';
import { PAYMENT_ROLES } from './payments.types.js';

/** Payment follow-up: accounts, admins and managers only (clients never reach these routes) */
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PAYMENT_ROLES)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  async findAll() {
    return { leads: await this.payments.findAll() };
  }

  @Get('leads/:leadId')
  async findForLead(@Param('leadId', ParseIntPipe) leadId: number) {
    return { lead: await this.payments.findForLead(leadId) };
  }

  @Post('leads/:leadId')
  async create(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: PublicUser,
  ) {
    return { lead: await this.payments.create(leadId, dto, user) };
  }
}
