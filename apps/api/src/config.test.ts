import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

const base = {
  CAIRN_PUBLIC_URL: 'http://localhost:3000',
  CAIRN_SECRET: 'dev',
  DATABASE_URL: 'postgres://cairn:cairn@localhost:5432/cairn',
}

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig(base)
    expect(config.env).toBe('development')
    expect([...config.roles]).toEqual(['api', 'worker'])
    expect(config.autoMigrate).toBe(true)
    expect(config.port).toBe(4000)
  })

  it('parses a single role', () => {
    expect([...loadConfig({ ...base, CAIRN_ROLES: 'worker' }).roles]).toEqual(['worker'])
  })

  it('rejects unknown roles', () => {
    expect(() => loadConfig({ ...base, CAIRN_ROLES: 'api,cron' })).toThrow(/CAIRN_ROLES/)
  })

  it('requires a long secret outside development', () => {
    expect(() => loadConfig({ ...base, CAIRN_ENV: 'staging' })).toThrow(/CAIRN_SECRET/)
    expect(() =>
      loadConfig({ ...base, CAIRN_ENV: 'production', CAIRN_SECRET: 'x'.repeat(32) }),
    ).not.toThrow()
  })

  it('parses the auto-migrate flag', () => {
    expect(loadConfig({ ...base, CAIRN_AUTO_MIGRATE: 'false' }).autoMigrate).toBe(false)
  })

  it('treats blank mail variables as unset', () => {
    const blank = { CAIRN_MAIL_FROM: '', CAIRN_MAIL_FROM_NAME: ' ', CAIRN_MAIL_REPLY_TO: '' }
    expect(loadConfig({ ...base, ...blank }).mail).toEqual({ driver: 'none' })
    expect(loadConfig({ ...base, ...blank, CAIRN_MAIL_DRIVER: 'log' }).mail).toMatchObject({
      driver: 'log',
      from: 'cairn@localhost.invalid',
    })
  })
})
