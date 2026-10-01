import { describe, expect, it } from 'vitest'
import { directMailEndpoint, percentEncode, signRpc } from './aliyun'
import { isRecipientAllowed } from './recipients'
import { renderMail, type MailTemplate } from './templates'

describe('Aliyun RPC signature', () => {
  it('matches the worked example in the Aliyun documentation', () => {
    const params = {
      AccessKeyId: 'testid',
      Action: 'DescribeRegions',
      Format: 'XML',
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: '3ee8c1b8-83d3-44af-a94f-4e0ad82fd6cf',
      SignatureVersion: '1.0',
      Timestamp: '2016-02-23T12:46:24Z',
      Version: '2014-05-26',
    }
    expect(signRpc('GET', params, 'testsecret')).toBe('OLeaidS1JvxuMvnyHOwuJ+uX5qY=')
  })

  it('percent-encodes the characters encodeURIComponent leaves alone', () => {
    expect(percentEncode("a b*c~d!'()")).toBe('a%20b%2Ac~d%21%27%28%29')
  })

  it('picks the regional endpoint', () => {
    expect(directMailEndpoint('cn-hangzhou')).toBe('https://dm.aliyuncs.com/')
    expect(directMailEndpoint('ap-southeast-1')).toBe('https://dm.ap-southeast-1.aliyuncs.com/')
  })
})

describe('isRecipientAllowed', () => {
  it('allows everything without rules', () => {
    expect(isRecipientAllowed('anyone@example.com', [])).toBe(true)
  })

  it('matches exact addresses and domains, case-insensitively', () => {
    const rules = ['ops@example.com', '@codenav.dev']
    expect(isRecipientAllowed('Ops@Example.com', rules)).toBe(true)
    expect(isRecipientAllowed('someone@codenav.dev', rules)).toBe(true)
    expect(isRecipientAllowed('someone@example.com', rules)).toBe(false)
    expect(isRecipientAllowed('x@notcodenav.dev', rules)).toBe(false)
  })
})

describe('renderMail', () => {
  const templates: MailTemplate[] = [
    {
      kind: 'invitation',
      url: 'https://site.test/invite/abc',
      role: 'editor',
      inviterName: 'Ada <script>',
      expiresAt: '2026-10-08T12:00:00.000Z',
    },
    { kind: 'magicLink', url: 'https://site.test/m?t=1&x=2' },
    { kind: 'verifyEmail', url: 'https://site.test/v' },
    { kind: 'resetPassword', url: 'https://site.test/r' },
    { kind: 'test' },
  ]

  for (const locale of ['en', 'zh-CN'] as const) {
    for (const template of templates) {
      it(`renders ${template.kind} in ${locale}`, () => {
        const mail = renderMail(template, 'Cairn', locale)
        expect(mail.subject).toContain('Cairn')
        expect(mail.html).toContain(`lang="${locale}"`)
        if ('url' in template) {
          expect(mail.text).toContain(template.url)
          expect(mail.html).toContain(template.url.replace(/&/g, '&amp;'))
        }
        expect(mail.html).not.toContain('<script>')
      })
    }
  }

  it('uses the right article for English roles', () => {
    const mail = renderMail(
      {
        kind: 'invitation',
        url: 'u',
        role: 'editor',
        inviterName: null,
        expiresAt: '2026-01-01T00:00:00Z',
      },
      'Cairn',
      'en',
    )
    expect(mail.text).toContain('as an editor')
  })
})
