import { Role } from '@cairnhq/contracts'
import type { Db } from '@cairnhq/db'
import type { PgBoss } from 'pg-boss'
import { parseArgs } from 'node:util'
import type { Config } from './config'
import { ApiError } from './lib/errors'
import { recordAudit } from './modules/audit'
import type { MailJob } from './modules/mail/service'
import { createServices } from './services'

interface Deps {
  config: Config
  db: Db
  boss: PgBoss
}

const usage = `Commands:
  migrate                                    apply database migrations
  invite --role <role> [--email <address>]   create an invitation and print its link
  reset-password --email <address>           print a one-time password reset link`

export async function runCli(command: string, args: string[], deps: Deps): Promise<number> {
  try {
    switch (command) {
      case 'invite':
        return await invite(args, deps)
      case 'reset-password':
        return await resetPassword(args, deps)
      default:
        console.error(`Unknown command: ${command}\n\n${usage}`)
        return 1
    }
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Error: ${error.message}`)
      return 1
    }
    throw error
  }
}

async function invite(args: string[], { config, db, boss }: Deps) {
  const { values } = parseArgs({
    args,
    options: { role: { type: 'string' }, email: { type: 'string' } },
  })
  const role = Role.safeParse(values.role)
  if (!role.success) {
    console.error(`--role must be one of: ${Role.options.join(', ')}`)
    return 1
  }
  const services = createServices({ config, db, boss })
  const { url, mailed, row } = await services.invitations.create({
    role: role.data,
    email: values.email,
    actor: { kind: 'cli' },
  })
  console.log(
    `Invitation for ${role.data}${row.email ? ` <${row.email}>` : ''}, valid until ${row.expiresAt.toISOString()}:`,
  )
  console.log(url)
  if (mailed) console.log('It has also been queued for delivery by email.')
  return 0
}

async function resetPassword(args: string[], { config, db, boss }: Deps) {
  const { values } = parseArgs({ args, options: { email: { type: 'string' } } })
  if (!values.email) {
    console.error('--email is required')
    return 1
  }
  let link: string | null = null
  const capture = async (job: MailJob) => {
    if (job.template.kind === 'resetPassword') link = job.template.url
    return true
  }
  const services = createServices({ config, db, boss, sendMail: capture })
  await services.auth.api.requestPasswordReset({
    body: {
      email: values.email,
      redirectTo: new URL('/reset-password', config.publicUrl).toString(),
    },
  })
  if (!link) {
    console.error(`No account uses ${values.email}.`)
    return 1
  }
  await recordAudit(db, {
    actor: { kind: 'cli' },
    action: 'user.password_reset_link',
    targetType: 'user',
    data: { email: values.email.toLowerCase() },
  })
  console.log('One-time password reset link, valid for an hour:')
  console.log(link)
  return 0
}
