import { describe, expect, it } from 'vitest'
import { createSecretBox, randomToken, sha256 } from './crypto'

describe('createSecretBox', () => {
  const box = createSecretBox('x'.repeat(32), 'test')

  it('round-trips', () => {
    const sealed = box.seal('hunter2 · 密码')
    expect(sealed).toMatch(/^v1\./)
    expect(sealed).not.toContain('hunter2')
    expect(box.open(sealed)).toBe('hunter2 · 密码')
  })

  it('uses a fresh IV each time', () => {
    expect(box.seal('same')).not.toBe(box.seal('same'))
  })

  it('rejects tampering', () => {
    const sealed = box.seal('value')
    const tampered = sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA')
    expect(() => box.open(tampered)).toThrow()
  })

  it('keys differ by secret and by purpose', () => {
    const sealed = box.seal('value')
    expect(() => createSecretBox('y'.repeat(32), 'test').open(sealed)).toThrow()
    expect(() => createSecretBox('x'.repeat(32), 'other').open(sealed)).toThrow()
  })
})

describe('tokens', () => {
  it('are url-safe and long enough', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('hash deterministically', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
