import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { canManagePhase, hasRole, LEAD_VIEW_ALL_ROLES } from './leads.types.js';

const NO_ACCESS = 'You do not have access to this lead.';

/**
 * One place for the "who can see / change this lead" rules, used by the lead, chat and document services.
 *
 * - Admins and managers can see and manage every lead, in every phase.
 * - Everyone else can see a lead they created, or were ever assigned to (current or previous assignee).
 *   Previous assignees keep access so they can still read and write in the lead's chat.
 * - Managing (edit, move, assign) also needs the role that owns the lead's current phase.
 * - A client (userType 'client') can only see leads where they are the lead's client, and can never manage one.
 */
@Injectable()
export class LeadAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** The lead's basic fields, or an error if it does not exist or the user may not see it */
  async getViewable(leadId: number, user: PublicUser) {
    const lead = await this.prisma.orm.public.Lead.select('id', 'status', 'clientId', 'createdById', 'chatClosed')
      .where({ id: leadId })
      .first();
    if (!lead) throw new NotFoundException('Lead not found.');

    // A client's id is a Client id, so it must never be compared with createdById or assignment user ids
    if (user.userType === 'client') {
      if (lead.clientId !== user.id) throw new ForbiddenException(NO_ACCESS);
      return lead;
    }

    if (!hasRole(user, LEAD_VIEW_ALL_ROLES) && !(await this.isInvolved(lead, user.id))) {
      throw new ForbiddenException(NO_ACCESS);
    }
    return lead;
  }

  /** Like getViewable, but the user must also be allowed to manage the lead's current phase (admins and managers: any phase) */
  async getManageable(leadId: number, user: PublicUser) {
    const lead = await this.getViewable(leadId, user);
    if (user.userType === 'client' || !canManagePhase(user.role, lead.status)) throw new ForbiddenException('You do not have permission to do this.');
    return lead;
  }

  /** Created the lead, or has an assignment row (active or not) */
  async isInvolved(lead: { id: number; createdById: number | null }, userId: number): Promise<boolean> {
    if (lead.createdById === userId) return true;
    const row = await this.prisma.orm.public.LeadUser.select('id').where({ leadId: lead.id, userId }).first();
    return row !== null;
  }

  /** Currently assigned (not taken off the lead) */
  async isActiveAssignee(leadId: number, userId: number): Promise<boolean> {
    const row = await this.prisma.orm.public.LeadUser.select('id')
      .where({ leadId, userId })
      .where((a) => a.unassignedAt.isNull())
      .first();
    return row !== null;
  }
}
