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

  await prisma.workspace.delete({
    where: { id },
  })

  return { success: true }
})
