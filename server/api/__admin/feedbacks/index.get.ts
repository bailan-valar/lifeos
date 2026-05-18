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

  // 获取查询参数
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const status = query.status as string || ''
  const category = query.category as string || ''
  const search = query.search as string || ''

  const skip = (page - 1) * limit

  // 构建查询条件
  const where: any = {}

  if (status && ['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
    where.status = status
  }

  if (category && ['bug', 'feature', 'ui', 'performance', 'other'].includes(category)) {
    where.category = category
  }

  if (search) {
    where.OR = [
      { content: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const { prisma } = await import('~/server/utils/db')

  // 查询反馈列表和总数
  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        repliers: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.feedback.count({ where }),
  ])

  return {
    success: true,
    data: {
      feedbacks: feedbacks.map((f: any) => ({
        ...f,
        adminReply: f.reply,
        replier: f.repliers?.[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  }
})
