import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicUser, UserType } from '../auth/auth.types.js';
import { CHAT_SENDER_TYPE, iso } from '../leads/leads.types.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** How many notifications the bell shows */
const LIST_LIMIT = 30;
/** Someone who wrote in the chat this recently is probably looking at it, so no email */
const ACTIVE_MINUTES = 5;
const PREVIEW_LENGTH = 140;

/** A person who can be @mentioned on a lead (a staff user or the lead's client) */
export interface MentionTarget {
  type: UserType;
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface NotificationDto {
  id: number;
  type: 'MENTION';
  leadId: number;
  chatMessageId: number | null;
  actorName: string;
  preview: string;
  read: boolean;
  createdAt: string;
}

/**
 * In-app notifications (the bell), plus an email for each @mention.
 * Recipients are stored like chat senders: recipientType 1 = User (userId), 2 = Client (clientId).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Saves one notification per person, then emails them in the background (the chat reply doesn't wait) */
  async notifyMentions(input: {
    lead: { id: number; projectName: string };
    messageId: number;
    actor: PublicUser;
    text: string;
    targets: MentionTarget[];
  }): Promise<void> {
    if (input.targets.length === 0) return;

    const actorName = `${input.actor.firstName} ${input.actor.lastName}`.trim();
    const preview = toPreview(input.text);

    await this.prisma.orm.public.Notification.select('id').createAll(
      input.targets.map((t) => ({
        recipientType: CHAT_SENDER_TYPE[t.type],
        ...(t.type === 'client' ? { clientId: t.id } : { userId: t.id }),
        type: 'MENTION' as const,
        leadId: input.lead.id,
        chatMessageId: input.messageId,
        actorName,
        preview,
      })),
    );

    void this.emailMentions(input.lead, input.messageId, actorName, preview, input.targets).catch((err) =>
      this.logger.error(`Mention emails for lead ${input.lead.id} failed`, err),
    );
  }

  async list(user: PublicUser): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
    const mine = this.mine(user);
    const [rows, unread] = await Promise.all([
      mine.orderBy((n) => n.id.desc()).limit(LIST_LIMIT).all(),
      mine.where((n) => n.readAt.isNull()).aggregate((a) => ({ count: a.count() })),
    ]);
    return { notifications: rows.map(toDto), unreadCount: unread.count };
  }

  async markRead(user: PublicUser, id: number): Promise<void> {
    const updated = await this.mine(user)
      .where({ id })
      .select('id')
      .update({ readAt: Temporal.Now.instant() });
    if (!updated) throw new NotFoundException('Notification not found.');
  }

  async markAllRead(user: PublicUser): Promise<void> {
    await this.unread(user).select('id').updateAll({ readAt: Temporal.Now.instant() });
  }

  /** Opening a lead's chat counts as reading its mentions */
  async markLeadRead(user: PublicUser, leadId: number): Promise<void> {
    await this.unread(user).where({ leadId }).select('id').updateAll({ readAt: Temporal.Now.instant() });
  }

  /** Notifications addressed to this person; a client id is only ever matched against clientId */
  private mine(user: PublicUser) {
    return this.prisma.orm.public.Notification.where(user.userType === 'client' ? { clientId: user.id } : { userId: user.id });
  }

  private unread(user: PublicUser) {
    return this.mine(user).where((n) => n.readAt.isNull());
  }

  private async emailMentions(
    lead: { id: number; projectName: string },
    messageId: number,
    actorName: string,
    preview: string,
    targets: MentionTarget[],
  ): Promise<void> {
    const since = Temporal.Now.instant().subtract({ minutes: ACTIVE_MINUTES });
    const frontend = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/+$/, '');
    const link = `${frontend}/leads/${lead.id}?message=${messageId}`;

    for (const t of targets) {
      if (!t.email) continue;

      const recentlyActive = await this.prisma.orm.public.ChatMessage.select('id')
        .where(t.type === 'client' ? { leadId: lead.id, clientId: t.id } : { leadId: lead.id, userId: t.id })
        .where((m) => m.createdAt.gte(since))
        .first();
      if (recentlyActive) continue;

      await this.mail.send(
        t.email,
        `${actorName} mentioned you in ${lead.projectName}`,
        [
          `Hi ${t.firstName},`,
          '',
          `${actorName} mentioned you in the chat for "${lead.projectName}":`,
          '',
          `  "${preview}"`,
          '',
          `Open the chat: ${link}`,
          '',
          '— Furnixa',
        ].join('\n'),
      );
    }
  }
}

function toPreview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return 'Sent an attachment';
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat;
}

function toDto(n: {
  id: number;
  type: 'MENTION';
  leadId: number;
  chatMessageId: number | null;
  actorName: string;
  preview: string;
  readAt: unknown;
  createdAt: { toString(): string };
}): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    leadId: n.leadId,
    chatMessageId: n.chatMessageId,
    actorName: n.actorName,
    preview: n.preview,
    read: n.readAt !== null,
    createdAt: iso(n.createdAt),
  };
}
