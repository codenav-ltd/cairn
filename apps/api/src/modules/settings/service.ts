import {
  AuthSection,
  defaultSiteSettings,
  MailConfig,
  mailDrivers,
  mailSecretKeys,
  RegistrationSection,
  SiteSection,
  type MailSettingsView,
  type SaveMailSettings,
  type SiteSettings,
  type UpdateSiteSettings,
} from '@cairnhq/contracts'
import type { Db } from '@cairnhq/db'
import { z } from 'zod'
import type { Config } from '../../config'
import type { SecretBox } from '../../lib/crypto'
import { badRequest } from '../../lib/errors'
import { recordAudit, type Actor } from '../audit'
import { deleteSetting, readSettings, writeSetting } from './repo'

const sections = {
  site: SiteSection,
  registration: RegistrationSection,
  auth: AuthSection,
} as const
type SectionName = keyof typeof sections

const StoredMail = z.object({
  driver: z.enum(['none', 'log', 'smtp', 'aliyun-dm']),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  secrets: z.record(z.string(), z.string()),
})
type StoredMail = z.infer<typeof StoredMail>

export interface ResolvedMail {
  source: 'settings' | 'environment'
  config: MailConfig
}

interface Deps {
  db: Db
  config: Config
  box: SecretBox
}

export function createSettingsService({ db, config, box }: Deps) {
  async function getSiteSettings(): Promise<SiteSettings> {
    const stored = await readSettings(db, Object.keys(sections))
    const result = structuredClone(defaultSiteSettings)
    for (const name of Object.keys(sections) as SectionName[]) {
      const raw = stored.get(name)
      if (raw === undefined) continue
      const parsed = sections[name].safeParse({ ...defaultSiteSettings[name], ...(raw as object) })
      if (parsed.success) Object.assign(result[name], parsed.data)
      else
        console.warn(`[settings] ignoring invalid "${name}" section`, z.prettifyError(parsed.error))
    }
    return result
  }

  async function updateSiteSettings(patch: UpdateSiteSettings, actor: Actor, ip?: string | null) {
    const current = await getSiteSettings()
    const changed: SectionName[] = []
    await db.transaction(async (tx) => {
      for (const name of Object.keys(sections) as SectionName[]) {
        const update = patch[name]
        if (!update) continue
        const next = sections[name].parse({ ...current[name], ...update })
        await writeSetting(tx, name, next)
        changed.push(name)
      }
      if (changed.length > 0) {
        await recordAudit(tx, {
          actor,
          action: 'settings.update',
          targetType: 'settings',
          data: Object.fromEntries(changed.map((n) => [n, patch[n]])),
          ip,
        })
      }
    })
    return getSiteSettings()
  }

  async function readStoredMail(): Promise<StoredMail | null> {
    const raw = (await readSettings(db, ['mail'])).get('mail')
    if (raw === undefined) return null
    const parsed = StoredMail.safeParse(raw)
    if (!parsed.success) {
      console.warn('[settings] ignoring invalid saved mail configuration')
      return null
    }
    return parsed.data
  }

  async function resolveMail(): Promise<ResolvedMail> {
    const stored = await readStoredMail()
    if (!stored) return { source: 'environment', config: config.mail }
    try {
      const secrets = Object.fromEntries(
        Object.entries(stored.secrets).map(([k, v]) => [k, box.open(v)]),
      )
      return {
        source: 'settings',
        config: MailConfig.parse({ driver: stored.driver, ...stored.values, ...secrets }),
      }
    } catch (error) {
      // Most likely CAIRN_SECRET changed since the secrets were saved.
      console.error(
        '[settings] saved mail configuration is unreadable; using the environment',
        error,
      )
      return { source: 'environment', config: config.mail }
    }
  }

  function view({ source, config: mail }: ResolvedMail): MailSettingsView {
    const values: MailSettingsView['values'] = {}
    const secrets: MailSettingsView['secrets'] = {}
    for (const field of mailDrivers[mail.driver]) {
      const value = (mail as Record<string, unknown>)[field.key]
      if (field.kind === 'secret') secrets[field.key] = typeof value === 'string' && value !== ''
      else if (value !== undefined) values[field.key] = value as string | number | boolean
    }
    return {
      source,
      driver: mail.driver,
      values,
      secrets,
      allowedRecipients: config.mailAllowedRecipients,
    }
  }

  async function saveMail(input: SaveMailSettings, actor: Actor, ip?: string | null) {
    const secretKeys = mailSecretKeys(input.driver)
    const existing = await readStoredMail()
    const keep = existing?.driver === input.driver ? existing.secrets : {}

    const plainSecrets: Record<string, string> = {}
    const sealedSecrets: Record<string, string> = {}
    for (const key of secretKeys) {
      const given = input.values[key]
      if (typeof given === 'string' && given !== '') {
        plainSecrets[key] = given
        sealedSecrets[key] = box.seal(given)
      } else if (keep[key]) {
        plainSecrets[key] = box.open(keep[key])
        sealedSecrets[key] = keep[key]
      }
    }

    const nonSecret = Object.fromEntries(
      Object.entries(input.values).filter(([k, v]) => !secretKeys.includes(k) && v !== ''),
    )
    const parsed = MailConfig.safeParse({ driver: input.driver, ...nonSecret, ...plainSecrets })
    if (!parsed.success) throw badRequest(z.prettifyError(parsed.error), 'invalid_mail_settings')

    const values = Object.fromEntries(
      Object.entries(parsed.data).filter(
        ([k, v]) => k !== 'driver' && !secretKeys.includes(k) && v !== undefined,
      ),
    ) as StoredMail['values']

    await db.transaction(async (tx) => {
      await writeSetting(tx, 'mail', { driver: input.driver, values, secrets: sealedSecrets })
      await recordAudit(tx, {
        actor,
        action: 'settings.mail.save',
        targetType: 'settings',
        data: {
          driver: input.driver,
          secretsChanged: Object.keys(input.values).filter(
            (k) => secretKeys.includes(k) && input.values[k] !== '',
          ),
        },
        ip,
      })
    })
    return view(await resolveMail())
  }

  async function clearMail(actor: Actor, ip?: string | null) {
    await db.transaction(async (tx) => {
      await deleteSetting(tx, 'mail')
      await recordAudit(tx, { actor, action: 'settings.mail.clear', targetType: 'settings', ip })
    })
    return view(await resolveMail())
  }

  return {
    getSiteSettings,
    updateSiteSettings,
    resolveMail,
    getMailView: async () => view(await resolveMail()),
    saveMail,
    clearMail,
  }
}

export type SettingsService = ReturnType<typeof createSettingsService>
