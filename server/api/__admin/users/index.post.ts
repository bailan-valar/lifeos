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

  const body = await readBody(event)

  // 验证必填字段
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: '邮箱和密码不能为空',
    })
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: '邮箱格式不正确',
    })
  }

  // 验证密码长度
  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: '密码长度至少为6位',
    })
  }

  // 验证角色
  if (body.role && !['user', 'admin'].includes(body.role)) {
    throw createError({
      statusCode: 400,
      message: '角色必须是 user 或 admin',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查邮箱是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  })

  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: '该邮箱已被注册',
    })
  }

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: body.password,
      name: body.name || null,
      role: body.role || 'user',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return {
    success: true,
    data: { user },
  }
})
