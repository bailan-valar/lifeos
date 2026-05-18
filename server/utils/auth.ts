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
  const payload = verifyToken(token)
  if (!payload) return null

  const { prisma } = await import('./db')
  return prisma.user.findUnique({
    where: { id: payload.userId },
  })
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
