import jwt from 'jsonwebtoken'
import type { User } from '@prisma/client'

export interface JWTPayload {
  userId: string
  email: string
  role?: string
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, process.env.JWT_SECRET || '', {
    expiresIn: '7d',
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || '') as JWTPayload
  } catch {
    return null
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  // 首先尝试 JWT token
  const jwtPayload = verifyToken(token)
  if (jwtPayload) {
    const { prisma } = await import('./db')
    return prisma.user.findUnique({
      where: { id: jwtPayload.userId },
    })
  }

  // 尝试 API Token
  const { prisma } = await import('./db')
  const apiToken = await prisma.apiToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!apiToken) {
    return null
  }

  // 检查是否过期
  if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
    return null
  }

  // 更新最后使用时间
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  })

  return apiToken.user
}

export async function requireAdmin(token: string): Promise<User> {
  const user = await getUserFromToken(token)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: '未登录',
    })
  }
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: '需要管理员权限',
    })
  }
  return user
}
