// Pages rendered for a signed-in visitor carry their name and role, and an
// opened invitation sets a cookie; no shared cache may keep either.
export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (pathname.startsWith('/api/')) return
  const signedIn = /(?:^|;\s*)(?:__Secure-)?cairn\.session_token=/.test(
    getRequestHeader(event, 'cookie') ?? '',
  )
  if (signedIn || /^(?:\/zh)?\/invite\//.test(pathname)) {
    setResponseHeader(event, 'cache-control', 'private, no-store')
    appendResponseHeader(event, 'vary', 'cookie')
  }
})
