import Imap from 'node-imap'

interface DownloadAttachmentBody {
  configId: string
  password: string
  emailId: string
  attachmentIndex: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as DownloadAttachmentBody

  const { configId, password, emailId, attachmentIndex } = body

  if (!configId || !password || !emailId || attachmentIndex === undefined) {
    throw createError({
      statusCode: 400,
      message: '缺少必要参数'
    })
  }

  // TODO: 从数据库获取配置并下载附件
  // 目前返回模拟数据，后续集成数据库
  throw createError({
    statusCode: 501,
    message: '功能开发中，需要先实现配置存储'
  })
})

/**
 * 实际实现（需要从数据库获取配置后启用）
 */
async function downloadAttachmentFromImap(
  host: string,
  port: number,
  username: string,
  password: string,
  tls: boolean,
  emailId: string,
  attachmentIndex: number
): Promise<{ filename: string; contentType: string; data: string }> {
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
      imap.search([['HEADER', 'MESSAGE-ID', emailId]], (err, results) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        if (!results || results.length === 0) {
          imap.end()
          return reject(new Error('邮件不存在'))
        }

        const fetch = imap.fetch(results, {
          bodies: '',
          struct: true
        })

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            // TODO: 使用 mailparser 解析并获取指定附件
            // 需要安装 mailparser: npm install mailparser
            imap.end()
            reject(new Error('需要安装 mailparser 库'))
          })
        })

        fetch.once('error', (err) => {
          imap.end()
          reject(err)
        })

        fetch.once('end', () => {
          imap.end()
        })
      })
    })

    imap.once('error', reject)
    imap.connect()
  })
}
