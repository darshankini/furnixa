import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, or } from '@prisma/orm-postgres/orm-client';
import path from 'node:path';
import { CLIENT_ROLE, type PublicUser, type UserType } from '../auth/auth.types.js';
import { NotificationsService, type MentionTarget } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GLOBAL_ROLES } from '../users/users.types.js';
import { CHAT_ALLOWED_EXTENSIONS, chatTypeFor } from './chat-attachments.js';
import { cleanName, FileStorageService, type UploadedFileData } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import { CHAT_SENDER_TYPE, iso, must, toUserRef, USER_REF_FIELDS, type ChatAttachmentDto, type ChatMessageDto, type MentionableDto, type UserRefDto } from './leads.types.js';

/** How many messages the first load returns; later polls only fetch messages after the last one seen */
const PAGE_SIZE = 200;

/**
 * Lead chat: everyone who can see the lead (admins, managers, the creator, and current *and*
 * previous assignees) can read and write, and so can the lead's own client.
 * Once an admin closes the chat it becomes read-only for everyone, clients included.
 */
@Injectable()
export class LeadChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LeadAccessService,
    private readonly storage: FileStorageService,
    private readonly notifications: NotificationsService,
  ) {}

  /** `afterId`: only messages newer than this one (used for polling) */
  async list(leadId: number, user: PublicUser, afterId?: number): Promise<ChatMessageDto[]> {
    let messages = this.prisma.orm.public.ChatMessage.where({ leadId })
      .include('user', (u) => u.select(...USER_REF_FIELDS))
      .include('client', (c) => c.select(...CLIENT_SENDER_FIELDS));
    if (afterId !== undefined) messages = messages.where((m) => m.id.gt(afterId));

    // Access check and read run together; the rows are only returned if the check passes.
    // Newest PAGE_SIZE messages, returned oldest first
    const [, rows] = await Promise.all([
      this.access.getViewable(leadId, user),
      messages.orderBy((m) => m.id.desc()).limit(PAGE_SIZE).all(),
    ]);
    return rows.reverse().map(toMessageDto);
  }

  /** A message is text, a file, or both (the text is then the caption) */
  async send(
    leadId: number,
    text: string,
    file: UploadedFileData | undefined,
    mentions: string | undefined,
    user: PublicUser,
  ): Promise<ChatMessageDto> {
    if (!text && !file) throw new BadRequestException('Write a message or attach a file.');

    const lead = await this.access.getViewable(leadId, user);
    if (lead.chatClosed) throw new ForbiddenException('This chat has been closed by an admin.');

    let attachment = null;
    if (file) {
      const name = cleanName(file.originalname);
      const type = chatTypeFor(path.extname(name).slice(1));
      if (!type) {
        throw new BadRequestException(`This file type is not allowed. Allowed: ${CHAT_ALLOWED_EXTENSIONS.join(', ')}.`);
      }
      const stored = await this.storage.save(`leads/${leadId}/chat`, file);
      attachment = {
        attachmentName: name,
        attachmentPath: stored.relativePath,
        attachmentMimeType: type.mimeType,
        attachmentSize: BigInt(file.size),
      };
    }

    // userType records which table the sender is in, and their id goes in that table's column,
    // so a client id is never stored as a user id
    let created;
    try {
      created = await this.prisma.orm.public.ChatMessage.select('id').create({
        leadId,
        userType: CHAT_SENDER_TYPE[user.userType],
        ...(user.userType === 'client' ? { clientId: user.id } : { userId: user.id }),
        message: text,
        ...attachment,
      });
    } catch (err) {
      // Don't leave an orphan file on disk if the database insert failed
      if (attachment) await this.storage.remove(attachment.attachmentPath);
      throw err;
    }

    const message = await this.prisma.orm.public.ChatMessage.where({ id: created.id })
      .include('user', (u) => u.select(...USER_REF_FIELDS))
      .include('client', (c) => c.select(...CLIENT_SENDER_FIELDS))
      .first();
    await this.notifyMentioned(lead, created.id, text, mentions, user);
    return toMessageDto(message!);
  }

  /** People the sender can @mention: everyone else who can read this chat */
  async mentionable(leadId: number, user: PublicUser): Promise<MentionableDto[]> {
    const [, people] = await Promise.all([this.access.getViewable(leadId, user), this.participants(leadId)]);
    return people
      .filter((p) => !isSelf(p, user))
      .map((p) => ({ type: p.type, id: p.id, firstName: p.firstName, lastName: p.lastName, role: p.role }));
  }

  /**
   * Notifies the people in `mentions` ("user:12,client:3") who can read this chat and whose
   * "@First Last" is really in the text. Anything else in the list is ignored, so a crafted
   * request cannot notify outsiders or the sender.
   */
  private async notifyMentioned(
    lead: { id: number },
    messageId: number,
    text: string,
    mentions: string | undefined,
    user: PublicUser,
  ): Promise<void> {
    const keys = new Set(mentions?.split(',') ?? []);
    if (keys.size === 0) return;

    const lowerText = text.toLowerCase();
    const targets = (await this.participants(lead.id)).filter(
      (p) =>
        keys.has(`${p.type}:${p.id}`) &&
        !isSelf(p, user) &&
        lowerText.includes(`@${p.firstName} ${p.lastName}`.toLowerCase()),
    );
    if (targets.length === 0) return;

    const { projectName } = must(await this.prisma.orm.public.Lead.select('projectName').where({ id: lead.id }).first());
    await this.notifications.notifyMentions({ lead: { id: lead.id, projectName }, messageId, actor: user, text, targets });
  }

  /**
   * Everyone who can read the chat: admins and managers, the lead's creator, anyone ever assigned
   * to it (active staff accounts only), and the lead's client. Same rules as LeadAccessService.
   */
  private async participants(leadId: number): Promise<Participant[]> {
    // Two independent queries, sent together; relation filters avoid a separate lookup of the lead first
    const [users, client] = await Promise.all([
      this.prisma.orm.public.User.select('id', 'firstName', 'lastName', 'role', 'email')
        .where((u) =>
          and(
            u.isActive.eq(true),
            or(
              u.role.in([...GLOBAL_ROLES]),
              u.createdLeads.some((l) => l.id.eq(leadId)),
              u.assignments.some((a) => a.leadId.eq(leadId)),
            ),
          ),
        )
        .orderBy([(u) => u.firstName.asc(), (u) => u.lastName.asc()])
        .all(),
      this.prisma.orm.public.Client.select('id', 'firstName', 'lastName', 'email')
        .where((c) => c.leads.some((l) => l.id.eq(leadId)))
        .first(),
    ]);

    const people: Participant[] = users.map((u) => ({ type: 'user', ...u }));
    if (client) people.push({ type: 'client', ...client, role: CLIENT_ROLE });
    return people;
  }

  /** Anyone who can read the chat can open its files, even after the chat is closed */
  async attachment(leadId: number, messageId: number, user: PublicUser) {
    const [, m] = await Promise.all([
      this.access.getViewable(leadId, user),
      this.prisma.orm.public.ChatMessage.select('attachmentName', 'attachmentPath').where({ id: messageId, leadId }).first(),
    ]);
    if (!m?.attachmentPath || !m.attachmentName) throw new NotFoundException('File not found.');

    const type = chatTypeFor(path.extname(m.attachmentPath).slice(1));
    const absolutePath = await this.storage.locate(m.attachmentPath);
    if (!type || !absolutePath) throw new NotFoundException('This file is missing from the server.');

    return { absolutePath, name: m.attachmentName, ...type };
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

const CLIENT_SENDER_FIELDS = ['id', 'firstName', 'lastName'] as const;

type Participant = MentionTarget & { role: UserRefDto['role'] };

function isSelf(p: { type: UserType; id: number }, user: PublicUser): boolean {
  return p.type === user.userType && p.id === user.id;
}

/** userType decides whose details are the sender: the Client row (2) or the User row (1) */
function toMessageDto(m: {
  id: number;
  message: string;
  userType: number;
  attachmentName: string | null;
  attachmentPath: string | null;
  attachmentMimeType: string | null;
  attachmentSize: bigint | null;
  createdAt: { toString(): string };
  user: UserRefDto | null;
  client: { id: number; firstName: string; lastName: string } | null;
}): ChatMessageDto {
  const base = { id: m.id, message: m.message, attachment: toAttachmentDto(m), createdAt: iso(m.createdAt) };
  if (m.userType === CHAT_SENDER_TYPE.client) {
    return { ...base, senderType: 'client', user: { ...must(m.client), role: CLIENT_ROLE } };
  }
  return { ...base, senderType: 'user', user: toUserRef(must(m.user)) };
}

function toAttachmentDto(m: {
  attachmentName: string | null;
  attachmentPath: string | null;
  attachmentMimeType: string | null;
  attachmentSize: bigint | null;
}): ChatAttachmentDto | null {
  if (!m.attachmentName || !m.attachmentPath) return null;
  const type = chatTypeFor(path.extname(m.attachmentPath).slice(1));
  return {
    name: m.attachmentName,
    kind: type?.kind ?? 'file',
    mimeType: m.attachmentMimeType ?? type?.mimeType ?? 'application/octet-stream',
    size: m.attachmentSize === null ? null : Number(m.attachmentSize),
  };
}
