import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { LeadsService } from './leads.service.js';
import { LEAD_CREATE_ROLES, LEAD_DELETE_ROLES, LEAD_MANAGE_ROLES } from './leads.types.js';

/** Which leads a user can see is decided per lead in LeadAccessService; the role lists here gate the actions */
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  async findAll(@CurrentUser() user: PublicUser, @Query() query: ListLeadsQueryDto) {
    return { leads: await this.leads.findAll(user, query) };
  }

  /** Declared before ':id' so "assignable-users" is not parsed as an id */
  @Get('assignable-users')
  @Roles(...LEAD_CREATE_ROLES, ...LEAD_MANAGE_ROLES)
  async assignableUsers() {
    return { users: await this.leads.assignableUsers() };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: PublicUser) {
    return { lead: await this.leads.findOne(id, user) };
  }

  @Post()
  @Roles(...LEAD_CREATE_ROLES)
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: PublicUser) {
    return { lead: await this.leads.create(dto, user) };
  }

  @Patch(':id')
  @Roles(...LEAD_MANAGE_ROLES)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeadDto, @CurrentUser() user: PublicUser) {
    return { lead: await this.leads.update(id, dto, user) };
  }

  /** Move to a phase and/or hand the lead over to other users (history is recorded) */
  @Post(':id/assign')
  @HttpCode(200)
  @Roles(...LEAD_MANAGE_ROLES)
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignLeadDto, @CurrentUser() user: PublicUser) {
    return { lead: await this.leads.assign(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(...LEAD_DELETE_ROLES)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.leads.remove(id);
    return { message: 'Lead deleted.' };
  }
}
