import { CairnEnv } from '@cairnhq/contracts'
import { z } from 'zod'

// Read at runtime, not build time: one image serves every environment.
const ServerEnv = z
  .object({
    CAIRN_ENV: CairnEnv.default('development'),
    CAIRN_VERSION: z.string().default('dev'),
    CAIRN_API_ORIGIN: z.url().default('http://localhost:4000'),
  })
  .transform((e) => ({ env: e.CAIRN_ENV, version: e.CAIRN_VERSION, apiOrigin: e.CAIRN_API_ORIGIN }))

let cached: z.infer<typeof ServerEnv> | undefined

export function serverEnv() {
  return (cached ??= ServerEnv.parse(process.env))
}
