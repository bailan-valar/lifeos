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

  const replyId = getRouterParam(event, 'replyId')

  if (!replyId) {
    throw createError({
      statusCode: 400,
      message: '回复ID不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查回复是否存在
  const existingReply = await prisma.feedbackReply.findUnique({
    where: { id: replyId },
  })

  if (!existingReply) {
    throw createError({
      statusCode: 404,
      message: '回复不存在',
    })
  }

  // 删除回复
  await prisma.feedbackReply.delete({
    where: { id: replyId },
  })

  return {
    success: true,
    message: '回复已删除',
  }
})
