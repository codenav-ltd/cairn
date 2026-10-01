/**
 * CAIRN_MAIL_ALLOWED_RECIPIENTS: exact addresses or `@domain` suffixes. An
 * empty list allows everyone, except on staging, where it allows no one.
 */
export function isRecipientAllowed(
  address: string,
  rules: readonly string[],
  { staging = false }: { staging?: boolean } = {},
): boolean {
  if (rules.length === 0) return !staging
  const target = address.trim().toLowerCase()
  return rules.some((rule) => (rule.startsWith('@') ? target.endsWith(rule) : target === rule))
}
