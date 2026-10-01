import { ApiHealth } from '@cairnhq/contracts'
import type { Db } from '@cairnhq/db'
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Config } from './config'
import { toViewer, type AppEnv } from './context'
import { ApiError } from './lib/errors'
import { CLIENT_IP_HEADER } from './modules/identity/auth'
import { identityRoutes } from './modules/identity/routes'
import { settingsRoutes } from './modules/settings/routes'
import type { Services } from './services'

interface Deps {
  config: Config
  db: Db
  services: Services
}

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  responses: {
    200: { description: 'Serving', content: { 'application/json': { schema: ApiHealth } } },
    503: { description: 'Degraded', content: { 'application/json': { schema: ApiHealth } } },
  },
})

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function createApp({ config, db, services }: Deps) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          { error: { code: 'invalid_request', message: z.prettifyError(result.error) } },
          400,
        )
      }
    },
  })
  const origin = new URL(config.publicUrl).origin

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.status)
    }
    console.error('[api]', error)
    return c.json({ error: { code: 'internal', message: 'Something went wrong.' } }, 500)
  })

  if (config.env === 'staging') {
    app.use(async (c, next) => {
      await next()
      c.header('X-Robots-Tag', 'noindex, nofollow')
    })
  }

  // Set by the web server, which is the only thing that can reach the api.
  app.use(async (c, next) => {
    c.set('ip', c.req.header(CLIENT_IP_HEADER) ?? null)
    await next()
  })

  app.on(['GET', 'POST'], '/api/auth/*', (c) => services.auth.handler(c.req.raw))

  app.use('/api/*', async (c, next) => {
    if (!safeMethods.has(c.req.method) && c.req.header('origin') !== origin) {
      throw new ApiError(403, 'bad_origin', 'Cross-origin requests are not accepted.')
    }
    const { headers, response } = await services.auth.api.getSession({
      headers: c.req.raw.headers,
      returnHeaders: true,
    })
    c.set('session', response)
    c.set('viewer', response ? toViewer(response.user) : null)
    await next()
    const refreshed = headers.getSetCookie()
    for (const cookie of refreshed) c.header('set-cookie', cookie, { append: true })
  })

  const routes = app
    .openapi(healthRoute, async (c) => {
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
    .route(
      '/',
      identityRoutes({ config, invitations: services.invitations, members: services.members }),
    )
    .route(
      '/',
      settingsRoutes({
        config,
        settings: services.settings,
        mail: services.mail,
        members: services.members,
      }),
    )

  app.doc31('/api/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Cairn API', version: config.version },
  })

  return routes
}

export type AppType = ReturnType<typeof createApp>
