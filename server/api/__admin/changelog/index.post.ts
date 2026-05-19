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

  const { prisma } = await import('~/server/utils/db')

  const changelog = await prisma.changelog.create({
    data: {
      version: body.version,
      type: body.type,
      title: body.title,
      description: body.description || '',
      releaseDate: new Date(body.releaseDate)
    }
  })

  return {
    success: true,
    data: {
      id: changelog.id,
      version: changelog.version,
      type: changelog.type,
      title: changelog.title,
      description: changelog.description,
      releaseDate: changelog.releaseDate.toISOString(),
      createdAt: changelog.createdAt.toISOString(),
      updatedAt: changelog.updatedAt.toISOString()
    }
  }
})
