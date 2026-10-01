import type { Invitation, InvitationPreview, Role } from '@cairnhq/contracts'
import { schema, type Db, type Executor } from '@cairnhq/db'
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Config } from '../../config'
import { randomToken, sha256 } from '../../lib/crypto'
import { badRequest, conflict, notFound } from '../../lib/errors'
import { recordAudit, type Actor } from '../audit'
import type { MailService } from '../mail/service'
import type { SettingsService } from '../settings/service'

export const INVITE_COOKIE = 'cairn_invite'

const DAY = 24 * 60 * 60 * 1000
const lifetime = (role: Role) => (role === 'owner' ? DAY : 7 * DAY)

type Row = typeof schema.invitations.$inferSelect

function state(row: Row, now = new Date()): Invitation['state'] {
  if (row.acceptedAt) return 'accepted'
  if (row.revokedAt) return 'revoked'
  if (row.expiresAt <= now) return 'expired'
  return 'pending'
}

function maskEmail(email: string) {
  const [local = '', domain = ''] = email.split('@')
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(1, local.length - visible.length))}@${domain}`
}

const pendingWhere = (tokenHash: string) =>
  and(
    eq(schema.invitations.tokenHash, tokenHash),
    isNull(schema.invitations.acceptedAt),
    isNull(schema.invitations.revokedAt),
    gt(schema.invitations.expiresAt, sql`now()`),
  )

interface Deps {
  db: Db
  config: Config
  settings: SettingsService
  mail: MailService
}

export function createInvitationService({ db, config, settings, mail }: Deps) {
  const urlFor = (token: string) => new URL(`/invite/${token}`, config.publicUrl).toString()

  async function ownerExists(executor: Executor = db) {
    const [row] = await executor
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.role, 'owner'))
      .limit(1)
    return Boolean(row)
  }

  async function create(input: {
    role: Role
    email?: string
    actor: Actor
    inviterName?: string | null
    ip?: string | null
  }) {
    if (input.role === 'owner') {
      if (input.actor.kind !== 'cli') throw badRequest('Owner invitations come from the CLI.')
      if (!input.email) throw badRequest('An owner invitation must be bound to an email address.')
      if (await ownerExists()) throw conflict('This site already has an owner.', 'owner_exists')
    }

    const email = input.email?.trim().toLowerCase()
    if (email) {
      const [existing] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1)
      if (existing) throw conflict('Someone with this email already has an account.', 'email_taken')
    }

    const token = randomToken()
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.invitations)
        .values({
          tokenHash: sha256(token),
          role: input.role,
          email: email ?? null,
          invitedBy: input.actor.kind === 'user' ? input.actor.id : null,
          expiresAt: new Date(Date.now() + lifetime(input.role)),
        })
        .returning()
      await recordAudit(tx, {
        actor: input.actor,
        action: 'invitation.create',
        targetType: 'invitation',
        targetId: inserted!.id,
        data: { role: input.role, email: email ?? null },
        ip: input.ip,
      })
      return inserted!
    })

    const url = urlFor(token)
    let mailed = false
    if (email) {
      const site = await settings.getSiteSettings()
      mailed = await mail.enqueue({
        to: email,
        locale: site.site.locale,
        template: {
          kind: 'invitation',
          url,
          role: input.role,
          inviterName: input.inviterName ?? null,
          expiresAt: row.expiresAt.toISOString(),
        },
      })
    }
    return { row, url, mailed }
  }

  async function list(): Promise<Invitation[]> {
    const inviter = alias(schema.users, 'inviter')
    const rows = await db
      .select({ invitation: schema.invitations, inviterName: inviter.name })
      .from(schema.invitations)
      .leftJoin(inviter, eq(inviter.id, schema.invitations.invitedBy))
      .orderBy(desc(schema.invitations.createdAt))
      .limit(200)
    return rows.map((r) => toInvitation(r.invitation, r.inviterName))
  }

  async function get(id: string) {
    const [row] = await db.select().from(schema.invitations).where(eq(schema.invitations.id, id))
    return row ?? null
  }

  async function revoke(id: string, actor: Actor, ip?: string | null) {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.invitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.invitations.id, id),
            isNull(schema.invitations.acceptedAt),
            isNull(schema.invitations.revokedAt),
          ),
        )
        .returning({ id: schema.invitations.id })
      if (!row) throw notFound('No pending invitation with this id.')
      await recordAudit(tx, {
        actor,
        action: 'invitation.revoke',
        targetType: 'invitation',
        targetId: id,
        ip,
      })
    })
  }

  async function preview(token: string): Promise<InvitationPreview | null> {
    const inviter = alias(schema.users, 'inviter')
    const [row] = await db
      .select({ invitation: schema.invitations, inviterName: inviter.name })
      .from(schema.invitations)
      .leftJoin(inviter, eq(inviter.id, schema.invitations.invitedBy))
      .where(pendingWhere(sha256(token)))
    if (!row) return null
    const site = await settings.getSiteSettings()
    return {
      role: row.invitation.role,
      email: row.invitation.email ? maskEmail(row.invitation.email) : null,
      inviterName: row.inviterName,
      expiresAt: row.invitation.expiresAt.toISOString(),
      siteTitle: site.site.title,
    }
  }

  async function findPending(token: string) {
    const [row] = await db
      .select()
      .from(schema.invitations)
      .where(pendingWhere(sha256(token)))
    return row ?? null
  }

  /**
   * Marks the invitation used and returns it, or null if it is not usable for
   * this email. A single conditional update, so concurrent attempts with the
   * same token cannot both succeed.
   */
  async function claim(token: string, email: string, executor: Executor = db) {
    const [row] = await executor
      .update(schema.invitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(
          pendingWhere(sha256(token)),
          sql`(${schema.invitations.email} is null or ${schema.invitations.email} = ${email.toLowerCase()})`,
        ),
      )
      .returning()
    return row ?? null
  }

  async function markAcceptedBy(token: string, userId: string) {
    await db
      .update(schema.invitations)
      .set({ acceptedBy: userId })
      .where(
        and(eq(schema.invitations.tokenHash, sha256(token)), isNull(schema.invitations.acceptedBy)),
      )
  }

  return {
    create,
    list,
    get,
    revoke,
    preview,
    findPending,
    claim,
    markAcceptedBy,
    ownerExists,
  }
}

export function toInvitation(row: Row, inviterName: string | null): Invitation {
  return {
    id: row.id,
    role: row.role,
    email: row.email,
    invitedBy: row.invitedBy && inviterName ? { id: row.invitedBy, name: inviterName } : null,
    state: state(row),
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export type InvitationService = ReturnType<typeof createInvitationService>
