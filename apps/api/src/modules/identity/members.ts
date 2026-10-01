import type { Me, Member, UpdateMe, UpdateMember } from '@cairnhq/contracts'
import { schema, type Db } from '@cairnhq/db'
import { can, type Viewer } from '@cairnhq/policy'
import { desc, eq } from 'drizzle-orm'
import { forbidden, notFound } from '../../lib/errors'
import { recordAudit } from '../audit'

type UserRow = typeof schema.users.$inferSelect

export function toMe(user: UserRow): Me {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    role: user.role,
    status: user.status,
    locale: (user.locale as Me['locale']) ?? null,
  }
}

const toMember = (user: UserRow): Member => ({
  ...toMe(user),
  createdAt: user.createdAt.toISOString(),
})

export function createMemberService({ db }: { db: Db }) {
  async function find(id: string) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id))
    return user ?? null
  }

  async function me(id: string) {
    const user = await find(id)
    if (!user) throw notFound()
    return toMe(user)
  }

  async function updateMe(id: string, input: UpdateMe) {
    const [user] = await db
      .update(schema.users)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.locale !== undefined && { locale: input.locale }),
      })
      .where(eq(schema.users.id, id))
      .returning()
    if (!user) throw notFound()
    return toMe(user)
  }

  async function list(): Promise<Member[]> {
    const users = await db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(500)
    return users.map(toMember)
  }

  async function update(viewer: Viewer, id: string, input: UpdateMember, ip: string | null) {
    const target = await find(id)
    if (!target) throw notFound('No such member.')
    const subject = { id: target.id, role: target.role }
    if (input.role && !can(viewer, 'member.setRole', { user: subject, role: input.role }))
      throw forbidden()
    if (input.status && !can(viewer, 'member.setStatus', { user: subject })) throw forbidden()

    return db.transaction(async (tx) => {
      const [user] = await tx
        .update(schema.users)
        .set({
          ...(input.role && { role: input.role }),
          ...(input.status && { status: input.status }),
        })
        .where(eq(schema.users.id, id))
        .returning()
      if (input.status === 'suspended') {
        await tx.delete(schema.sessions).where(eq(schema.sessions.userId, id))
      }
      const actor = { kind: 'user' as const, id: viewer.id }
      if (input.role && input.role !== target.role) {
        await recordAudit(tx, {
          actor,
          action: 'member.role',
          targetType: 'user',
          targetId: id,
          data: { from: target.role, to: input.role },
          ip,
        })
      }
      if (input.status && input.status !== target.status) {
        await recordAudit(tx, {
          actor,
          action: 'member.status',
          targetType: 'user',
          targetId: id,
          data: { from: target.status, to: input.status },
          ip,
        })
      }
      return toMember(user!)
    })
  }

  return { find, me, updateMe, list, update }
}

export type MemberService = ReturnType<typeof createMemberService>
