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
  const { status, adminReply } = body

  // 验证状态
  if (status && !['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
    throw createError({
      statusCode: 400,
      message: '无效的状态值',
    })
  }

  // 验证回复内容
  if (adminReply !== undefined) {
    if (typeof adminReply !== 'string') {
      throw createError({
        statusCode: 400,
        message: '回复内容必须是字符串',
      })
    }

    if (adminReply.trim().length > 2000) {
      throw createError({
        statusCode: 400,
        message: '回复内容不能超过2000字符',
      })
    }
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

  // 构建更新数据
  const updateData: any = {}
  if (status !== undefined) updateData.status = status

  // 如果提供了回复内容
  if (adminReply !== undefined && adminReply.trim()) {
    updateData.adminReply = adminReply.trim()
    updateData.repliedAt = new Date()
    updateData.repliedBy = admin.id
  }

  // 更新反馈
  const updatedFeedback = await prisma.feedback.update({
    where: { id: feedbackId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      replier: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })

  // TODO: 发送回复通知邮件给用户
  // 如果提供了管理员回复，可以发送邮件通知用户

  return {
    success: true,
    data: updatedFeedback,
  }
})
