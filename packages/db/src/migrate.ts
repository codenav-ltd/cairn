import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type pg from 'pg'

// Bundled builds ship migrations next to the bundle; source runs read them
// from this package.
const candidates = ['./migrations', '../migrations'].map((p) =>
  fileURLToPath(new URL(p, import.meta.url)),
)

export function resolveMigrationsFolder(): string {
  const found = candidates.find((dir) => existsSync(dir))
  if (!found) throw new Error(`Migrations folder not found; looked in ${candidates.join(', ')}`)
  return found
}

// Several processes may start at once (api and worker in separate
// containers), so migrations are serialised on a session-level advisory lock.
export async function runMigrations(pool: pg.Pool, migrationsFolder = resolveMigrationsFolder()) {
  const client = await pool.connect()
  try {
    await client.query(`select pg_advisory_lock(hashtext('cairn:migrate'))`)
    try {
      await migrate(drizzle({ client }), { migrationsFolder })
    } finally {
      await client.query(`select pg_advisory_unlock(hashtext('cairn:migrate'))`)
    }
  } finally {
    client.release()
  }
}
