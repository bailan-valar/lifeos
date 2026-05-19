export default defineEventHandler(async (event) => {
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
      title: log.title,
      description: log.description,
      releaseDate: log.releaseDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString()
    }))
  }
})
