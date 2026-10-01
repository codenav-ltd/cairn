import type { Role } from '@cairnhq/contracts'
import { describe, expect, it } from 'vitest'
import { can, type Viewer } from './index'

const as = (role: Role, status: Viewer['status'] = 'active'): Viewer => ({
  id: role,
  role,
  status,
})
const owner = as('owner')
const editor = as('editor')
const moderator = as('moderator')
const member = as('member')
const everyone = [owner, editor, moderator, member]

function who(check: (v: Viewer) => boolean): Role[] {
  return everyone.filter(check).map((v) => v.role)
}

describe('can', () => {
  it('denies visitors and inactive accounts everything', () => {
    for (const status of ['pending', 'suspended'] as const) {
      expect(can(as('owner', status), 'settings.manage')).toBe(false)
      expect(can(as('member', status), 'discussion.participate')).toBe(false)
    }
    expect(can(null, 'discussion.participate')).toBe(false)
  })

  it('matches the role table for simple actions', () => {
    expect(who((v) => can(v, 'settings.manage'))).toEqual(['owner'])
    expect(who((v) => can(v, 'members.view'))).toEqual(['owner', 'moderator'])
    expect(who((v) => can(v, 'content.write'))).toEqual(['owner', 'editor'])
    expect(who((v) => can(v, 'content.moderate'))).toEqual(['owner', 'moderator'])
    expect(who((v) => can(v, 'discussion.participate'))).toEqual([
      'owner',
      'editor',
      'moderator',
      'member',
    ])
  })

  it('limits who can invite which role', () => {
    expect(who((v) => can(v, 'invitation.manage', { role: 'member' }))).toEqual([
      'owner',
      'moderator',
    ])
    expect(who((v) => can(v, 'invitation.manage', { role: 'editor' }))).toEqual(['owner'])
    expect(who((v) => can(v, 'invitation.manage', { role: 'moderator' }))).toEqual(['owner'])
    expect(who((v) => can(v, 'invitation.manage', { role: 'owner' }))).toEqual([])
  })

  it('lets only the owner change roles, never to or from owner', () => {
    const target = { id: 'someone', role: 'member' as const }
    expect(who((v) => can(v, 'member.setRole', { user: target, role: 'editor' }))).toEqual([
      'owner',
    ])
    expect(can(owner, 'member.setRole', { user: target, role: 'owner' })).toBe(false)
    expect(can(owner, 'member.setRole', { user: owner, role: 'editor' })).toBe(false)
  })

  it('keeps moderators away from staff accounts', () => {
    const someMember = { id: 'm', role: 'member' as const }
    const someEditor = { id: 'e', role: 'editor' as const }
    expect(who((v) => can(v, 'member.setStatus', { user: someMember }))).toEqual([
      'owner',
      'moderator',
    ])
    expect(who((v) => can(v, 'member.setStatus', { user: someEditor }))).toEqual(['owner'])
    expect(can(owner, 'member.setStatus', { user: owner })).toBe(false)
    expect(can(moderator, 'member.setStatus', { user: moderator })).toBe(false)
  })
})
