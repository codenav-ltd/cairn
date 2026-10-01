import { CairnEnv, MailConfig } from '@cairnhq/contracts'
import { z } from 'zod'

const Role = z.enum(['api', 'worker'])
export type Role = z.infer<typeof Role>

const flag = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1')
const optional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined))
const list = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  )

const Config = z
  .object({
    CAIRN_ENV: CairnEnv.default('development'),
    CAIRN_PUBLIC_URL: z.url(),
    CAIRN_SECRET: z.string().min(1),
    CAIRN_VERSION: z.string().default('dev'),
    CAIRN_ROLES: z
      .string()
      .default('api,worker')
      .transform((s) =>
        s
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
      )
      .pipe(z.array(Role).min(1)),
    CAIRN_AUTO_MIGRATE: flag.default(true),
    DATABASE_URL: z.url(),
    // Not PORT: web reads the same .env, and Nuxt listens on PORT.
    CAIRN_API_PORT: z.coerce.number().int().positive().default(4000),

    CAIRN_MAIL_DRIVER: z.enum(['none', 'log', 'smtp', 'aliyun-dm']).default('none'),
    CAIRN_MAIL_FROM: optional,
    CAIRN_MAIL_FROM_NAME: optional,
    CAIRN_MAIL_REPLY_TO: optional,
    CAIRN_SMTP_URL: optional,
    CAIRN_ALIYUN_DM_REGION: z.string().default('cn-hangzhou'),
    CAIRN_ALIYUN_DM_ACCESS_KEY_ID: optional,
    CAIRN_ALIYUN_DM_ACCESS_KEY_SECRET: optional,
    CAIRN_MAIL_ALLOWED_RECIPIENTS: list,

    CAIRN_GITHUB_CLIENT_ID: optional,
    CAIRN_GITHUB_CLIENT_SECRET: optional,
  })
  .superRefine((c, ctx) => {
    if (c.CAIRN_ENV !== 'development' && c.CAIRN_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['CAIRN_SECRET'],
        message: 'must be at least 32 characters outside development',
      })
    }
    if (Boolean(c.CAIRN_GITHUB_CLIENT_ID) !== Boolean(c.CAIRN_GITHUB_CLIENT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['CAIRN_GITHUB_CLIENT_SECRET'],
        message: 'set both CAIRN_GITHUB_CLIENT_ID and CAIRN_GITHUB_CLIENT_SECRET, or neither',
      })
    }
  })
  .transform((c, ctx) => {
    const mail = envMailConfig(c)
    if (!mail.success) {
      for (const issue of mail.error.issues) {
        ctx.addIssue({ ...issue, path: ['mail', ...issue.path] })
      }
      return z.NEVER
    }
    return {
      env: c.CAIRN_ENV,
      publicUrl: c.CAIRN_PUBLIC_URL,
      secret: c.CAIRN_SECRET,
      version: c.CAIRN_VERSION,
      roles: new Set(c.CAIRN_ROLES),
      autoMigrate: c.CAIRN_AUTO_MIGRATE,
      databaseUrl: c.DATABASE_URL,
      port: c.CAIRN_API_PORT,
      mail: mail.data,
      mailAllowedRecipients: c.CAIRN_MAIL_ALLOWED_RECIPIENTS,
      github:
        c.CAIRN_GITHUB_CLIENT_ID && c.CAIRN_GITHUB_CLIENT_SECRET
          ? { clientId: c.CAIRN_GITHUB_CLIENT_ID, clientSecret: c.CAIRN_GITHUB_CLIENT_SECRET }
          : null,
    }
  })

type RawConfig = z.input<typeof Config> & Record<string, string | undefined>

function envMailConfig(c: {
  CAIRN_MAIL_DRIVER: MailConfig['driver']
  CAIRN_MAIL_FROM?: string
  CAIRN_MAIL_FROM_NAME?: string
  CAIRN_MAIL_REPLY_TO?: string
  CAIRN_SMTP_URL?: string
  CAIRN_ALIYUN_DM_REGION: string
  CAIRN_ALIYUN_DM_ACCESS_KEY_ID?: string
  CAIRN_ALIYUN_DM_ACCESS_KEY_SECRET?: string
}) {
  const sender = {
    from: c.CAIRN_MAIL_FROM,
    fromName: c.CAIRN_MAIL_FROM_NAME,
    replyTo: c.CAIRN_MAIL_REPLY_TO,
  }
  switch (c.CAIRN_MAIL_DRIVER) {
    case 'none':
      return MailConfig.safeParse({ driver: 'none' })
    case 'log':
      return MailConfig.safeParse({
        driver: 'log',
        ...sender,
        from: sender.from ?? 'cairn@localhost',
      })
    case 'smtp':
      return MailConfig.safeParse({ driver: 'smtp', ...sender, ...parseSmtpUrl(c.CAIRN_SMTP_URL) })
    case 'aliyun-dm':
      return MailConfig.safeParse({
        driver: 'aliyun-dm',
        ...sender,
        region: c.CAIRN_ALIYUN_DM_REGION,
        accessKeyId: c.CAIRN_ALIYUN_DM_ACCESS_KEY_ID,
        accessKeySecret: c.CAIRN_ALIYUN_DM_ACCESS_KEY_SECRET,
      })
  }
}

/** `smtps://user:pass@host:465` (implicit TLS) or `smtp://host:587` (STARTTLS when offered). */
export function parseSmtpUrl(value: string | undefined) {
  if (!value) return {}
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { host: '' }
  }
  const secure = url.protocol === 'smtps:'
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : secure ? 465 : 587,
    secure,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  }
}

export type Config = z.infer<typeof Config>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = Config.safeParse(source as RawConfig)
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
