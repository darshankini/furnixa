import type { ClientInput, ClientRecord } from '../../api/clients'

export interface ClientFormValues {
  firstName: string
  lastName: string
  mobile: string
  alternateMobile: string
  email: string
  address: string
  password: string
  confirmPassword: string
}

export const EMPTY_CLIENT_FORM: ClientFormValues = {
  firstName: '',
  lastName: '',
  mobile: '',
  alternateMobile: '',
  email: '',
  address: '',
  password: '',
  confirmPassword : ''
}

export function clientToFormValues(client: ClientRecord): ClientFormValues {
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    mobile: client.mobile,
    alternateMobile: client.alternateMobile ?? '',
    email: client.email ?? '',
    address: client.address ?? '',
    password: client.password ?? '',
    confirmPassword: client.password ?? ''
  }
}

/** Trim everything; empty optional fields become null so the backend clears them */
export function formValuesToInput(v: ClientFormValues): ClientInput {
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    mobile: v.mobile.trim(),
    alternateMobile: v.alternateMobile.trim() || null,
    email: v.email.trim() || null,
    address: v.address.trim() || null,
    password: v.password.trim() || null,
    confirmPassword: v.confirmPassword.trim() || null
  }
}
