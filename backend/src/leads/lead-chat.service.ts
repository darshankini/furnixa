import { ForbiddenException, Injectable } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LeadAccessService } from './lead-access.service.js';
import { iso, must, toUserRef, USER_REF_FIELDS, type ChatMessageDto, type UserRefDto } from './leads.types.js';

/** How many messages the first load returns; later polls only fetch messages after the last one seen */
const PAGE_SIZE = 200;

/**
 * Lead chat: everyone who can see the lead (admins, managers, the creator, and current *and*
 * previous assignees) can read and write. Once an admin closes the chat it becomes read-only.
 */
@Injectable()
export class LeadChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LeadAccessService,
  ) {}

  /** `afterId`: only messages newer than this one (used for polling) */
  async list(leadId: number, user: PublicUser, afterId?: number): Promise<ChatMessageDto[]> {
    await this.access.getViewable(leadId, user);

    let messages = this.prisma.orm.public.ChatMessage.where({ leadId }).include('user', (u) =>
      u.select(...USER_REF_FIELDS),
    );
    if (afterId !== undefined) messages = messages.where((m) => m.id.gt(afterId));

    // Newest PAGE_SIZE messages, returned oldest first
    const rows = await messages.orderBy((m) => m.id.desc()).limit(PAGE_SIZE).all();
    return rows.reverse().map(toMessageDto);
  }

  async send(leadId: number, text: string, user: PublicUser): Promise<ChatMessageDto> {
    const lead = await this.access.getViewable(leadId, user);
    if (lead.chatClosed) throw new ForbiddenException('This chat has been closed by an admin.');

    const created = await this.prisma.orm.public.ChatMessage.select('id').create({
      leadId,
      userId: user.id,
      message: text,
    });

    const message = await this.prisma.orm.public.ChatMessage.where({ id: created.id })
      .include('user', (u) => u.select(...USER_REF_FIELDS))
      .first();
    return toMessageDto(message!);
  }

  /** Admin only (checked in the controller). Closing keeps the messages; reopening allows new ones again. */
  async setClosed(leadId: number, closed: boolean, admin: PublicUser) {
    await this.access.getViewable(leadId, admin);

    const now = Temporal.Now.instant();
    const lead = await this.prisma.orm.public.Lead.where({ id: leadId })
      .select('chatClosed', 'chatClosedAt')
      .update({
        chatClosed: closed,
        chatClosedAt: closed ? now : null,
        chatClosedById: closed ? admin.id : null,
      });

    return {
      chatClosed: lead!.chatClosed,
      chatClosedAt: iso(lead!.chatClosedAt),
      chatClosedBy: closed ? toUserRef(admin) : null,
    };
  }
}

function toMessageDto(m: {
  id: number;
  message: string;
  createdAt: { toString(): string };
  user: UserRefDto | null;
}): ChatMessageDto {
  return { id: m.id, message: m.message, user: toUserRef(must(m.user)), createdAt: iso(m.createdAt) };
}
