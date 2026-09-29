import { apiRequest } from './client'

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'DESIGNER'
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'ACCOUNTS'
  | 'DISPATCH'
  | 'USER'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: UserRole
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: User }>('/auth/login', { method: 'POST', body: { email, password } }),

  logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => apiRequest<{ user: User }>('/auth/me'),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string; devResetLink?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
}
