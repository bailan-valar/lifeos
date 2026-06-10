import Imap from 'node-imap'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { host, port, username, password, tls = true } = body

  if (!host || !port || !username || !password) {
    throw createError({
      statusCode: 400,
      message: '缺少必要参数'
    })
  }

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      host,
      port,
      user: username,
      password,
      tls,
      connTimeout: 10000,
      authTimeout: 5000
    })

    imap.once('ready', () => {
      imap.end()
      resolve({ success: true })
    })

    imap.once('error', (err: Error) => {
      reject(createError({
        statusCode: 401,
        message: err.message || '连接失败'
      }))
    })

    imap.connect()
  })
})
