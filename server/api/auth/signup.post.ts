import bcrypt from 'bcryptjs'
import { prisma } from '~/server/utils/db'
import { generateToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password, name } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'User already exists',
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || null,
    },
  })

  const token = generateToken(user)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  }
})
