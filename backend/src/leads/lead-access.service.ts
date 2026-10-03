import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hasRole, LEAD_MANAGE_ROLES, LEAD_VIEW_ALL_ROLES } from './leads.types.js';

const NO_ACCESS = 'You do not have access to this lead.';

/**
 * One place for the "who can see / change this lead" rules, used by the lead, chat and document services.
 *
 * - Admins and managers can see every lead.
 * - Everyone else can see a lead they created, or were ever assigned to (current or previous assignee).
 *   Previous assignees keep access so they can still read and write in the lead's chat.
 */
@Injectable()
export class LeadAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** The lead's basic fields, or an error if it does not exist or the user may not see it */
  async getViewable(leadId: number, user: PublicUser) {
    const lead = await this.prisma.orm.public.Lead.select('id', 'status', 'createdById', 'chatClosed')
      .where({ id: leadId })
      .first();
    if (!lead) throw new NotFoundException('Lead not found.');

    if (!hasRole(user, LEAD_VIEW_ALL_ROLES) && !(await this.isInvolved(lead, user.id))) {
      throw new ForbiddenException(NO_ACCESS);
    }
    return lead;
  }

  /** Like getViewable, but the user must also be allowed to edit, move and assign leads */
  async getManageable(leadId: number, user: PublicUser) {
    if (!hasRole(user, LEAD_MANAGE_ROLES)) throw new ForbiddenException('You do not have permission to do this.');
    return this.getViewable(leadId, user);
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
