import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import path from 'node:path';
import { CLIENT_ROLE, type PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CHAT_ALLOWED_EXTENSIONS, chatTypeFor } from './chat-attachments.js';
import { cleanName, FileStorageService, type UploadedFileData } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import { CHAT_SENDER_TYPE, iso, must, toUserRef, USER_REF_FIELDS, type ChatAttachmentDto, type ChatMessageDto, type UserRefDto } from './leads.types.js';

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
  ) {}

  /** `afterId`: only messages newer than this one (used for polling) */
  async list(leadId: number, user: PublicUser, afterId?: number): Promise<ChatMessageDto[]> {
    await this.access.getViewable(leadId, user);

    let messages = this.prisma.orm.public.ChatMessage.where({ leadId })
      .include('user', (u) => u.select(...USER_REF_FIELDS))
      .include('client', (c) => c.select(...CLIENT_SENDER_FIELDS));
    if (afterId !== undefined) messages = messages.where((m) => m.id.gt(afterId));

    // Newest PAGE_SIZE messages, returned oldest first
    const rows = await messages.orderBy((m) => m.id.desc()).limit(PAGE_SIZE).all();
    return rows.reverse().map(toMessageDto);
  }

  /** A message is text, a file, or both (the text is then the caption) */
  async send(leadId: number, text: string, file: UploadedFileData | undefined, user: PublicUser): Promise<ChatMessageDto> {
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
    return toMessageDto(message!);
  }

  /** Anyone who can read the chat can open its files, even after the chat is closed */
  async attachment(leadId: number, messageId: number, user: PublicUser) {
    await this.access.getViewable(leadId, user);

    const m = await this.prisma.orm.public.ChatMessage.select('attachmentName', 'attachmentPath')
      .where({ id: messageId, leadId })
      .first();
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
