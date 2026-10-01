import type { Locale, Role } from '@cairnhq/contracts'

export type MailTemplate =
  | { kind: 'invitation'; url: string; role: Role; inviterName: string | null; expiresAt: string }
  | { kind: 'magicLink'; url: string }
  | { kind: 'verifyEmail'; url: string }
  | { kind: 'resetPassword'; url: string }
  | { kind: 'test' }

export interface RenderedMail {
  subject: string
  html: string
  text: string
}

interface Copy {
  subject: string
  lines: string[]
  action?: { label: string; url: string }
  footer: string
}

const roleNames: Record<Locale, Record<Role, string>> = {
  en: { owner: 'owner', editor: 'editor', moderator: 'moderator', member: 'member' },
  'zh-CN': { owner: '站长', editor: '编辑', moderator: '版主', member: '成员' },
}

function formatDate(iso: string, locale: Locale) {
  return (
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(iso)) + ' UTC'
  )
}

function copy(template: MailTemplate, site: string, locale: Locale): Copy {
  const zh = locale === 'zh-CN'
  const ignore = zh
    ? '如果这不是你本人的操作，忽略这封邮件即可。'
    : 'If you did not ask for this, you can ignore this email.'

  switch (template.kind) {
    case 'invitation': {
      const role = roleNames[locale][template.role]
      const expires = formatDate(template.expiresAt, locale)
      return zh
        ? {
            subject: `邀请你加入 ${site}`,
            lines: [
              template.inviterName
                ? `${template.inviterName} 邀请你以${role}身份加入 ${site}。`
                : `你被邀请以${role}身份加入 ${site}。`,
              `邀请链接只能使用一次，${expires} 前有效。`,
            ],
            action: { label: '接受邀请', url: template.url },
            footer: '如果你不认识邀请人，忽略这封邮件即可。',
          }
        : {
            subject: `You're invited to ${site}`,
            lines: [
              template.inviterName
                ? `${template.inviterName} invited you to join ${site} as ${articled(role)}.`
                : `You've been invited to join ${site} as ${articled(role)}.`,
              `The link works once and expires on ${expires}.`,
            ],
            action: { label: 'Accept invitation', url: template.url },
            footer: "If you weren't expecting this, you can ignore this email.",
          }
    }
    case 'magicLink':
      return zh
        ? {
            subject: `登录 ${site}`,
            lines: ['点击下面的按钮登录。链接 15 分钟内有效，只能使用一次。'],
            action: { label: '登录', url: template.url },
            footer: ignore,
          }
        : {
            subject: `Sign in to ${site}`,
            lines: ['Use the button below to sign in. The link works once, within 15 minutes.'],
            action: { label: 'Sign in', url: template.url },
            footer: ignore,
          }
    case 'verifyEmail':
      return zh
        ? {
            subject: `确认你在 ${site} 的邮箱`,
            lines: ['点击下面的按钮确认这个邮箱地址属于你。'],
            action: { label: '确认邮箱', url: template.url },
            footer: ignore,
          }
        : {
            subject: `Confirm your email for ${site}`,
            lines: ['Use the button below to confirm this address is yours.'],
            action: { label: 'Confirm email', url: template.url },
            footer: ignore,
          }
    case 'resetPassword':
      return zh
        ? {
            subject: `重设 ${site} 的密码`,
            lines: ['点击下面的按钮设置新密码。链接 1 小时内有效。'],
            action: { label: '重设密码', url: template.url },
            footer: ignore,
          }
        : {
            subject: `Reset your ${site} password`,
            lines: ['Use the button below to choose a new password. The link expires in an hour.'],
            action: { label: 'Reset password', url: template.url },
            footer: ignore,
          }
    case 'test':
      return zh
        ? {
            subject: `${site} 测试邮件`,
            lines: ['邮件设置可以正常使用。'],
            footer: '这封邮件是从站点设置里发送的。',
          }
        : {
            subject: `Test message from ${site}`,
            lines: ['Mail settings are working.'],
            footer: 'Sent from the site settings page.',
          }
  }
}

function articled(word: string) {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

export function renderMail(template: MailTemplate, site: string, locale: Locale): RenderedMail {
  const c = copy(template, site, locale)

  const text = [
    ...c.lines,
    ...(c.action ? ['', `${c.action.label}: ${c.action.url}`] : []),
    '',
    '—',
    c.footer,
  ].join('\n')

  const paragraphs = c.lines
    .map((line) => `<p style="margin:0 0 16px">${escape(line)}</p>`)
    .join('')
  const button = c.action
    ? `<p style="margin:24px 0"><a href="${escape(c.action.url)}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#1f2a24;color:#ffffff;text-decoration:none;font-weight:600">${escape(c.action.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#5b6660;word-break:break-all">${escape(c.action.url)}</p>`
    : ''
  const html =
    `<!doctype html><html lang="${locale}"><body style="margin:0;padding:24px;background:#f6f5f1">` +
    `<div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:8px;font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2a24">` +
    `<p style="margin:0 0 24px;font-weight:700">${escape(site)}</p>` +
    paragraphs +
    button +
    `<p style="margin:24px 0 0;font-size:13px;color:#5b6660">${escape(c.footer)}</p>` +
    `</div></body></html>`

  return { subject: c.subject, html, text }
}
