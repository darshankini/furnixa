import type { UserRole } from '../../api/auth'

export interface UserFormValues {
  firstName: string
  lastName: string
  email: string
  mobile: string
  role: UserRole
  password: string
  confirmPassword: string
  isActive: boolean
}

export const EMPTY_USER_FORM: UserFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  role: 'USER',
  password: '',
  confirmPassword: '',
  isActive: true,
}
