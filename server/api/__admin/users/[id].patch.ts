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

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: '用户ID不能为空',
    })
  }

  const body = await readBody(event)
  const { name, email, role } = body

  // 验证角色
  if (role && !['admin', 'user'].includes(role)) {
    throw createError({
      statusCode: 400,
      message: '无效的角色值',
    })
  }

  // 防止管理员修改自己的角色
  if (userId === admin.id && role && role !== 'admin') {
    throw createError({
      statusCode: 400,
      message: '不能修改自己的管理员角色',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查用户是否存在
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      message: '用户不存在',
    })
  }

  // 如果修改邮箱，检查新邮箱是否已被使用
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email },
    })

    if (emailExists) {
      throw createError({
        statusCode: 400,
        message: '该邮箱已被使用',
      })
    }
  }

  // 构建更新数据
  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (email !== undefined) updateData.email = email
  if (role !== undefined) updateData.role = role

  // 更新用户
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  })

  return {
    success: true,
    data: updatedUser,
  }
})
