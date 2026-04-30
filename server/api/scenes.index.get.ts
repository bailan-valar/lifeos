import { getUserFromToken } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'

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

  const scenes = await prisma.scene.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      order: 'asc',
    },
    include: {
      _count: {
        select: {
          projects: true,
        },
      },
    },
  })

  return scenes
})
