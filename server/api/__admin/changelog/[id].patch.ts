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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: '缺少 ID',
    })
  }

  const body = await readBody(event)

  const { prisma } = await import('~/server/utils/db')

  const changelog = await prisma.changelog.update({
    where: { id },
    data: {
      ...(body.version !== undefined && { version: body.version }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.releaseDate !== undefined && { releaseDate: new Date(body.releaseDate) })
    }
  })

  return {
    success: true,
    data: {
      id: changelog.id,
      version: changelog.version,
      type: changelog.type,
      status: changelog.status,
      title: changelog.title,
      description: changelog.description,
      releaseDate: changelog.releaseDate.toISOString(),
      createdAt: changelog.createdAt.toISOString(),
      updatedAt: changelog.updatedAt.toISOString()
    }
  }
})
