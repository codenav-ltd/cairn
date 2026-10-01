import type { MailConfig } from '@cairnhq/contracts'
import nodemailer from 'nodemailer'
import { sendDirectMail } from './aliyun'

export interface OutgoingMail {
  to: string
  subject: string
  html: string
  text: string
}

export interface MailDriver {
  send(message: OutgoingMail): Promise<void>
}

export function createDriver(config: MailConfig, siteTitle: string): MailDriver | null {
  switch (config.driver) {
    case 'none':
      return null

    case 'log':
      return {
        async send(message) {
          console.log(
            `[mail] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`,
          )
        },
      }

    case 'smtp': {
      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.username ? { user: config.username, pass: config.password ?? '' } : undefined,
      })
      const from = { name: config.fromName ?? siteTitle, address: config.from }
      return {
        async send(message) {
          await transport.sendMail({ from, replyTo: config.replyTo, ...message })
        },
      }
    }

    case 'aliyun-dm':
      return {
        async send(message) {
          await sendDirectMail(config, {
            accountName: config.from,
            fromAlias: config.fromName ?? siteTitle,
            replyTo: config.replyTo,
            ...message,
          })
        },
      }
  }
}
