import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization) {
    throw createError({
      statusCode: 401,
      message: '请先登录',
    })
  }

  const token = authorization.replace('Bearer ', '')
  await requireAdmin(token)

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: '用户ID不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          feedbacks: true,
          sessions: true,
        },
      },
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在',
    })
  }

  // 获取用户的反馈列表
  const feedbacks = await prisma.feedback.findMany({
    where: { userId },
    select: {
      id: true,
      content: true,
      category: true,
      rating: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })

  return {
    success: true,
    data: {
      user: {
        ...user,
        recentFeedbacks: feedbacks,
      },
    },
  }
})
