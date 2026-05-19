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

  const { prisma } = await import('~/server/utils/db')

  const apiTokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      token: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  // 隐藏完整 token，只显示前 8 位和后 4 位
  const maskedTokens = apiTokens.map((t) => ({
    ...t,
    token: `${t.token.slice(0, 8)}${'*'.repeat(20)}${t.token.slice(-4)}`,
    isExpired: t.expiresAt ? new Date(t.expiresAt) < new Date() : false,
  }))

  return {
    success: true,
    data: maskedTokens,
  }
})
