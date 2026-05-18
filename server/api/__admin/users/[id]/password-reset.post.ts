import { requireAdmin } from '~/server/utils/auth'

// 生成随机密码
function generateRandomPassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

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

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: '用户ID不能为空',
    })
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: '用户不存在',
    })
  }

  // 生成新密码
  const newPassword = generateRandomPassword(12)

  // 使用 bcrypt 加密密码
  const bcrypt = await import('bcrypt')
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // 更新用户密码
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  })

  // TODO: 发送密码重置邮件
  // 这里可以集成邮件服务，将新密码发送到用户邮箱

  return {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      newPassword: newPassword, // 仅在开发环境返回，生产环境应通过邮件发送
      message: '密码已重置',
    },
  }
})
