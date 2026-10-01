import type { Me, PublicSettings } from '@cairnhq/contracts'
import type { Viewer } from '@cairnhq/policy'

/** The signed-in member and the site's public settings, loaded once per visit. */
export function useSession() {
  const me = useState<Me | null>('me', () => null)
  const site = useState<PublicSettings | null>('site', () => null)
  const loaded = useState('session-loaded', () => false)
  const api = useApi()

  // An unconfirmed address has no more rights than a pending account.
  const viewer = computed<Viewer | null>(() =>
    me.value
      ? {
          id: me.value.id,
          role: me.value.role,
          status: me.value.emailVerified ? me.value.status : 'pending',
        }
      : null,
  )

  async function refresh() {
    const [meResult, siteResult] = await Promise.allSettled([
      api<Me>('/api/me'),
      api<PublicSettings>('/api/settings/public'),
    ])
    me.value = meResult.status === 'fulfilled' ? meResult.value : null
    if (siteResult.status === 'fulfilled') site.value = siteResult.value
    loaded.value = true
  }

  async function signOut() {
    await authClient().signOut()
    me.value = null
  }

  return { me, site, viewer, loaded, refresh, signOut }
}
