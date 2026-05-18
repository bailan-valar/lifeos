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

  const feedbackId = getRouterParam(event, 'id')

  if (!feedbackId) {
    throw createError({
      statusCode: 400,
      message: '反馈ID不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查反馈是否存在
  const existingFeedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  })

  if (!existingFeedback) {
    throw createError({
      statusCode: 404,
      message: '反馈不存在',
    })
  }

  // 删除反馈
  await prisma.feedback.delete({
    where: { id: feedbackId },
  })

  return {
    success: true,
    message: '反馈已删除',
  }
})
