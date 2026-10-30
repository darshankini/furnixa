import { Controller, Get, HttpCode, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { AllowClients } from '../auth/allow-clients.decorator.js';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

/** Everyone, clients included, only ever sees and changes their own notifications */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@AllowClients()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Newest first, plus the unread count for the bell badge */
  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.notifications.list(user);
  }

  @Patch('read-all')
  @HttpCode(200)
  async readAll(@CurrentUser() user: PublicUser) {
    await this.notifications.markAllRead(user);
    return { message: 'All notifications marked as read.' };
  }

  @Patch('leads/:leadId/read')
  @HttpCode(200)
  async readLead(@Param('leadId', ParseIntPipe) leadId: number, @CurrentUser() user: PublicUser) {
    await this.notifications.markLeadRead(user, leadId);
    return { message: 'Notifications marked as read.' };
  }

  @Patch(':id/read')
  @HttpCode(200)
  async read(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: PublicUser) {
    await this.notifications.markRead(user, id);
    return { message: 'Notification marked as read.' };
  }
}
