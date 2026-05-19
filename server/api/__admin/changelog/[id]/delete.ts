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

  const { prisma } = await import('~/server/utils/db')

  await prisma.changelog.delete({
    where: { id }
  })

  return {
    success: true,
    message: '删除成功'
  }
})
