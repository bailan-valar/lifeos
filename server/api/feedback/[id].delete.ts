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

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '反馈 ID 不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 验证反馈属于当前用户
  const feedback = await prisma.feedback.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })

  if (!feedback) {
    throw createError({
      statusCode: 404,
      message: '反馈不存在或无权删除',
    })
  }

  await prisma.feedback.delete({
    where: { id },
  })

  return {
    success: true,
    message: '删除成功',
  }
})
