import { getUserFromToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization) {
    throw createError({
      statusCode: 401,
      message: '请先登录',
    })
  }

  const token = authorization.replace('Bearer ', '')
  const user = await getUserFromToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '登录已过期，请重新登录',
    })
  }

  const tokenId = getRouterParam(event, 'id')

  if (!tokenId) {
    throw createError({
      statusCode: 400,
      message: 'Token ID 不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 验证 token 属于当前用户
  const apiToken = await prisma.apiToken.findFirst({
    where: {
      id: tokenId,
      userId: user.id,
    },
  })

  if (!apiToken) {
    throw createError({
      statusCode: 404,
      message: 'Token 不存在或无权删除',
    })
  }

  await prisma.apiToken.delete({
    where: { id: tokenId },
  })

  return {
    success: true,
    message: 'Token 已删除',
  }
})
