import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AssignLeadDto } from './dto/assign-lead.dto.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';
import { FileStorageService } from './file-storage.service.js';
import { LeadAccessService } from './lead-access.service.js';
import {
  hasRole,
  iso,
  LEAD_VIEW_ALL_ROLES,
  must,
  toUserRef,
  USER_REF_FIELDS,
  type LeadDetailDto,
  type LeadStatus,
  type LeadSummaryDto,
  type UserRefDto,
} from './leads.types.js';

const CLIENT_FIELDS = ['id', 'firstName', 'lastName', 'mobile', 'email'] as const;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LeadAccessService,
    private readonly storage: FileStorageService,
  ) {}

  /** Leads with their client, creator and current assignees */
  private withSummary() {
    return this.prisma.orm.public.Lead.include('client', (c) => c.select(...CLIENT_FIELDS))
      .include('createdBy', (u) => u.select(...USER_REF_FIELDS))
      .include('assignments', (a) =>
        a
          .where((x) => x.unassignedAt.isNull())
          .orderBy((x) => x.assignedAt.asc())
          .include('user', (u) => u.select(...USER_REF_FIELDS)),
      );
  }

  async findAll(user: PublicUser, query: ListLeadsQueryDto): Promise<LeadSummaryDto[]> {
    let leads = this.withSummary();
    if (query.status) leads = leads.where({ status: query.status });
    if (query.clientId) leads = leads.where({ clientId: query.clientId });

    // Everyone except admins/managers only sees leads they created or were ever assigned to
    if (!hasRole(user, LEAD_VIEW_ALL_ROLES)) {
      leads = leads.where((l) => or(l.createdById.eq(user.id), l.assignments.some((a) => a.userId.eq(user.id))));
    }

    const rows = await leads.orderBy([(l) => l.updatedAt.desc(), (l) => l.id.desc()]).all();
    return rows.map((lead) => ({
      id: lead.id,
      projectName: lead.projectName,
      status: lead.status,
      client: must(lead.client),
      createdBy: toUserRef(lead.createdBy),
      assignees: lead.assignments.map((a) => toUserRef(must(a.user))),
      chatClosed: lead.chatClosed,
      createdAt: iso(lead.createdAt),
      updatedAt: iso(lead.updatedAt),
    }));
  }

  async findOne(id: number, user: PublicUser): Promise<LeadDetailDto> {
    await this.access.getViewable(id, user);

    const lead = await this.withSummary()
      .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
      .include('lastUpdatedBy', (u) => u.select(...USER_REF_FIELDS))
      .include('chatClosedBy', (u) => u.select(...USER_REF_FIELDS))
      .where({ id })
      .first();
    if (!lead) throw new NotFoundException('Lead not found.');

    // Every assignment, current and previous, newest first
    const assignments = await this.prisma.orm.public.LeadUser.where({ leadId: id })
      .include('user', (u) => u.select(...USER_REF_FIELDS))
      .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
      .orderBy([(a) => a.assignedAt.desc(), (a) => a.id.desc()])
      .all();

    const history = await this.prisma.orm.public.LeadStatusHistory.where({ leadId: id })
      .include('changedBy', (u) => u.select(...USER_REF_FIELDS))
      .include('assignedBy', (u) => u.select(...USER_REF_FIELDS))
      .include('assignedTo', (u) => u.select(...USER_REF_FIELDS))
      .orderBy([(h) => h.changedAt.desc(), (h) => h.id.desc()])
      .all();

    return {
      id: lead.id,
      projectName: lead.projectName,
      status: lead.status,
      client: must(lead.client),
      createdBy: toUserRef(lead.createdBy),
      assignees: lead.assignments.map((a) => toUserRef(must(a.user))),
      chatClosed: lead.chatClosed,
      createdAt: iso(lead.createdAt),
      updatedAt: iso(lead.updatedAt),
      assignedBy: toUserRef(lead.assignedBy),
      lastUpdatedBy: toUserRef(lead.lastUpdatedBy),
      chatClosedAt: iso(lead.chatClosedAt),
      chatClosedBy: toUserRef(lead.chatClosedBy),
      assignments: assignments.map((a) => ({
        user: toUserRef(must(a.user)),
        role: a.role,
        assignedBy: toUserRef(a.assignedBy),
        assignedAt: iso(a.assignedAt),
        unassignedAt: iso(a.unassignedAt),
        isActive: a.unassignedAt === null,
      })),
      history: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: toUserRef(must(h.changedBy)),
        assignedBy: toUserRef(h.assignedBy),
        assignedTo: toUserRef(h.assignedTo),
        note: h.note,
        changedAt: iso(h.changedAt),
      })),
    };
  }

  /** Active users that a lead can be assigned to (for the assign picker) */
  async assignableUsers(): Promise<UserRefDto[]> {
    const users = await this.prisma.orm.public.User.select(...USER_REF_FIELDS)
      .where({ isActive: true })
      .orderBy([(u) => u.firstName.asc(), (u) => u.lastName.asc()])
      .all();
    return users.map((u) => toUserRef(u));
  }

  async create(dto: CreateLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    await this.assertClientExists(dto.clientId);

    // A sales person who creates a lead owns it, so they are always assigned
    const assigneeIds = [...new Set([...(actor.role === 'SALES' ? [actor.id] : []), ...(dto.assigneeIds ?? [])])];
    await this.assertAssignable(assigneeIds);

    const id = await this.prisma.db.transaction(async (tx) => {
      const lead = await tx.orm.public.Lead.select('id', 'status').create({
        clientId: dto.clientId,
        projectName: dto.projectName,
        createdById: actor.id,
        lastUpdatedById: actor.id,
        assignedById: assigneeIds.length > 0 ? actor.id : null,
      });

      await tx.orm.public.LeadStatusHistory.create({
        leadId: lead.id,
        fromStatus: null,
        toStatus: lead.status,
        changedById: actor.id,
        assignedById: null,
        assignedToId: null,
        note: 'Lead created',
      });

      for (const userId of assigneeIds) {
        await tx.orm.public.LeadUser.create({
          leadId: lead.id,
          userId,
          role: userId === actor.id ? 'PRIMARY' : 'COLLABORATOR',
          assignedById: actor.id,
        });
        await tx.orm.public.LeadStatusHistory.create({
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: lead.status,
          changedById: actor.id,
          assignedById: actor.id,
          assignedToId: userId,
          note: null,
        });
      }
      return lead.id;
    });

    return this.findOne(id, actor);
  }

  async update(id: number, dto: UpdateLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    await this.access.getManageable(id, actor);
    if (dto.clientId !== undefined) await this.assertClientExists(dto.clientId);

    await this.prisma.orm.public.Lead.where({ id }).update({
      ...(dto.clientId !== undefined && { clientId: dto.clientId }),
      ...(dto.projectName !== undefined && { projectName: dto.projectName }),
      lastUpdatedById: actor.id,
      updatedAt: Temporal.Now.instant(),
    });
    return this.findOne(id, actor);
  }

  /**
   * Hands the lead over to `dto.userIds` (optionally moving it to a new phase), keeping full history:
   * - newly assigned users get an assignment row and one history entry each (assignedBy → assignedTo)
   * - users missing from the list are taken off the lead (`unassignedAt` set) but keep chat access
   * - a phase change without new assignees still gets one history entry
   */
  async assign(id: number, dto: AssignLeadDto, actor: PublicUser): Promise<LeadDetailDto> {
    const lead = await this.access.getManageable(id, actor);
    await this.assertAssignable(dto.userIds);

    const fromStatus: LeadStatus = lead.status;
    const toStatus: LeadStatus = dto.status ?? lead.status;
    const note = dto.note ?? null;

    await this.prisma.db.transaction(async (tx) => {
      const existing = await tx.orm.public.LeadUser.select('id', 'userId', 'unassignedAt').where({ leadId: id }).all();
      const activeIds = new Set(existing.filter((a) => a.unassignedAt === null).map((a) => a.userId));
      const wanted = new Set(dto.userIds);

      const toRemove = existing.filter((a) => a.unassignedAt === null && !wanted.has(a.userId));
      const toAdd = dto.userIds.filter((userId) => !activeIds.has(userId));

      if (toAdd.length === 0 && toRemove.length === 0 && toStatus === fromStatus) {
        throw new BadRequestException('Nothing to change: same phase and same assignees.');
      }

      const now = Temporal.Now.instant();

      for (const row of toRemove) {
        await tx.orm.public.LeadUser.where({ id: row.id }).update({ unassignedAt: now });
      }

      for (const userId of toAdd) {
        const previous = existing.find((a) => a.userId === userId);
        if (previous) {
          // Was on this lead before: put them back on it
          await tx.orm.public.LeadUser.where({ id: previous.id }).update({
            unassignedAt: null,
            assignedAt: now,
            assignedById: actor.id,
          });
        } else {
          await tx.orm.public.LeadUser.create({ leadId: id, userId, assignedById: actor.id });
        }

        await tx.orm.public.LeadStatusHistory.create({
          leadId: id,
          fromStatus,
          toStatus,
          changedById: actor.id,
          assignedById: actor.id,
          assignedToId: userId,
          note,
        });
      }

      // Phase change or removals only: still record who did it
      if (toAdd.length === 0) {
        await tx.orm.public.LeadStatusHistory.create({
          leadId: id,
          fromStatus,
          toStatus,
          changedById: actor.id,
          assignedById: null,
          assignedToId: null,
          note,
        });
      }

      await tx.orm.public.Lead.where({ id }).update({
        status: toStatus,
        ...(toAdd.length > 0 && { assignedById: actor.id }),
        lastUpdatedById: actor.id,
        updatedAt: now,
      });
    });

    return this.findOne(id, actor);
  }

  async remove(id: number): Promise<void> {
    const lead = await this.prisma.orm.public.Lead.select('id').where({ id }).first();
    if (!lead) throw new NotFoundException('Lead not found.');

    // Assignments, history, messages and document rows are deleted with the lead (onDelete: Cascade)
    await this.prisma.orm.public.Lead.where({ id }).delete();
    await this.storage.removeFolder(`leads/${id}`);
  }

  private async assertClientExists(clientId: number): Promise<void> {
    const client = await this.prisma.orm.public.Client.select('id').where({ id: clientId }).first();
    if (!client) throw new BadRequestException('The selected client does not exist.');
  }

  /** Every id must be an active user */
  private async assertAssignable(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;
    const found = await this.prisma.orm.public.User.select('id')
      .where((u) => u.id.in(userIds))
      .where({ isActive: true })
      .all();
    if (found.length !== userIds.length) {
      throw new BadRequestException('One or more selected users do not exist or are inactive.');
    }
  }
}
