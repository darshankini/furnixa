import type { Request } from 'express';
import type { Scalars } from '@prisma/orm-postgres/family-contract/types';
import type { Models } from '../prisma/contract.js';

export const AUTH_COOKIE = 'furnixa_token';

export type UserType = 'user' | 'client';

/** A full User row (all columns, no relations) */
export type User = Scalars<Models.public_User>;

/** What the API sends to the browser: never includes passwordHash */
export type PublicUser = Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'> & { userType: UserType};

export type UserRole = User['role'];

// Clients are not staff, so they get the lowest role and are never matched by role checks
export const CLIENT_ROLE: UserRole = 'USER';

export interface JwtPayload {
  sub: number;
  userType : UserType
}

export interface ResetTokenPayload {
  sub: number;
  purpose: 'password-reset';
}

export interface AuthenticatedRequest extends Request {
  user: PublicUser;
}

export function toPublicUser(
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>,
  userType: UserType,
): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    userType
  };
}
