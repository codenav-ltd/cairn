import { schema, type Executor } from '@cairnhq/db'
import { eq, inArray } from 'drizzle-orm'

export async function readSettings(db: Executor, keys: string[]): Promise<Map<string, unknown>> {
  const rows = await db
    .select({ key: schema.siteSettings.key, value: schema.siteSettings.value })
    .from(schema.siteSettings)
    .where(inArray(schema.siteSettings.key, keys))
  return new Map(rows.map((r) => [r.key, r.value]))
}

export async function writeSetting(db: Executor, key: string, value: unknown) {
  await db
    .insert(schema.siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value, updatedAt: new Date() },
    })
}

export async function deleteSetting(db: Executor, key: string) {
  await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, key))
}
