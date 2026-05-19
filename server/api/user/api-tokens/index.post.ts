import { getUserFromToken } from '~/server/utils/auth'
import crypto from 'crypto'

// 生成随机 token
function generateApiToken(): string {
  return `lifeos_${crypto.randomBytes(32).toString('base64url')}`
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
  const user = await getUserFromToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '登录已过期，请重新登录',
    })
  }

  const body = await readBody(event)
  const { name, expiresAt } = body

  if (!name || typeof name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Token 名称不能为空',
    })
  }

  if (name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Token 名称不能为空',
    })
  }

  if (name.length > 50) {
    throw createError({
      statusCode: 400,
      message: 'Token 名称不能超过 50 字符',
    })
  }

  // 验证过期时间
  let expiryDate: Date | null = null
  if (expiresAt) {
    expiryDate = new Date(expiresAt)
    if (isNaN(expiryDate.getTime())) {
      throw createError({
        statusCode: 400,
        message: '无效的过期时间',
      })
    }
    if (expiryDate <= new Date()) {
      throw createError({
        statusCode: 400,
        message: '过期时间必须在未来',
      })
    }
  }

  const { prisma } = await import('~/server/utils/db')

  // 检查用户 token 数量限制（最多 10 个）
  const tokenCount = await prisma.apiToken.count({
    where: { userId: user.id },
  })

  if (tokenCount >= 10) {
    throw createError({
      statusCode: 400,
      message: '最多只能创建 10 个 API Token',
    })
  }

  const apiToken = await prisma.apiToken.create({
    data: {
      userId: user.id,
      name: name.trim(),
      token: generateApiToken(),
      expiresAt: expiryDate,
    },
    select: {
      id: true,
      name: true,
      token: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return {
    success: true,
    data: apiToken,
  }
})
