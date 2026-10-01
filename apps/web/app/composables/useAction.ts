type Result<T> = { ok: true; value: T } | { ok: false; code?: string }

/**
 * Runs one async action at a time and keeps which one is in flight and the
 * last failure as a readable sentence. Better Auth client calls resolve with
 * `{ error }` instead of throwing; those count as failures too.
 */
export function useAction() {
  const errorMessage = useErrorMessage()
  const pending = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function run<T>(key: string, fn: () => Promise<T>): Promise<Result<T>> {
    pending.value = key
    error.value = null
    try {
      const value = await fn()
      const failure = (value as { error?: unknown } | null)?.error
      if (failure) throw failure
      return { ok: true, value }
    } catch (e) {
      error.value = errorMessage(e)
      return { ok: false, code: errorInfo(e).code }
    } finally {
      pending.value = null
    }
  }

  return { pending, error, run }
}
