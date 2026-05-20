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

  const { prisma } = await import('~/server/utils/db')

  const changelogs = await prisma.changelog.findMany({
    orderBy: [
      { releaseDate: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  return {
    success: true,
    data: changelogs.map(log => ({
      id: log.id,
      version: log.version,
      type: log.type,
      status: log.status,
      title: log.title,
      description: log.description,
      releaseDate: log.releaseDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString()
    }))
  }
})
