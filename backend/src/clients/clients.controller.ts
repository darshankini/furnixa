import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ClientsService } from './clients.service.js';
import { CLIENT_DELETE_ROLES, CLIENT_MANAGE_ROLES } from './clients.types.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

/** Every signed-in user can view clients; creating, editing and deleting are limited by role */
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  async findAll() {
    return { clients: await this.clients.findAll() };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { client: await this.clients.findOne(id) };
  }

  @Post()
  @Roles(...CLIENT_MANAGE_ROLES)
  async create(@Body() dto: CreateClientDto) {
    return { client: await this.clients.create(dto) };
  }

  @Patch(':id')
  @Roles(...CLIENT_MANAGE_ROLES)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return { client: await this.clients.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(...CLIENT_DELETE_ROLES)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.clients.remove(id);
    return { message: 'Client deleted.' };
  }
}
