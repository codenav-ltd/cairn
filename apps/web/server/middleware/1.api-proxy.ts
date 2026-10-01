// web is the only published service; these paths belong to the api.
const prefixes = ['/api/', '/mcp']
const exact = new Set(['/llms.txt', '/llms-full.txt', '/feed.xml', '/feed.json'])

function belongsToApi(pathname: string) {
  return exact.has(pathname) || prefixes.some((p) => pathname === p || pathname.startsWith(p))
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!belongsToApi(url.pathname)) return
  return proxyRequest(event, new URL(url.pathname + url.search, serverEnv().apiOrigin).href)
})
