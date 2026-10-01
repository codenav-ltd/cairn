import {
  MailSettingsView,
  PublicSettings,
  SaveMailSettings,
  SiteSettings,
  UpdateSiteSettings,
} from '@cairnhq/contracts'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Config } from '../../config'
import type { AppEnv } from '../../context'
import { authorize, requireFreshSession } from '../../lib/guards'
import { body, errors, json } from '../../lib/openapi'
import type { MailService } from '../mail/service'
import type { MemberService } from '../identity/members'
import type { SettingsService } from './service'

interface Deps {
  config: Config
  settings: SettingsService
  mail: MailService
  members: MemberService
}

const tags = ['Settings']

export function settingsRoutes({ config, settings, mail, members }: Deps) {
  const app = new OpenAPIHono<AppEnv>()

  const actorOf = (id: string) => ({ kind: 'user' as const, id })

  return app
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/settings/public',
        tags,
        responses: { 200: json(PublicSettings) },
      }),
      async (c) => {
        const [site, mailReady] = await Promise.all([
          settings.getSiteSettings(),
          mail.isConfigured(),
        ])
        return c.json(
          {
            title: site.site.title,
            description: site.site.description,
            locale: site.site.locale,
            registration: site.registration.mode,
            methods: {
              password: site.auth.password,
              magicLink: site.auth.magicLink && mailReady,
              passkey: true,
              github: Boolean(config.github),
            },
            mail: mailReady,
          },
          200,
        )
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/settings',
        tags,
        responses: { 200: json(SiteSettings), ...errors },
      }),
      async (c) => {
        authorize(c, 'settings.manage')
        return c.json(await settings.getSiteSettings(), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'patch',
        path: '/api/settings',
        tags,
        request: { body: body(UpdateSiteSettings) },
        responses: { 200: json(SiteSettings), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'settings.manage')
        const patch = c.req.valid('json')
        if (patch.registration || patch.auth) requireFreshSession(c)
        return c.json(
          await settings.updateSiteSettings(patch, actorOf(viewer.id), c.get('ip')),
          200,
        )
      },
    )
    .openapi(
      createRoute({
        method: 'get',
        path: '/api/settings/mail',
        tags,
        responses: { 200: json(MailSettingsView), ...errors },
      }),
      async (c) => {
        authorize(c, 'settings.manage')
        return c.json(await settings.getMailView(), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'put',
        path: '/api/settings/mail',
        tags,
        request: { body: body(SaveMailSettings) },
        responses: { 200: json(MailSettingsView), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'settings.manage')
        requireFreshSession(c)
        return c.json(
          await settings.saveMail(c.req.valid('json'), actorOf(viewer.id), c.get('ip')),
          200,
        )
      },
    )
    .openapi(
      createRoute({
        method: 'delete',
        path: '/api/settings/mail',
        tags,
        responses: { 200: json(MailSettingsView), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'settings.manage')
        requireFreshSession(c)
        return c.json(await settings.clearMail(actorOf(viewer.id), c.get('ip')), 200)
      },
    )
    .openapi(
      createRoute({
        method: 'post',
        path: '/api/settings/mail/test',
        tags,
        responses: { 200: json(z.object({ sentTo: z.string() })), ...errors },
      }),
      async (c) => {
        const viewer = authorize(c, 'settings.manage')
        const me = await members.me(viewer.id)
        const site = await settings.getSiteSettings()
        await mail.sendTest(me.email, me.locale ?? site.site.locale)
        return c.json({ sentTo: me.email }, 200)
      },
    )
}
