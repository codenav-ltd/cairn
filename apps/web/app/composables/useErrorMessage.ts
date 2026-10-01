/** Turns any api or sign-in error into a sentence in the visitor's language. */
export function useErrorMessage() {
  const { t, te } = useI18n()
  return (e: unknown) => {
    const { code, message, status } = errorInfo(e)
    if (code && te(`errors.${code}`)) return t(`errors.${code}`)
    if (status === 429) return t('errors.rate_limited')
    return message || t('errors.generic')
  }
}
