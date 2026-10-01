import type { Locale } from '@cairnhq/contracts'
import type { PgBoss } from 'pg-boss'
import type { Config } from '../../config'
import { ApiError } from '../../lib/errors'
import type { SettingsService } from '../settings/service'
import { createDriver } from './drivers'
import { isRecipientAllowed } from './recipients'
import { renderMail, type MailTemplate } from './templates'

export const MAIL_QUEUE = 'mail.send'

export interface MailJob {
  to: string
  locale: Locale
  template: MailTemplate
}

interface Deps {
  boss: PgBoss
  config: Config
  settings: SettingsService
}

export function createMailService({ boss, config, settings }: Deps) {
  async function isConfigured() {
    return (await settings.resolveMail()).config.driver !== 'none'
  }

  /** Queue a message for the worker. Returns false when no mail driver is configured. */
  const allowed = (to: string) =>
    isRecipientAllowed(to, config.mailAllowedRecipients, { staging: config.env === 'staging' })

  async function enqueue(job: MailJob): Promise<boolean> {
    if (!(await isConfigured())) {
      console.warn(`[mail] no mail driver configured; not sending "${job.template.kind}"`)
      return false
    }
    await boss.send(MAIL_QUEUE, job)
    return true
  }

  async function deliver(job: MailJob) {
    if (!allowed(job.to)) {
      console.log(
        `[mail] "${job.template.kind}" suppressed: recipient not in CAIRN_MAIL_ALLOWED_RECIPIENTS`,
      )
      return
    }
    const [{ config: mail }, site] = await Promise.all([
      settings.resolveMail(),
      settings.getSiteSettings(),
    ])
    const driver = createDriver(mail, site.site.title)
    if (!driver) {
      console.warn(`[mail] mail driver became unset; dropping "${job.template.kind}"`)
      return
    }
    await driver.send({ to: job.to, ...renderMail(job.template, site.site.title, job.locale) })
  }

  /** Sent inline so the owner sees the provider's error straight away. */
  async function sendTest(to: string, locale: Locale) {
    if (!allowed(to)) {
      throw new ApiError(
        400,
        'recipient_not_allowed',
        'Your address is not in CAIRN_MAIL_ALLOWED_RECIPIENTS on this instance.',
      )
    }
    if (!(await isConfigured())) {
      throw new ApiError(400, 'mail_not_configured', 'No mail driver is configured.')
    }
    try {
      await deliver({ to, locale, template: { kind: 'test' } })
    } catch (error) {
      throw new ApiError(502, 'mail_failed', error instanceof Error ? error.message : String(error))
    }
  }

  return { isConfigured, enqueue, deliver, sendTest }
}

export type MailService = ReturnType<typeof createMailService>

/** Messages carry one-time links, so completed jobs are not kept around. */
export async function createMailQueue(boss: PgBoss) {
  await boss.createQueue(MAIL_QUEUE, {
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 3600,
    expireInSeconds: 120,
    retentionSeconds: 6 * 3600,
    deleteAfterSeconds: 3600,
  })
}

export async function startMailWorker(boss: PgBoss, mail: MailService) {
  await boss.work<MailJob>(MAIL_QUEUE, async (jobs) => {
    for (const job of jobs) await mail.deliver(job.data)
  })
}
