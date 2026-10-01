import { schema, type Executor } from '@cairnhq/db'

export type Actor = { kind: 'user'; id: string } | { kind: 'cli' } | { kind: 'system' }

export interface AuditEntry {
  actor: Actor
  action: string
  targetType?: string
  targetId?: string
  data?: Record<string, unknown>
  ip?: string | null
}

export async function recordAudit(db: Executor, entry: AuditEntry) {
  await db.insert(schema.auditLog).values({
    actorKind: entry.actor.kind,
    actorId: entry.actor.kind === 'user' ? entry.actor.id : null,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    data: entry.data ?? null,
    ip: entry.ip ?? null,
  })
}
