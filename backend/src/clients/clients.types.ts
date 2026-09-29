import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { UserRole } from '../auth/auth.types.js';
import type { Models } from '../prisma/contract.js';

export type Client = Scalars<Models.public_Client>;

/** Who may do what with clients (the frontend mirrors these in src/data/roles.ts) */
export const CLIENT_MANAGE_ROLES = ['ADMIN', 'MANAGER', 'SALES'] as const satisfies readonly UserRole[];
export const CLIENT_DELETE_ROLES = ['ADMIN', 'MANAGER'] as const satisfies readonly UserRole[];

/** Client as returned by the API: dates as ISO strings, plus how many leads it has */
export interface ClientDto {
  id: number;
  firstName: string;
  lastName: string;
  mobile: string;
  alternateMobile: string | null;
  email: string | null;
  address: string | null;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toClientDto(client: Client & { leads: number }): ClientDto {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    mobile: client.mobile,
    alternateMobile: client.alternateMobile,
    email: client.email,
    address: client.address,
    leadCount: client.leads,
    createdAt: client.createdAt.toString(),
    updatedAt: client.updatedAt.toString(),
  };
}
