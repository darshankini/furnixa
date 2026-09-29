import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER') // admins and managers can see users
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async findAll() {
    return { users: await this.users.findAll() };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { user: await this.users.findOne(id) };
  }

  @Post()
  @Roles('ADMIN') // only admins can create users
  async create(@Body() dto: CreateUserDto) {
    return { user: await this.users.create(dto) };
  }

  @Patch(':id')
  @Roles('ADMIN') // only admins can edit users
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: PublicUser,
  ) {
    return { user: await this.users.update(id, dto, actor) };
  }
}
