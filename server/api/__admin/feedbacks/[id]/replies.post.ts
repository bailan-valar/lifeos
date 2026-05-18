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
  const admin = await requireAdmin(token)

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

  // 检查反馈是否存在
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
  })

  if (!feedback) {
    throw createError({
      statusCode: 404,
      message: '反馈不存在',
    })
  }

  // 创建回复
  const reply = await prisma.feedbackReply.create({
    data: {
      feedbackId,
      userId: admin.id,
      content: trimmedContent,
      isAdmin: true,
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

  // TODO: 发送回复通知邮件给用户
  // 可以在这里集成邮件服务，通知用户有新的管理员回复

  return {
    success: true,
    data: reply,
  }
})
