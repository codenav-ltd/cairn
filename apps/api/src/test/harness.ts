import { createDb, runMigrations } from '@cairnhq/db'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import type { PgBoss } from 'pg-boss'
import { createApp } from '../app'
import { loadConfig } from '../config'
import { createServices } from '../services'

/** Integration tests run only when this points at a Postgres with the Cairn extensions. */
export const testDatabaseUrl = process.env.CAIRN_TEST_DATABASE_URL

export const ORIGIN = 'http://cairn.test'

/** A throwaway database per test file, migrated from scratch. */
export async function createHarness(env: Record<string, string> = {}) {
  const admin = new pg.Client({ connectionString: testDatabaseUrl })
  await admin.connect()
  const name = `cairn_test_${randomUUID().replaceAll('-', '').slice(0, 16)}`
  await admin.query(`create database ${name}`)
  const url = new URL(testDatabaseUrl!)
  url.pathname = `/${name}`

  const config = loadConfig({
    CAIRN_PUBLIC_URL: ORIGIN,
    CAIRN_SECRET: 'test-secret-'.padEnd(40, 'x'),
    DATABASE_URL: url.toString(),
    ...env,
  })
  const { db, pool } = createDb(config.databaseUrl)
  await runMigrations(pool)

  const queued: unknown[] = []
  const boss = {
    send: async (_name: string, data: unknown) => (queued.push(data), 'job'),
  } as unknown as PgBoss
  const services = createServices({ config, db, boss })
  const app = createApp({ config, db, services })

  return {
    config,
    db,
    services,
    app,
    queued,
    client: () => new Client(app),
    async close() {
      // Dropping with force terminates connections the pool is still closing.
      pool.on('error', () => {})
      await pool.end()
      await admin.query(`drop database ${name} with (force)`)
      await admin.end()
    },
  }
}

/** A browser stand-in: keeps cookies and sends the site's Origin. */
export class Client {
  private cookies = new Map<string, string>()
  constructor(private app: ReturnType<typeof createApp>) {}

  async request(method: string, path: string, body?: unknown) {
    const headers = new Headers({ origin: ORIGIN })
    if (body !== undefined) headers.set('content-type', 'application/json')
    if (this.cookies.size > 0) {
      headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '))
    }
    const response = await this.app.request(`${ORIGIN}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ''] = cookie.split(';')
      const index = pair.indexOf('=')
      const key = pair.slice(0, index)
      const value = pair.slice(index + 1)
      if (/max-age=0/i.test(cookie) || value === '') this.cookies.delete(key)
      else this.cookies.set(key, value)
    }
    const text = await response.text()
    // Tests assert on response shapes directly; a typed client would only get in the way.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any =
      text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text
    return { status: response.status, json }
  }

  get = (path: string) => this.request('GET', path)
  post = (path: string, body?: unknown) => this.request('POST', path, body ?? {})
  patch = (path: string, body: unknown) => this.request('PATCH', path, body)
  put = (path: string, body: unknown) => this.request('PUT', path, body)
  delete = (path: string) => this.request('DELETE', path)

  async signUp(email: string, password = 'correct horse battery', name = email.split('@')[0]) {
    return this.post('/api/auth/sign-up/email', { email, password, name })
  }

  async signIn(email: string, password = 'correct horse battery') {
    return this.post('/api/auth/sign-in/email', { email, password })
  }
}

export function tokenFrom(url: string) {
  return new URL(url).pathname.split('/').pop()!
}
