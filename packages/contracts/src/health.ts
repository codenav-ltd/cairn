import { z } from 'zod'
import { CairnEnv } from './env'

export const ApiHealth = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  env: CairnEnv,
  database: z.enum(['ok', 'unreachable']),
})
export type ApiHealth = z.infer<typeof ApiHealth>

export const ApiErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>

export const SiteHealth = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  env: CairnEnv,
  api: ApiHealth.nullable(),
})
export type SiteHealth = z.infer<typeof SiteHealth>
