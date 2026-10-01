import type { Locale } from '@cairnhq/contracts'
import { schema, type Db } from '@cairnhq/db'
import { passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { magicLink } from 'better-auth/plugins/magic-link'
import { eq, sql } from 'drizzle-orm'
import type { Config } from '../../config'
import { recordAudit } from '../audit'
import type { MailJob } from '../mail/service'
import type { SettingsService } from '../settings/service'
import { INVITE_COOKIE, type InvitationService } from './invitations'

export const CLIENT_IP_HEADER = 'x-cairn-client-ip'
export const FRESH_SESSION_SECONDS = 10 * 60

interface Deps {
  db: Db
  config: Config
  settings: SettingsService
  invitations: InvitationService
  /** Returns false when mail is not configured. The CLI passes a printer instead. */
  sendMail: (job: MailJob) => Promise<boolean>
  isMailConfigured: () => Promise<boolean>
}

function readCookie(headers: Headers | undefined, name: string) {
  const header = headers?.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return decodeURIComponent(value.join('='))
  }
  return undefined
}

const reject = (code: string, message: string) =>
  new APIError('FORBIDDEN', { code: code.toUpperCase(), message })

export function createAuth({
  db,
  config,
  settings,
  invitations,
  sendMail,
  isMailConfigured,
}: Deps) {
  const url = new URL(config.publicUrl)

  async function localeFor(email: string): Promise<Locale> {
    const rows = await db.execute<{ locale: Locale | null }>(
      sql`select locale from ${schema.users} where email = ${email.toLowerCase()} limit 1`,
    )
    return rows.rows[0]?.locale ?? (await settings.getSiteSettings()).site.locale
  }

  return betterAuth({
    appName: 'Cairn',
    baseURL: config.publicUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [url.origin],

    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        passkey: schema.passkeys,
        rateLimit: schema.rateLimits,
      },
    }),

    advanced: {
      cookiePrefix: 'cairn',
      useSecureCookies: url.protocol === 'https:',
      database: { generateId: false },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },

    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      freshAge: FRESH_SESSION_SECONDS,
    },

    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 3600, max: 10 },
        '/sign-in/magic-link': { window: 60, max: 3 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },

    user: {
      additionalFields: {
        role: { type: 'string', input: false, defaultValue: 'member' },
        status: { type: 'string', input: false, defaultValue: 'active' },
        locale: { type: 'string', required: false, input: false },
      },
    },

    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        // Linking is only ever done by a signed-in user from the account page.
        allowDifferentEmails: true,
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      async sendResetPassword({ user, url }) {
        await sendMail({
          to: user.email,
          locale: await localeFor(user.email),
          template: { kind: 'resetPassword', url },
        })
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      async sendVerificationEmail({ user, url }) {
        await sendMail({
          to: user.email,
          locale: await localeFor(user.email),
          template: { kind: 'verifyEmail', url },
        })
      },
    },

    socialProviders: config.github
      ? { github: { clientId: config.github.clientId, clientSecret: config.github.clientSecret } }
      : {},

    plugins: [
      passkey({ rpID: url.hostname, rpName: 'Cairn', origin: url.origin }),
      magicLink({
        expiresIn: 15 * 60,
        storeToken: 'hashed',
        async sendMagicLink({ email, url }) {
          await sendMail({
            to: email,
            locale: await localeFor(email),
            template: { kind: 'magicLink', url },
          })
        },
      }),
    ],

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const site = await settings.getSiteSettings()
        const passwordPaths = ['/sign-in/email', '/sign-up/email', '/request-password-reset']
        if (passwordPaths.includes(ctx.path) && !site.auth.password) {
          throw reject('password_disabled', 'Password sign-in is turned off on this site.')
        }
        if (
          ctx.path === '/sign-in/magic-link' &&
          (!site.auth.magicLink || !(await isMailConfigured()))
        ) {
          throw reject('magic_link_disabled', 'Email sign-in links are not available on this site.')
        }
      }),
    },

    databaseHooks: {
      session: {
        create: {
          async before(session) {
            const [user] = await db
              .select({ status: schema.users.status })
              .from(schema.users)
              .where(eq(schema.users.id, session.userId))
            if (user?.status === 'suspended') {
              throw reject('account_suspended', 'This account is suspended.')
            }
          },
        },
      },
      user: {
        create: {
          async before(user, ctx) {
            const headers = ctx?.headers ?? ctx?.request?.headers
            const token = readCookie(headers, INVITE_COOKIE)
            const email = user.email.toLowerCase()

            if (token) {
              const invalid = reject(
                'invitation_invalid',
                'This invitation has expired or was already used.',
              )
              const pending = await invitations.findPending(token)
              if (!pending) throw invalid
              if (pending.email && pending.email !== email) {
                throw reject(
                  'invitation_email_mismatch',
                  'This invitation was sent to a different email address.',
                )
              }
              if (pending.role === 'owner' && (await invitations.ownerExists())) {
                throw reject('owner_exists', 'This site already has an owner.')
              }
              const emailVerified = user.emailVerified || pending.email === email
              if (!emailVerified && !(await isMailConfigured())) {
                throw reject(
                  'email_unverifiable',
                  'This site cannot send email, so it cannot confirm your address. Sign up with GitHub or ask for an invitation sent to your email.',
                )
              }
              const invitation = await invitations.claim(token, email)
              if (!invitation) throw invalid
              return { data: { ...user, role: invitation.role, status: 'active', emailVerified } }
            }

            const { registration } = await settings.getSiteSettings()
            if (registration.mode === 'invite') {
              throw reject('invitation_required', 'Joining this site requires an invitation.')
            }
            if (!user.emailVerified && !(await isMailConfigured())) {
              throw reject(
                'email_unverifiable',
                'This site cannot send email, so it cannot confirm your address. Sign up with GitHub or ask for an invitation sent to your email.',
              )
            }
            return {
              data: {
                ...user,
                role: 'member',
                status: registration.mode === 'approval' ? 'pending' : 'active',
              },
            }
          },

          async after(user, ctx) {
            const headers = ctx?.headers ?? ctx?.request?.headers
            const token = readCookie(headers, INVITE_COOKIE)
            if (token) await invitations.markAcceptedBy(token, user.id)
            await recordAudit(db, {
              actor: { kind: 'user', id: user.id },
              action: 'user.create',
              targetType: 'user',
              targetId: user.id,
              data: { role: user.role, status: user.status, invited: Boolean(token) },
              ip: headers?.get(CLIENT_IP_HEADER) ?? null,
            })
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>
