import { ApiErrorBody } from '@cairnhq/contracts'
import type { ZodType } from 'zod'

export const json = <T extends ZodType>(schema: T, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
})

export const body = <T extends ZodType>(schema: T) => ({
  required: true,
  content: { 'application/json': { schema } },
})

export const errors = {
  400: json(ApiErrorBody, 'Invalid request'),
  401: json(ApiErrorBody, 'Not signed in'),
  403: json(ApiErrorBody, 'Not allowed'),
} as const
