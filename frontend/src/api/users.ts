import type { UserRole } from './auth'
import { apiRequest } from './client'

export interface UserRecord {
  id: number
  firstName: string
  lastName: string
  email: string
  mobile: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile?: string
  role: UserRole
  isActive: boolean
}

/** Only the fields that are sent get changed. mobile: null removes it; password is optional. */
export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  email?: string
  mobile?: string | null
  role?: UserRole
  isActive?: boolean
  password?: string
}

export const usersApi = {
  list: () => apiRequest<{ users: UserRecord[] }>('/users'),

  get: (id: number) => apiRequest<{ user: UserRecord }>(`/users/${id}`),

  create: (input: CreateUserInput) =>
    apiRequest<{ user: UserRecord }>('/users', { method: 'POST', body: input }),

  update: (id: number, input: UpdateUserInput) =>
    apiRequest<{ user: UserRecord }>(`/users/${id}`, { method: 'PATCH', body: input }),
}
