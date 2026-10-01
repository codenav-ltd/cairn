// web is the only published service; these paths belong to the api.
const prefixes = ['/api/', '/mcp']
const exact = new Set(['/llms.txt', '/llms-full.txt', '/feed.xml', '/feed.json'])

/** Must match CLIENT_IP_HEADER in apps/api. The api trusts it, so a client's value is replaced. */
const CLIENT_IP_HEADER = 'x-cairn-client-ip'

function belongsToApi(pathname: string) {
  return exact.has(pathname) || prefixes.some((p) => pathname === p || pathname.startsWith(p))
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!belongsToApi(url.pathname)) return

  const { apiOrigin, clientIpHeader } = serverEnv()
  const forwarded = clientIpHeader && getRequestHeader(event, clientIpHeader)?.split(',')[0]?.trim()
  const ip = forwarded || event.node.req.socket?.remoteAddress || ''

  return proxyRequest(event, new URL(url.pathname + url.search, apiOrigin).href, {
    headers: { [CLIENT_IP_HEADER]: ip },
  })
})
