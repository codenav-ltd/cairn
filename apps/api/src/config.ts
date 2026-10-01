import { CairnEnv } from '@cairnhq/contracts'
import { z } from 'zod'

const Role = z.enum(['api', 'worker'])
export type Role = z.infer<typeof Role>

const flag = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1')

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
  })
  .superRefine((c, ctx) => {
    if (c.CAIRN_ENV !== 'development' && c.CAIRN_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['CAIRN_SECRET'],
        message: 'must be at least 32 characters outside development',
      })
    }
  })
  .transform((c) => ({
    env: c.CAIRN_ENV,
    publicUrl: c.CAIRN_PUBLIC_URL,
    secret: c.CAIRN_SECRET,
    version: c.CAIRN_VERSION,
    roles: new Set(c.CAIRN_ROLES),
    autoMigrate: c.CAIRN_AUTO_MIGRATE,
    databaseUrl: c.DATABASE_URL,
    port: c.CAIRN_API_PORT,
  }))

export type Config = z.infer<typeof Config>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = Config.safeParse(source)
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
