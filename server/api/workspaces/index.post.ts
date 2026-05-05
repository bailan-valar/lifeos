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

  const body = await readBody(event)
  const { name, remoteUrl, remotePrefix, remoteUsername, remotePassword, localId } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw createError({
      statusCode: 400,
      message: '名称不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')
  const workspace = await prisma.workspace.create({
    data: {
      userId: user.id,
      name: name.trim(),
      remoteUrl: remoteUrl?.trim() || null,
      remotePrefix: remotePrefix?.trim() || 'lifeos-',
      remoteUsername: remoteUsername?.trim() || null,
      remotePassword: remotePassword?.length ? remotePassword : null,
      localId: localId?.trim() || undefined,
    },
  })

  return workspace
})
