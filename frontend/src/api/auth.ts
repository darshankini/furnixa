import { apiRequest } from './client'

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'SALES'
  | 'CUTSHEET'
  | 'OPTIMISATION'
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'ACCOUNTS'
  | 'DISPATCH'
  | 'USER'

export type LoginType = 'user' | 'client'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: UserRole
  userType: LoginType
}

export const authApi = {
  login: (email: string, password: string, loginType: LoginType) =>
    apiRequest<{ user: User }>('/auth/login', { method: 'POST', body: { email, password, loginType } }),

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
