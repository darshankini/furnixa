import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { SetChatStatusDto } from './dto/set-chat-status.dto.js';
import { LeadChatService } from './lead-chat.service.js';
import { LEAD_CHAT_CLOSE_ROLES } from './leads.types.js';

@Controller('leads/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadChatController {
  constructor(private readonly chat: LeadChatService) {}

  /** ?after=<messageId> returns only newer messages, so the page can poll cheaply */
  @Get('messages')
  async list(
    @Param('id', ParseIntPipe) id: number,
    @Query('after', new ParseIntPipe({ optional: true })) after: number | undefined,
    @CurrentUser() user: PublicUser,
  ) {
    return { messages: await this.chat.list(id, user, after) };
  }

  @Post('messages')
  async send(@Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto, @CurrentUser() user: PublicUser) {
    return { message: await this.chat.send(id, dto.message, user) };
  }

  @Patch('chat')
  @Roles(...LEAD_CHAT_CLOSE_ROLES)
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetChatStatusDto, @CurrentUser() user: PublicUser) {
    return { chat: await this.chat.setClosed(id, dto.closed, user) };
  }
}
