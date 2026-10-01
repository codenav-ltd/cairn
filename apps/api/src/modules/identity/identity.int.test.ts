import { schema } from '@cairnhq/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHarness, testDatabaseUrl, tokenFrom } from '../../test/harness'

type Harness = Awaited<ReturnType<typeof createHarness>>

describe.skipIf(!testDatabaseUrl)('identity', () => {
  let h: Harness

  beforeAll(async () => {
    h = await createHarness()
  })
  afterAll(async () => {
    await h?.close()
  })

  async function invite(role: 'owner' | 'editor' | 'moderator' | 'member', email: string) {
    const { url } = await h.services.invitations.create({ role, email, actor: { kind: 'cli' } })
    return tokenFrom(url)
  }

  async function join(token: string, email: string) {
    const client = h.client()
    expect((await client.get(`/api/invites/${token}`)).status).toBe(200)
    const signUp = await client.signUp(email)
    return { client, signUp }
  }

  it('refuses sign-up without an invitation', async () => {
    const { status, json } = await h.client().signUp('stranger@example.com')
    expect(status).toBe(403)
    expect(json.code).toBe('INVITATION_REQUIRED')
  })

  it('creates the owner from a CLI invitation', async () => {
    const token = await invite('owner', 'owner@example.com')
    const preview = await h.client().get(`/api/invites/${token}`)
    expect(preview.json).toMatchObject({
      role: 'owner',
      email: 'ow•••@example.com',
      siteTitle: 'Cairn',
    })

    const { client, signUp } = await join(token, 'owner@example.com')
    expect(signUp.status).toBe(200)
    const me = await client.get('/api/me')
    expect(me.json).toMatchObject({ role: 'owner', status: 'active', emailVerified: true })
  })

  it('does not let an invitation be used twice', async () => {
    const token = await invite('member', 'once@example.com')
    expect((await join(token, 'once@example.com')).signUp.status).toBe(200)
    const again = h.client()
    expect((await again.get(`/api/invites/${token}`)).status).toBe(404)
  })

  it('claims an invitation at most once under concurrent attempts', async () => {
    const token = await invite('member', 'race@example.com')
    const results = await Promise.all(
      Array.from({ length: 5 }, () => h.services.invitations.claim(token, 'race@example.com')),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it('rejects an invitation used with a different email', async () => {
    const token = await invite('member', 'right@example.com')
    const { signUp } = await join(token, 'wrong@example.com')
    expect(signUp.status).toBe(403)
    expect(signUp.json.code).toBe('INVITATION_INVALID')
  })

  it('refuses a second owner invitation', async () => {
    await expect(invite('owner', 'second@example.com')).rejects.toMatchObject({
      code: 'owner_exists',
    })
  })

  it('rejects state-changing requests from other origins', async () => {
    const response = await h.app.request('http://cairn.test/api/me', {
      method: 'PATCH',
      headers: { origin: 'https://evil.test', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    })
    expect(response.status).toBe(403)
  })

  describe('as the owner', () => {
    let owner: ReturnType<Harness['client']>

    beforeAll(async () => {
      owner = h.client()
      expect((await owner.signIn('owner@example.com')).status).toBe(200)
    })

    it('updates site settings and shows them publicly', async () => {
      const patched = await owner.patch('/api/settings', { site: { title: 'Garden' } })
      expect(patched.status).toBe(200)
      expect(patched.json.site.title).toBe('Garden')
      const pub = await h.client().get('/api/settings/public')
      expect(pub.json).toMatchObject({
        title: 'Garden',
        registration: 'invite',
        methods: { password: true, magicLink: false, passkey: true, github: false },
      })
    })

    it('holds sign-ups for approval in approval mode', async () => {
      expect(
        (await owner.patch('/api/settings', { registration: { mode: 'approval' } })).status,
      ).toBe(200)
      // Without mail the address cannot be confirmed, so open sign-up is refused outright.
      const refused = await h.client().signUp('newcomer@example.com')
      expect(refused.json.code).toBe('EMAIL_UNVERIFIABLE')
      await owner.patch('/api/settings', { registration: { mode: 'invite' } })
    })

    it('invites, lists and revokes', async () => {
      const created = await owner.post('/api/invites', { role: 'editor', email: 'ed@example.com' })
      expect(created.status).toBe(201)
      expect(created.json).toMatchObject({
        mailed: false,
        invitation: { role: 'editor', state: 'pending' },
      })
      const list = await owner.get('/api/invites')
      expect(list.json.some((i: { id: string }) => i.id === created.json.invitation.id)).toBe(true)
      expect((await owner.delete(`/api/invites/${created.json.invitation.id}`)).status).toBe(204)
      expect((await h.client().get(`/api/invites/${tokenFrom(created.json.url)}`)).status).toBe(404)
    })

    it('cannot create owner invitations over HTTP', async () => {
      expect(
        (await owner.post('/api/invites', { role: 'owner', email: 'x@example.com' })).status,
      ).toBe(400)
    })

    it('stores mail secrets encrypted and never returns them', async () => {
      const saved = await owner.put('/api/settings/mail', {
        driver: 'aliyun-dm',
        values: {
          from: 'sso@example.com',
          region: 'cn-hangzhou',
          accessKeyId: 'LTAIexample',
          accessKeySecret: 'very-secret-value',
        },
      })
      expect(saved.status).toBe(200)
      expect(saved.json).toMatchObject({
        source: 'settings',
        driver: 'aliyun-dm',
        secrets: { accessKeySecret: true },
      })
      expect(JSON.stringify(saved.json)).not.toContain('very-secret-value')

      const [row] = await h.db
        .select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.key, 'mail'))
      expect(JSON.stringify(row!.value)).not.toContain('very-secret-value')

      // Saving again without the secret keeps it.
      const resaved = await owner.put('/api/settings/mail', {
        driver: 'aliyun-dm',
        values: { from: 'noreply@example.com', region: 'cn-hangzhou', accessKeyId: 'LTAIexample' },
      })
      expect(resaved.json.secrets.accessKeySecret).toBe(true)
      expect((await h.services.settings.resolveMail()).config).toMatchObject({
        accessKeySecret: 'very-secret-value',
        from: 'noreply@example.com',
      })

      const cleared = await owner.delete('/api/settings/mail')
      expect(cleared.json).toMatchObject({ source: 'environment', driver: 'none' })
    })
  })

  describe('member management', () => {
    let owner: ReturnType<Harness['client']>
    let moderator: ReturnType<Harness['client']>

    beforeAll(async () => {
      owner = h.client()
      await owner.signIn('owner@example.com')
      moderator = (await join(await invite('moderator', 'mod@example.com'), 'mod@example.com'))
        .client
      await join(await invite('editor', 'editor@example.com'), 'editor@example.com')
      await join(await invite('member', 'plain@example.com'), 'plain@example.com')
    })

    const idOf = async (email: string) =>
      (await h.db.select().from(schema.users).where(eq(schema.users.email, email)))[0]!.id

    it('keeps moderators away from staff', async () => {
      const editorId = await idOf('editor@example.com')
      expect(
        (await moderator.patch(`/api/members/${editorId}`, { status: 'suspended' })).status,
      ).toBe(403)
      expect((await moderator.post('/api/invites', { role: 'editor' })).status).toBe(403)
      expect((await moderator.get('/api/settings')).status).toBe(403)
    })

    it('lets the owner change roles but not take ownership away', async () => {
      const plainId = await idOf('plain@example.com')
      const promoted = await owner.patch(`/api/members/${plainId}`, { role: 'editor' })
      expect(promoted.json.role).toBe('editor')
      await owner.patch(`/api/members/${plainId}`, { role: 'member' })
      expect((await owner.patch(`/api/members/${plainId}`, { role: 'owner' })).status).toBe(400)
    })

    it('signs a suspended member out everywhere', async () => {
      const member = h.client()
      expect((await member.signIn('plain@example.com')).status).toBe(200)
      expect((await member.get('/api/me')).status).toBe(200)

      const plainId = await idOf('plain@example.com')
      expect(
        (await moderator.patch(`/api/members/${plainId}`, { status: 'suspended' })).status,
      ).toBe(200)
      expect((await member.get('/api/me')).status).toBe(401)
      const again = await h.client().signIn('plain@example.com')
      expect(again.status).toBe(403)
      expect(again.json.code).toBe('ACCOUNT_SUSPENDED')

      const audit = await h.db
        .select()
        .from(schema.auditLog)
        .where(eq(schema.auditLog.targetId, plainId))
      expect(audit.map((a) => a.action)).toContain('member.status')
    })
  })
})
