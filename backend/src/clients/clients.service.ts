import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toClientDto, type ClientDto } from './clients.types.js';
import type { CreateClientDto } from './dto/create-client.dto.js';
import type { UpdateClientDto } from './dto/update-client.dto.js';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Clients with a count of their leads (the `leads` field becomes a number) */
  private withLeadCount() {
    return this.prisma.orm.public.Client.include('leads', (leads) => leads.count());
  }

  async findAll(): Promise<ClientDto[]> {
    const clients = await this.withLeadCount()
      .orderBy([(c) => c.createdAt.desc(), (c) => c.id.desc()])
      .all();
    return clients.map(toClientDto);
  }

  async findOne(id: number): Promise<ClientDto> {
    const client = await this.withLeadCount().where({ id }).first();
    if (!client) throw new NotFoundException('Client not found.');
    return toClientDto(client);
  }

  async create(dto: CreateClientDto): Promise<ClientDto> {
    const created = await this.prisma.orm.public.Client.select('id').create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      mobile: dto.mobile,
      alternateMobile: dto.alternateMobile ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
    });
    return this.findOne(created.id);
  }

  async update(id: number, dto: UpdateClientDto): Promise<ClientDto> {
    const existing = await this.prisma.orm.public.Client.select('id').where({ id }).first();
    if (!existing) throw new NotFoundException('Client not found.');

    await this.prisma.orm.public.Client.where({ id }).update({
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.mobile !== undefined && { mobile: dto.mobile }),
      ...(dto.alternateMobile !== undefined && { alternateMobile: dto.alternateMobile }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.address !== undefined && { address: dto.address }),
      updatedAt: Temporal.Now.instant(),
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);

    // Leads point at their client, so the database refuses to delete a client that still has leads
    if (client.leadCount > 0) throw this.hasLeadsError(client.leadCount);

    try {
      await this.prisma.orm.public.Client.where({ id }).delete();
    } catch (err) {
      // A lead was added between the check above and the delete
      if (isForeignKeyViolation(err)) throw this.hasLeadsError();
      throw err;
    }
  }

  private hasLeadsError(count?: number) {
    const leads = count === undefined ? 'leads' : `${count} lead${count === 1 ? '' : 's'}`;
    return new ConflictException(`This client has ${leads}. Delete or move the leads before deleting the client.`);
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  for (let e: unknown = err; e && typeof e === 'object'; e = (e as { cause?: unknown }).cause) {
    const code = (e as { sqlState?: unknown; code?: unknown }).sqlState ?? (e as { code?: unknown }).code;
    if (code === '23503') return true;
  }
  return false;
}
