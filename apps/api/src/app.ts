import { ApiHealth } from '@cairnhq/contracts'
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import type { Config } from './config'
import type { Db } from '@cairnhq/db'

interface Deps {
  config: Config
  db: Db
}

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  responses: {
    200: { description: 'Serving', content: { 'application/json': { schema: ApiHealth } } },
    503: { description: 'Degraded', content: { 'application/json': { schema: ApiHealth } } },
  },
})

export function createApp({ config, db }: Deps) {
  const app = new OpenAPIHono()

  if (config.env === 'staging') {
    app.use(async (c, next) => {
      await next()
      c.header('X-Robots-Tag', 'noindex, nofollow')
    })
  }

  const routes = app.openapi(healthRoute, async (c) => {
    const database = await db
      .execute(sql`select 1`)
      .then(() => 'ok' as const)
      .catch(() => 'unreachable' as const)
    const body = {
      status: database === 'ok' ? ('ok' as const) : ('degraded' as const),
      version: config.version,
      env: config.env,
      database,
    }
    return c.json(body, database === 'ok' ? 200 : 503)
  })

  app.doc31('/api/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Cairn API', version: config.version },
  })

  return routes
}

export type AppType = ReturnType<typeof createApp>
