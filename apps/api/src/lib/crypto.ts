import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'

export interface SecretBox {
  seal(plaintext: string): string
  open(sealed: string): string
}

/**
 * AES-256-GCM under a key derived from CAIRN_SECRET. `purpose` separates keys
 * for unrelated uses of the same secret. Output: `v1.<iv>.<ciphertext+tag>`.
 */
export function createSecretBox(secret: string, purpose: string): SecretBox {
  const key = Buffer.from(hkdfSync('sha256', secret, 'cairn', purpose, 32))

  return {
    seal(plaintext) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const body = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
        cipher.getAuthTag(),
      ])
      return `v1.${iv.toString('base64url')}.${body.toString('base64url')}`
    },
    open(sealed) {
      const [version, iv, body] = sealed.split('.')
      if (version !== 'v1' || !iv || !body) throw new Error('Unrecognised sealed value')
      const data = Buffer.from(body, 'base64url')
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
      decipher.setAuthTag(data.subarray(-16))
      return Buffer.concat([decipher.update(data.subarray(0, -16)), decipher.final()]).toString(
        'utf8',
      )
    },
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
