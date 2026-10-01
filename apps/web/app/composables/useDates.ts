/** Dates in the visitor's language. */
export function useDates() {
  const { localeProperties } = useI18n()
  const language = computed(() => localeProperties.value.language ?? 'en')

  return {
    date: (iso: string | Date) =>
      new Intl.DateTimeFormat(language.value, { dateStyle: 'medium' }).format(new Date(iso)),
    dateTime: (iso: string | Date) =>
      new Intl.DateTimeFormat(language.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      ),
  }
}
