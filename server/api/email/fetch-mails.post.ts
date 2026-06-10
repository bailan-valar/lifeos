import Imap from 'node-imap'
import type { Email, EmailAttachment } from '~/types/email'
import { simpleParser, ParsedMail } from 'mailparser'

interface FetchMailsBody {
  configId: string
  password: string
  limit?: number
  days?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as FetchMailsBody

  const { configId, password, limit = 20, days = 30 } = body

  if (!configId || !password) {
    throw createError({
      statusCode: 400,
      message: '缺少必要参数'
    })
  }

  // TODO: 从数据库获取配置
  // 目前返回模拟数据，后续集成数据库
  const mockEmails: Email[] = [
    {
      id: '1',
      from: '招商银行',
      fromAddress: 'noreply@cmbchina.com',
      subject: '您的信用卡账单已出',
      date: new Date().toISOString(),
      attachments: [
        { filename: '信用卡账单.pdf', contentType: 'application/pdf', size: 12345 }
      ],
      hasAttachment: true
    },
    {
      id: '2',
      from: '支付宝',
      fromAddress: 'service@alipay.com',
      subject: '支付宝账单通知',
      date: new Date(Date.now() - 86400000).toISOString(),
      attachments: [
        { filename: '支付宝账单.csv', contentType: 'text/csv', size: 5678 }
      ],
      hasAttachment: true
    }
  ]

  return {
    success: true,
    emails: mockEmails
  }
})

/**
 * 实际实现（需要从数据库获取配置后启用）
 */
async function fetchMailsFromImap(
  host: string,
  port: number,
  username: string,
  password: string,
  tls: boolean,
  limit: number,
  days: number
): Promise<Email[]> {
  const emails: Email[] = []

  const searchCriteria = [
    ['SINCE', new Date(Date.now() - days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
    'UNSEEN'
  ]

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      host,
      port,
      user: username,
      password,
      tls,
      connTimeout: 15000,
      authTimeout: 5000
    })

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end()
            return reject(err)
          }

          if (!results || results.length === 0) {
            imap.end()
            return resolve([])
          }

          const fetch = imap.fetch(results.slice(0, limit), {
            bodies: '',
            struct: true
          })

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) return

                const attachments: EmailAttachment[] = []
                let hasAttachment = false

                if (parsed.attachments) {
                  hasAttachment = true
                  for (const att of parsed.attachments) {
                    attachments.push({
                      filename: att.filename || 'unknown',
                      contentType: att.contentType,
                      size: att.size || 0
                    })
                  }
                }

                emails.push({
                  id: parsed.messageId || Date.now().toString(),
                  from: parsed.from?.text || '',
                  fromAddress: parsed.from?.value[0]?.address || '',
                  subject: parsed.subject || '',
                  date: parsed.date?.toISOString() || new Date().toISOString(),
                  attachments,
                  hasAttachment
                })
              })
            })
          })

          fetch.once('error', (err) => {
            imap.end()
            reject(err)
          })

          fetch.once('end', () => {
            imap.end()
            resolve(emails)
          })
        })
      })
    })

    imap.once('error', (err) => {
      reject(err)
    })

    imap.connect()
  })
}
