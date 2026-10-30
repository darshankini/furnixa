import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AllowClients } from '../auth/allow-clients.decorator.js';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { MAX_CHAT_UPLOAD_BYTES } from './chat-attachments.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { SetChatStatusDto } from './dto/set-chat-status.dto.js';
import type { UploadedFileData } from './file-storage.service.js';
import { LeadChatService } from './lead-chat.service.js';
import { LEAD_CHAT_CLOSE_ROLES } from './leads.types.js';

@Controller('leads/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadChatController {
  constructor(private readonly chat: LeadChatService) {}

  /** ?after=<messageId> returns only newer messages, so the page can poll cheaply */
  @Get('messages')
  @AllowClients()
  async list(
    @Param('id', ParseIntPipe) id: number,
    @Query('after', new ParseIntPipe({ optional: true })) after: number | undefined,
    @CurrentUser() user: PublicUser,
  ) {
    return { messages: await this.chat.list(id, user, after) };
  }

  /** JSON `{ message }`, or multipart/form-data with `file` and an optional `message` caption */
  @Post('messages')
  @AllowClients()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CHAT_UPLOAD_BYTES, files: 1 } }))
  async send(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @UploadedFile() file: UploadedFileData | undefined,
    @CurrentUser() user: PublicUser,
  ) {
    return { message: await this.chat.send(id, dto.message ?? '', file, dto.mentions, user) };
  }

  /** People who can be @mentioned in this chat (everyone else who can read it) */
  @Get('mentionable')
  @AllowClients()
  async mentionable(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: PublicUser) {
    return { people: await this.chat.mentionable(id, user) };
  }

  /**
   * Photos and videos open inline (so <img>/<video> can show them; sendFile handles Range for seeking),
   * everything else downloads. ?download=true forces a download. The Content-Type comes from our
   * allowlist, never from the uploader, and nosniff stops the browser from guessing another one.
   */
  @Get('messages/:messageId/attachment')
  @AllowClients()
  async attachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('download', new ParseBoolPipe({ optional: true })) download: boolean | undefined,
    @CurrentUser() user: PublicUser,
    @Res() res: Response,
  ) {
    const file = await this.chat.attachment(id, messageId, user);
    const inline = !download && file.kind !== 'file';
    res.sendFile(file.absolutePath, {
      dotfiles: 'allow',
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  }

  @Patch('chat')
  @Roles(...LEAD_CHAT_CLOSE_ROLES)
  async setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetChatStatusDto, @CurrentUser() user: PublicUser) {
    return { chat: await this.chat.setClosed(id, dto.closed, user) };
  }
}
