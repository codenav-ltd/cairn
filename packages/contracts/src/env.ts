import { z } from 'zod'

export const CairnEnv = z.enum(['development', 'staging', 'production'])
export type CairnEnv = z.infer<typeof CairnEnv>
