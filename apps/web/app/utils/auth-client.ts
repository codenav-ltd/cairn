import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/client'
import { magicLinkClient } from 'better-auth/client/plugins'

function create() {
  return createAuthClient({
    baseURL: window.location.origin,
    basePath: '/api/auth',
    plugins: [passkeyClient(), magicLinkClient()],
  })
}

let client: ReturnType<typeof create> | undefined

/** Better Auth's browser client. Sign-in flows only run in the browser. */
export function authClient() {
  return (client ??= create())
}
