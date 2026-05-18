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

  const body = await readBody(event)
  const { content } = body

  // 验证回复内容
  if (!content || typeof content !== 'string') {
    throw createError({
      statusCode: 400,
      message: '回复内容不能为空',
    })
  }

  const trimmedContent = content.trim()

  if (!trimmedContent) {
    throw createError({
      statusCode: 400,
      message: '回复内容不能为空',
    })
  }

  if (trimmedContent.length > 2000) {
    throw createError({
      statusCode: 400,
      message: '回复内容不能超过2000字符',
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

  // 创建回复
  const reply = await prisma.feedbackReply.create({
    data: {
      feedbackId,
      userId: user.id,
      content: trimmedContent,
      isAdmin: false,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  // TODO: 发送新回复通知邮件给管理员
  // 可以在这里集成邮件服务，通知管理员有新的用户回复

  return {
    success: true,
    data: reply,
  }
})
