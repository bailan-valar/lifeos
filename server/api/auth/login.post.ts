import bcrypt from 'bcryptjs'
import { prisma } from '~/server/utils/db'
import { generateToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  const isValidPassword = await bcrypt.compare(password, user.password)

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  const token = generateToken(user)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  }
})
