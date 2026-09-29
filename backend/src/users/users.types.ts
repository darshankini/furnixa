import type { User, UserRole } from '../auth/auth.types.js';

export type { UserRole };

/** Same order as the UserRole enum in contract.prisma */
export const USER_ROLES = [
  'ADMIN',
  'MANAGER',
  'SALES',
  'DESIGNER',
  'PURCHASE',
  'PRODUCTION',
  'ACCOUNTS',
  'DISPATCH',
  'USER',
] as const satisfies readonly UserRole[];

/** User as returned by the API: everything except passwordHash, dates as ISO strings */
export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toUserDto(user: Omit<User, 'passwordHash'>): UserDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toString(),
    updatedAt: user.updatedAt.toString(),
  };
}
