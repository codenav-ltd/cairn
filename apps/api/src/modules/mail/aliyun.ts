import { createHmac, randomUUID } from 'node:crypto'

/** RFC 3986 encoding as Aliyun's RPC signature requires. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** Signature version 1.0 (HMAC-SHA1) for Aliyun RPC-style APIs. */
export function signRpc(method: 'GET' | 'POST', params: Record<string, string>, secret: string) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k]!)}`)
    .join('&')
  const stringToSign = `${method}&${percentEncode('/')}&${percentEncode(canonical)}`
  return createHmac('sha1', `${secret}&`).update(stringToSign).digest('base64')
}

export function directMailEndpoint(region: string) {
  return region === 'cn-hangzhou'
    ? 'https://dm.aliyuncs.com/'
    : `https://dm.${region}.aliyuncs.com/`
}

export interface DirectMailMessage {
  accountName: string
  fromAlias?: string
  replyTo?: string
  to: string
  subject: string
  html: string
  text: string
}

export async function sendDirectMail(
  credentials: { region: string; accessKeyId: string; accessKeySecret: string },
  message: DirectMailMessage,
) {
  const params: Record<string, string> = {
    Format: 'JSON',
    Version: '2015-11-23',
    AccessKeyId: credentials.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    RegionId: credentials.region,
    Action: 'SingleSendMail',
    AccountName: message.accountName,
    AddressType: '1',
    ReplyToAddress: 'false',
    ToAddress: message.to,
    Subject: message.subject,
    HtmlBody: message.html,
    TextBody: message.text,
  }
  if (message.fromAlias) params.FromAlias = message.fromAlias
  if (message.replyTo) params.ReplyAddress = message.replyTo
  params.Signature = signRpc('POST', params, credentials.accessKeySecret)

  const response = await fetch(directMailEndpoint(credentials.region), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      Code?: string
      Message?: string
    } | null
    throw new Error(
      `DirectMail ${response.status}: ${body?.Code ?? 'unknown'}${body?.Message ? ` — ${body.Message}` : ''}`,
    )
  }
}
