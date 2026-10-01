import type { Role, UserStatus } from '@cairnhq/contracts'

export interface Viewer {
  id: string
  role: Role
  status: UserStatus
}

type Subject = Pick<Viewer, 'id' | 'role'>

interface Targets {
  'settings.manage': undefined
  'members.view': undefined
  'invitation.manage': { role: Role }
  'member.setRole': { user: Subject; role: Role }
  'member.setStatus': { user: Subject }
  'content.write': undefined
  'content.moderate': undefined
  'discussion.participate': undefined
}

export type Action = keyof Targets

export type TargetArgs<A extends Action> = Targets[A] extends undefined ? [] : [target: Targets[A]]

/** A pending or suspended account has no more rights than a visitor. */
export function activeViewer(viewer: Viewer | null | undefined): Viewer | null {
  return viewer && viewer.status === 'active' ? viewer : null
}

export function can<A extends Action>(
  viewer: Viewer | null | undefined,
  action: A,
  ...[target]: TargetArgs<A>
): boolean {
  const v = activeViewer(viewer)
  if (!v) return false
  const t = target as Targets[Action]

  switch (action) {
    case 'settings.manage':
      return v.role === 'owner'
    case 'members.view':
      return v.role === 'owner' || v.role === 'moderator'
    case 'invitation.manage': {
      // Owner invitations come only from the CLI.
      const { role } = t as Targets['invitation.manage']
      if (role === 'owner') return false
      return v.role === 'owner' || (v.role === 'moderator' && role === 'member')
    }
    case 'member.setRole': {
      // Ownership changes hands through a dedicated transfer, never here.
      const { user, role } = t as Targets['member.setRole']
      return v.role === 'owner' && user.id !== v.id && user.role !== 'owner' && role !== 'owner'
    }
    case 'member.setStatus': {
      const { user } = t as Targets['member.setStatus']
      if (user.id === v.id || user.role === 'owner') return false
      return v.role === 'owner' || (v.role === 'moderator' && user.role === 'member')
    }
    case 'content.write':
      return v.role === 'owner' || v.role === 'editor'
    case 'content.moderate':
      return v.role === 'owner' || v.role === 'moderator'
    case 'discussion.participate':
      return true
  }
  return false
}
