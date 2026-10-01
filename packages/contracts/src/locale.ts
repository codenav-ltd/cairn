import { z } from 'zod'

export const Locale = z.enum(['en', 'zh-CN'])
export type Locale = z.infer<typeof Locale>
