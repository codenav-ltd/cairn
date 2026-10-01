import type { Role, UserStatus } from '@cairnhq/contracts'
import type { Viewer } from '@cairnhq/policy'
import type { AuthSession } from './modules/identity/auth'

export interface AppEnv {
  Variables: {
    session: AuthSession | null
    viewer: Viewer | null
    ip: string | null
  }
}

type SessionUser = AuthSession['user']

/** An address nobody has confirmed yet counts as pending, whatever the stored status. */
export function toViewer(user: SessionUser): Viewer {
  return {
    id: user.id,
    role: user.role as Role,
    status: user.emailVerified ? (user.status as UserStatus) : 'pending',
  }
}
