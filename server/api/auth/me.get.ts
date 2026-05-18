import { getUserFromToken } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authorization = getHeader(event, 'authorization')

  if (!authorization) {
    throw createError({
      statusCode: 401,
      message: 'Authorization header required',
    })
  }

  const token = authorization.replace('Bearer ', '')
  const user = await getUserFromToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    })
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
})
