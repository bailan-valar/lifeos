import { getUserFromToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization) {
    throw createError({
      statusCode: 401,
      message: 'Authorization header required',
    })
  }

  const token = authorization.replace('Bearer ', '')
  const user = await getUserFromToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: '缺少工作空间 ID',
    })
  }

  const body = await readBody(event)
  const { name, remoteUrl, remotePrefix, remoteUsername, remotePassword } = body

  const { prisma } = await import('~/server/utils/db')

  const existing = await prisma.workspace.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: '工作空间不存在',
    })
  }

  const data: Record<string, any> = {}
  if (typeof name === 'string') data.name = name.trim()
  if (typeof remoteUrl === 'string') data.remoteUrl = remoteUrl.trim() || null
  if (typeof remotePrefix === 'string') data.remotePrefix = remotePrefix.trim() || 'lifeos-'
  if (typeof remoteUsername === 'string') data.remoteUsername = remoteUsername.trim() || null
  if (typeof remotePassword === 'string') data.remotePassword = remotePassword.length ? remotePassword : null

  const workspace = await prisma.workspace.update({
    where: { id },
    data,
  })

  return workspace
})
