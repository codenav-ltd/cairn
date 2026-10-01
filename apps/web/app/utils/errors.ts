export interface ErrorInfo {
  code?: string
  message?: string
  status?: number
}

/**
 * Reads the api's `{ error: { code, message } }`, Better Auth's `{ code, message }`
 * and the Better Auth client's `{ error }` result alike.
 */
export function errorInfo(e: unknown): ErrorInfo {
  if (!e || typeof e !== 'object') return {}
  const err = e as { data?: unknown; status?: number; statusCode?: number }
  const data = (err.data ?? e) as { error?: unknown; code?: unknown; message?: unknown }
  const body = (data.error && typeof data.error === 'object' ? data.error : data) as {
    code?: unknown
    message?: unknown
  }
  return {
    code: typeof body.code === 'string' ? body.code.toLowerCase() : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
    status: err.statusCode ?? err.status,
  }
}
