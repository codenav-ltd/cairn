import type { Db } from '@cairnhq/db'
import type { PgBoss } from 'pg-boss'
import type { Config } from './config'
import { createSecretBox } from './lib/crypto'
import { createAuth } from './modules/identity/auth'
import { createInvitationService } from './modules/identity/invitations'
import { createMemberService } from './modules/identity/members'
import { createMailService, type MailJob } from './modules/mail/service'
import { createSettingsService } from './modules/settings/service'

interface Deps {
  config: Config
  db: Db
  boss: PgBoss
  /** Replaces queued delivery, e.g. to print links from the CLI. */
  sendMail?: (job: MailJob) => Promise<boolean>
}

export function createServices({ config, db, boss, sendMail }: Deps) {
  const box = createSecretBox(config.secret, 'settings-secrets')
  const settings = createSettingsService({ db, config, box })
  const mail = createMailService({ boss, config, settings })
  const invitations = createInvitationService({ db, config, settings, mail })
  const members = createMemberService({ db })
  const auth = createAuth({
    db,
    config,
    settings,
    invitations,
    sendMail: sendMail ?? mail.enqueue,
    isMailConfigured: sendMail ? async () => true : mail.isConfigured,
  })
  return { settings, mail, invitations, members, auth }
}

export type Services = ReturnType<typeof createServices>
