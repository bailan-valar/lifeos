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

  const body = await readBody(event)

  // 验证必填字段
  if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: '用户ID列表不能为空',
    })
  }

  if (!body.action) {
    throw createError({
      statusCode: 400,
      message: '操作类型不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 验证所有用户ID是否存在
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: body.userIds,
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  if (users.length !== body.userIds.length) {
    throw createError({
      statusCode: 400,
      message: '部分用户不存在',
    })
  }

  // 批量修改角色
  if (body.action === 'updateRole') {
    if (!body.role || !['user', 'admin'].includes(body.role)) {
      throw createError({
        statusCode: 400,
        message: '角色必须是 user 或 admin',
      })
    }

    // 检查是否包含当前管理员
    const includesSelf = users.some(u => u.id === admin.userId)
    if (includesSelf && body.role !== 'admin') {
      throw createError({
        statusCode: 400,
        message: '不能修改自己的管理员角色',
      })
    }

    await prisma.user.updateMany({
      where: {
        id: {
          in: body.userIds,
        },
      },
      data: {
        role: body.role,
      },
    })

    return {
      success: true,
      message: `已将 ${users.length} 个用户的角色修改为 ${body.role === 'admin' ? '管理员' : '普通用户'}`,
    }
  }

  // 批量删除
  if (body.action === 'delete') {
    // 检查是否包含当前管理员
    const includesSelf = users.some(u => u.id === admin.userId)
    if (includesSelf) {
      throw createError({
        statusCode: 400,
        message: '不能删除自己',
      })
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: body.userIds,
        },
      },
    })

    return {
      success: true,
      message: `已删除 ${users.length} 个用户`,
    }
  }

  throw createError({
    statusCode: 400,
    message: '不支持的操作类型',
  })
})
