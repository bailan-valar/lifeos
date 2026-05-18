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

  // 更新回复
  const updatedReply = await prisma.feedbackReply.update({
    where: { id: replyId },
    data: {
      content: trimmedContent,
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

  return {
    success: true,
    data: updatedReply,
  }
})
