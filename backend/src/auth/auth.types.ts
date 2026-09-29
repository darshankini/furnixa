import type { Request } from 'express';
import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { Models } from '../prisma/contract.js';

export const AUTH_COOKIE = 'furnixa_token';

/** A full User row (all columns, no relations) */
export type User = Scalars<Models.public_User>;

/** What the API sends to the browser: never includes passwordHash */
export type PublicUser = Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;

export type UserRole = User['role'];

export interface JwtPayload {
  sub: number;
}

export interface ResetTokenPayload {
  sub: number;
  purpose: 'password-reset';
}

export interface AuthenticatedRequest extends Request {
  user: PublicUser;
}

export function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}
