import { can, type Action, type TargetArgs, type Viewer } from '@cairnhq/policy'
import type { Context } from 'hono'
import type { AppEnv } from '../context'
import { FRESH_SESSION_SECONDS } from '../modules/identity/auth'
import { ApiError, forbidden, unauthorized } from './errors'

export function requireSession(c: Context<AppEnv>) {
  const session = c.get('session')
  if (!session) throw unauthorized()
  return session
}

export function requireViewer(c: Context<AppEnv>): Viewer {
  requireSession(c)
  return c.get('viewer')!
}

export function authorize<A extends Action>(
  c: Context<AppEnv>,
  action: A,
  ...target: TargetArgs<A>
): Viewer {
  const viewer = requireViewer(c)
  if (!can(viewer, action, ...target)) throw forbidden()
  return viewer
}

/** Sensitive changes need a sign-in from the last few minutes. */
export function requireFreshSession(c: Context<AppEnv>) {
  const session = requireSession(c)
  const age = (Date.now() - new Date(session.session.createdAt).getTime()) / 1000
  if (age > FRESH_SESSION_SECONDS) {
    throw new ApiError(403, 'session_not_fresh', 'Confirm it is you by signing in again.')
  }
}
