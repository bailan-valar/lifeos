export default defineEventHandler(async (event) => {
  const { prisma } = await import('~/server/utils/db')

  const latest = await prisma.changelog.findFirst({
    orderBy: [
      { releaseDate: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      version: true
    }
  })

  return {
    success: true,
    version: latest?.version || ''
  }
})
