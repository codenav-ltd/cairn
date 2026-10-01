/**
 * CAIRN_MAIL_ALLOWED_RECIPIENTS: exact addresses or `@domain` suffixes. An
 * empty list allows everything.
 */
export function isRecipientAllowed(address: string, rules: readonly string[]): boolean {
  if (rules.length === 0) return true
  const target = address.trim().toLowerCase()
  return rules.some((rule) => (rule.startsWith('@') ? target.endsWith(rule) : target === rule))
}
