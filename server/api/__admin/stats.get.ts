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

  const { prisma } = await import('~/server/utils/db')

  // 获取今天的开始时间
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 获取30天前的日期（用于统计活跃用户）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 并行查询各种统计数据
  const [
    totalUsers,
    adminUsers,
    todayUsers,
    totalFeedbacks,
    pendingFeedbacks,
    feedbacksByCategory,
    feedbacksByStatus,
    recentUsers,
    recentFeedbacks,
    activeUsers,
  ] = await Promise.all([
    // 总用户数
    prisma.user.count(),

    // 管理员用户数
    prisma.user.count({
      where: {
        role: 'admin',
      },
    }),

    // 今日新增用户
    prisma.user.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    }),

    // 总反馈数
    prisma.feedback.count(),

    // 待处理反馈数
    prisma.feedback.count({
      where: {
        status: 'pending',
      },
    }),

    // 按分类统计反馈
    prisma.feedback.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    }),

    // 按状态统计反馈
    prisma.feedback.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    }),

    // 最近注册的用户（最近10个）
    prisma.user.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),

    // 最近的反馈（最近10个）
    prisma.feedback.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
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
    }),

    // 活跃用户数（最近30天内有会话活动）
    prisma.session.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }).then(groups => groups.length),
  ])

  // 格式化分类统计
  const categoryStats = feedbacksByCategory.map(item => ({
    category: item.category,
    count: item._count.id,
  }))

  // 格式化状态统计
  const statusStats = feedbacksByStatus.map(item => ({
    status: item.status,
    count: item._count.id,
  }))

  return {
    success: true,
    data: {
      // 用户统计
      totalUsers,
      adminUsers,
      newUsersToday: todayUsers,
      activeUsers,

      // 反馈统计
      totalFeedbacks,
      pendingFeedbacks,
      categoryStats,
      statusStats,

      // 最近数据
      recent: {
        users: recentUsers,
        feedbacks: recentFeedbacks,
      },
    },
  }
})
