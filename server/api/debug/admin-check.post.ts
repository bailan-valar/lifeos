import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required',
    })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) {
    return {
      found: false,
      message: 'User not found',
    }
  }

  return {
    found: true,
    user,
    isAdmin: user.role === 'admin',
  }
})
