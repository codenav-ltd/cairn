import { ApiHealth, type SiteHealth } from '@cairnhq/contracts'

// A deploy is only healthy when web and api both answer with the version
// that was just deployed.
export default defineEventHandler(async (event): Promise<SiteHealth> => {
  const { env, version, apiOrigin } = serverEnv()

  const api = await $fetch(new URL('/healthz', apiOrigin).href, {
    ignoreResponseError: true,
    timeout: 3000,
  })
    .then((body) => ApiHealth.parse(body))
    .catch(() => null)

  const ok = api?.status === 'ok' && api.version === version

  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseStatus(event, ok ? 200 : 503)
  return { status: ok ? 'ok' : 'degraded', version, env, api }
})
