import { getUserFromToken } from '~/server/utils/auth'

const FEEDBACK_CATEGORIES = ['bug', 'feature', 'ui', 'performance', 'other'] as const
const MAX_CONTENT_LENGTH = 2000

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

  const body = await readBody(event)
  const { content, category, rating } = body

  if (!content || typeof content !== 'string') {
    throw createError({
      statusCode: 400,
      message: '反馈内容不能为空',
    })
  }

  if (content.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: '反馈内容不能为空',
    })
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `反馈内容不能超过 ${MAX_CONTENT_LENGTH} 字符`,
    })
  }

  if (category && !FEEDBACK_CATEGORIES.includes(category)) {
    throw createError({
      statusCode: 400,
      message: '无效的反馈分类',
    })
  }

  if (rating != null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    throw createError({
      statusCode: 400,
      message: '评分必须是 1-5 之间的整数',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  const feedback = await prisma.feedback.create({
    data: {
      userId: user.id,
      content: content.trim(),
      category: category || 'other',
      rating: rating || null,
    },
  })

  return {
    success: true,
    data: {
      id: feedback.id,
      content: feedback.content,
      category: feedback.category,
      rating: feedback.rating,
      createdAt: feedback.createdAt,
    },
  }
})
