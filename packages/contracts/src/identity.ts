import { z } from 'zod'
import { Locale } from './locale'

export const roles = ['owner', 'editor', 'moderator', 'member'] as const
export const Role = z.enum(roles)
export type Role = z.infer<typeof Role>

export const userStatuses = ['active', 'pending', 'suspended'] as const
export const UserStatus = z.enum(userStatuses)
export type UserStatus = z.infer<typeof UserStatus>

export const Me = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: Role,
  status: UserStatus,
  locale: Locale.nullable(),
})
export type Me = z.infer<typeof Me>

export const UpdateMe = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  locale: Locale.nullable().optional(),
})
export type UpdateMe = z.infer<typeof UpdateMe>

export const Member = Me.extend({
  createdAt: z.iso.datetime(),
})
export type Member = z.infer<typeof Member>

export const UpdateMember = z
  .object({
    role: Role.exclude(['owner']).optional(),
    status: UserStatus.optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, 'Nothing to update')
export type UpdateMember = z.infer<typeof UpdateMember>

export const InvitationState = z.enum(['pending', 'accepted', 'revoked', 'expired'])
export type InvitationState = z.infer<typeof InvitationState>

export const Invitation = z.object({
  id: z.uuid(),
  role: Role,
  email: z.email().nullable(),
  invitedBy: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  state: InvitationState,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
})
export type Invitation = z.infer<typeof Invitation>

export const CreateInvitation = z.object({
  role: Role.exclude(['owner']),
  email: z.email().optional(),
})
export type CreateInvitation = z.infer<typeof CreateInvitation>

export const CreatedInvitation = z.object({
  invitation: Invitation,
  url: z.url(),
  mailed: z.boolean(),
})
export type CreatedInvitation = z.infer<typeof CreatedInvitation>

export const InvitationPreview = z.object({
  role: Role,
  email: z.string().nullable(),
  inviterName: z.string().nullable(),
  expiresAt: z.iso.datetime(),
  siteTitle: z.string(),
})
export type InvitationPreview = z.infer<typeof InvitationPreview>
