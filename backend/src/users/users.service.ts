import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { PublicUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { toUserDto, type UserDto } from './users.types.js';

const PUBLIC_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'mobile',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

const EMAIL_TAKEN = 'A user with this email already exists.';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.orm.public.User.select(...PUBLIC_FIELDS)
      .orderBy([(u) => u.createdAt.desc(), (u) => u.id.desc()])
      .all();
    return users.map(toUserDto);
  }

  async findOne(id: number): Promise<UserDto> {
    const user = await this.prisma.orm.public.User.select(...PUBLIC_FIELDS).where({ id }).first();
    if (!user) throw new NotFoundException('User not found.');
    return toUserDto(user);
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    await this.assertEmailFree(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.orm.public.User.select(...PUBLIC_FIELDS).create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        mobile: dto.mobile ?? null,
        role: dto.role,
        isActive: dto.isActive ?? true,
        passwordHash,
      });
      return toUserDto(user);
    } catch (err) {
      // Two requests with the same email at the same moment: the unique index catches the second
      if (isUniqueViolation(err)) throw new ConflictException(EMAIL_TAKEN);
      throw err;
    }
  }

  /** `actor` is the signed-in admin making the change */
  async update(id: number, dto: UpdateUserDto, actor: PublicUser): Promise<UserDto> {
    const current = await this.prisma.orm.public.User.select('id', 'email', 'role', 'isActive')
      .where({ id })
      .first();
    if (!current) throw new NotFoundException('User not found.');

    // Stop admins from locking themselves out
    if (id === actor.id) {
      if (dto.role !== undefined && dto.role !== current.role) {
        throw new BadRequestException('You cannot change your own role.');
      }
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account.');
      }
    }

    if (dto.email !== undefined && dto.email !== current.email) {
      await this.assertEmailFree(dto.email);
    }

    const changes = {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.mobile !== undefined && { mobile: dto.mobile }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.password !== undefined && { passwordHash: await bcrypt.hash(dto.password, 12) }),
      updatedAt: Temporal.Now.instant(),
    };

    try {
      await this.prisma.orm.public.User.where({ id }).update(changes);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(EMAIL_TAKEN);
      throw err;
    }

    return this.findOne(id);
  }

  private async assertEmailFree(email: string): Promise<void> {
    const existing = await this.prisma.orm.public.User.select('id').where({ email }).first();
    if (existing) throw new ConflictException(EMAIL_TAKEN);
  }
}

function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { sqlState?: unknown; code?: unknown }).sqlState ?? (e as { code?: unknown }).code;
    if (code === '23505') return true;
  }
  return false;
}
