import {
  CreatedInvitation,
  CreateInvitation,
  Invitation,
  InvitationPreview,
  Me,
  Member,
  UpdateMe,
  UpdateMember,
} from '@cairnhq/contracts'
import { can } from '@cairnhq/policy'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'
import type { Config } from '../../config'
import type { AppEnv } from '../../context'
import { forbidden, notFound } from '../../lib/errors'
import { authorize, requireSession, requireViewer } from '../../lib/guards'
import { body, errors, json } from '../../lib/openapi'
import { INVITE_COOKIE, toInvitation, type InvitationService } from './invitations'
import type { MemberService } from './members'

interface Deps {
  config: Config
  invitations: InvitationService
  members: MemberService
}

const Id = z.object({ id: z.uuid() })

export function identityRoutes({ config, invitations, members }: Deps) {
  const app = new OpenAPIHono<AppEnv>()
  const secure = new URL(config.publicUrl).protocol === 'https:'

  return app
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/me',
        tags: ['Account'],
        responses: { 200: json(Me), ...errors },
      }),
      async (c) => {
        const session = requireSession(c)
        return c.json(await members.me(session.user.id), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/api/me',
        tags: ['Account'],
        request: { body: body(UpdateMe) },
        responses: { 200: json(Me), ...errors },
      }),
      async (c) => {
        const session = requireSession(c)
        return c.json(await members.updateMe(session.user.id, c.req.valid('json')), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/members',
        tags: ['Members'],
        responses: { 200: json(z.array(Member)), ...errors },
      }),
      async (c) => {
        authorize(c, 'members.view')
        return c.json(await members.list(), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/api/members/{id}',
        tags: ['Members'],
        request: { params: Id, body: body(UpdateMember) },
        responses: { 200: json(Member), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'members.view')
        const { id } = c.req.valid('param')
        return c.json(await members.update(viewer, id, c.req.valid('json'), c.get('ip')), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/invites',
        tags: ['Members'],
        responses: { 200: json(z.array(Invitation)), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'members.view')
        const all = await invitations.list()
        return c.json(
          all.filter((i) => can(viewer, 'invitation.manage', { role: i.role })),
          200,
        )
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/api/invites',
        tags: ['Members'],
        request: { body: body(CreateInvitation) },
        responses: { 201: json(CreatedInvitation, 'Created'), ...errors },
      }),
      async (c) => {
        const input = c.req.valid('json')
        const viewer = authorize(c, 'invitation.manage', { role: input.role })
        const inviter = await members.me(viewer.id)
        const { row, url, mailed } = await invitations.create({
          ...input,
          actor: { kind: 'user', id: viewer.id },
          inviterName: inviter.name,
          ip: c.get('ip'),
        })
        return c.json({ invitation: toInvitation(row, inviter.name), url, mailed }, 201)
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: '/api/invites/{id}',
        tags: ['Members'],
        request: { params: Id },
        responses: { 204: { description: 'Revoked' }, ...errors },
      }),
      async (c) => {
        const viewer = requireViewer(c)
        const { id } = c.req.valid('param')
        const row = await invitations.get(id)
        if (!row) throw notFound('No such invitation.')
        if (!can(viewer, 'invitation.manage', { role: row.role })) throw forbidden()
        await invitations.revoke(id, { kind: 'user', id: viewer.id }, c.get('ip'))
        return c.body(null, 204)
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/invites/{token}',
        tags: ['Members'],
        description:
          'Describes a pending invitation and remembers it in a cookie, so whichever sign-up method follows can use it.',
        request: { params: z.object({ token: z.string().min(20).max(100) }) },
        responses: { 200: json(InvitationPreview), 404: errors[400] },
      }),
      async (c) => {
        const { token } = c.req.valid('param')
        const preview = await invitations.preview(token)
        if (!preview) throw notFound('This invitation has expired or was already used.')
        setCookie(c, INVITE_COOKIE, token, {
          httpOnly: true,
          secure,
          sameSite: 'Lax',
          path: '/',
          maxAge: 60 * 60,
        })
        return c.json(preview, 200)
      },
    )
}
