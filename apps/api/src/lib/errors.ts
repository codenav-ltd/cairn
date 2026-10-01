import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** An error whose message is safe to show the client. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const forbidden = (message = 'You do not have permission to do this.') =>
  new ApiError(403, 'forbidden', message)

export const unauthorized = () => new ApiError(401, 'unauthorized', 'Sign in to continue.')

export const notFound = (message = 'Not found.') => new ApiError(404, 'not_found', message)

export const badRequest = (message: string, code = 'bad_request') =>
  new ApiError(400, code, message)

export const conflict = (message: string, code = 'conflict') => new ApiError(409, code, message)
