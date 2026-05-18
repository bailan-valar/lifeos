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
      message: '用户不存在',
    })
  }

  const feedbackId = getRouterParam(event, 'id')

  if (!feedbackId) {
    throw createError({
      statusCode: 400,
      message: '反馈ID不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 验证反馈所有权
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  })

  if (!feedback) {
    throw createError({
      statusCode: 404,
      message: '反馈不存在',
    })
  }

  if (feedback.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: '无权访问此反馈',
    })
  }

  // 获取回复列表
  const replies = await prisma.feedbackReply.findMany({
    where: { feedbackId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return {
    success: true,
    data: replies,
  }
})
