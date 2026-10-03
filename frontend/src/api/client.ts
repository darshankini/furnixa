export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  return readResponse<T>(res)
}

/** POST a multipart form (file uploads). The browser sets the multipart Content-Type itself. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    body: form,
  })
  return readResponse<T>(res)
}

async function readResponse<T>(res: Response): Promise<T> {
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    // NestJS validation errors send `message` as a list; show the first one
    const raw = (data as { message?: string | string[] } | null)?.message
    const message = Array.isArray(raw) ? raw[0] : (raw ?? `Request failed (${res.status})`)
    throw new ApiError(message, res.status)
  }
  return data as T
}
