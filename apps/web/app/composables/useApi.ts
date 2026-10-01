type Options = NonNullable<Parameters<typeof $fetch.raw>[1]>

// Headers a reverse proxy may carry the visitor's address in; the api proxy
// picks the one CAIRN_CLIENT_IP_HEADER names.
const forwarded = ['cookie', 'cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']

/**
 * Calls the api. During SSR it sends the visitor's cookies and hands any
 * refreshed session cookie back to the browser.
 */
export function useApi() {
  const event = import.meta.server ? useRequestEvent() : undefined
  const headers = import.meta.server ? useRequestHeaders(forwarded) : {}

  return async function api<T>(path: string, options: Options = {}): Promise<T> {
    const response = await $fetch.raw<T>(path, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
    })
    if (event) {
      for (const cookie of response.headers.getSetCookie()) {
        event.node.res.appendHeader('set-cookie', cookie)
      }
    }
    return response._data as T
  }
}
