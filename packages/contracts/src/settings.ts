import { z } from 'zod'
import { Locale } from './locale'

export const SiteSection = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  locale: Locale,
})

export const RegistrationMode = z.enum(['invite', 'approval', 'open'])
export type RegistrationMode = z.infer<typeof RegistrationMode>

export const RegistrationSection = z.object({ mode: RegistrationMode })

export const AuthSection = z.object({
  password: z.boolean(),
  magicLink: z.boolean(),
})

export const SiteSettings = z.object({
  site: SiteSection,
  registration: RegistrationSection,
  auth: AuthSection,
})
export type SiteSettings = z.infer<typeof SiteSettings>

export const defaultSiteSettings: SiteSettings = {
  site: { title: 'Cairn', description: '', locale: 'en' },
  registration: { mode: 'invite' },
  auth: { password: true, magicLink: true },
}

export const UpdateSiteSettings = z.object({
  site: SiteSection.partial().optional(),
  registration: RegistrationSection.optional(),
  auth: AuthSection.partial().optional(),
})
export type UpdateSiteSettings = z.infer<typeof UpdateSiteSettings>

export const SignInMethods = z.object({
  password: z.boolean(),
  magicLink: z.boolean(),
  passkey: z.boolean(),
  github: z.boolean(),
})
export type SignInMethods = z.infer<typeof SignInMethods>

export const PublicSettings = z.object({
  title: z.string(),
  description: z.string(),
  locale: Locale,
  registration: RegistrationMode,
  methods: SignInMethods,
})
export type PublicSettings = z.infer<typeof PublicSettings>

// Mail. Each driver's fields are described once here; the api validates with
// the schemas and the settings form renders from the field list.

export interface MailField {
  key: string
  kind: 'text' | 'email' | 'number' | 'secret' | 'boolean'
  optional?: boolean
}

const sender = {
  from: z.email(),
  fromName: z.string().trim().max(100).optional(),
  replyTo: z.email().optional(),
}

const senderFields: MailField[] = [
  { key: 'from', kind: 'email' },
  { key: 'fromName', kind: 'text', optional: true },
  { key: 'replyTo', kind: 'email', optional: true },
]

export const MailConfig = z.discriminatedUnion('driver', [
  z.object({ driver: z.literal('none') }),
  z.object({ driver: z.literal('log'), ...sender }),
  z.object({
    driver: z.literal('smtp'),
    ...sender,
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  z.object({
    driver: z.literal('aliyun-dm'),
    ...sender,
    region: z.string().trim().min(1),
    accessKeyId: z.string().trim().min(1),
    accessKeySecret: z.string().min(1),
  }),
])
export type MailConfig = z.infer<typeof MailConfig>
export type MailDriverName = MailConfig['driver']

export const mailDrivers: Record<MailDriverName, MailField[]> = {
  none: [],
  log: senderFields,
  smtp: [
    ...senderFields,
    { key: 'host', kind: 'text' },
    { key: 'port', kind: 'number' },
    { key: 'secure', kind: 'boolean' },
    { key: 'username', kind: 'text', optional: true },
    { key: 'password', kind: 'secret', optional: true },
  ],
  'aliyun-dm': [
    ...senderFields,
    { key: 'region', kind: 'text' },
    { key: 'accessKeyId', kind: 'text' },
    { key: 'accessKeySecret', kind: 'secret' },
  ],
}

export function mailSecretKeys(driver: MailDriverName): string[] {
  return mailDrivers[driver].filter((f) => f.kind === 'secret').map((f) => f.key)
}

/** What the api returns: secrets replaced by whether they are set. */
export const MailSettingsView = z.object({
  source: z.enum(['settings', 'environment']),
  driver: z.enum(['none', 'log', 'smtp', 'aliyun-dm']),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  secrets: z.record(z.string(), z.boolean()),
  allowedRecipients: z.array(z.string()),
})
export type MailSettingsView = z.infer<typeof MailSettingsView>

/** What the settings form sends. A secret left out keeps its saved value. */
export const SaveMailSettings = z.object({
  driver: z.enum(['none', 'log', 'smtp', 'aliyun-dm']),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
})
export type SaveMailSettings = z.infer<typeof SaveMailSettings>
