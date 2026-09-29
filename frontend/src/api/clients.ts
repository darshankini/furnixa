import { apiRequest } from './client'

export interface ClientRecord {
  id: number
  firstName: string
  lastName: string
  mobile: string
  alternateMobile: string | null
  email: string | null
  address: string | null
  leadCount: number
  createdAt: string
  updatedAt: string
}

/** Optional fields: send null to clear them */
export interface ClientInput {
  firstName: string
  lastName: string
  mobile: string
  alternateMobile: string | null
  email: string | null
  address: string | null
}

export const clientsApi = {
  list: () => apiRequest<{ clients: ClientRecord[] }>('/clients'),

  get: (id: number) => apiRequest<{ client: ClientRecord }>(`/clients/${id}`),

  create: (input: ClientInput) =>
    apiRequest<{ client: ClientRecord }>('/clients', { method: 'POST', body: input }),

  update: (id: number, input: Partial<ClientInput>) =>
    apiRequest<{ client: ClientRecord }>(`/clients/${id}`, { method: 'PATCH', body: input }),

  remove: (id: number) => apiRequest<{ message: string }>(`/clients/${id}`, { method: 'DELETE' }),
}
