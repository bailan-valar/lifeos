/**
 * 管理员 API 权限中间件
 *
 * 拦截所有以 /api/__admin 开头的请求，验证用户是否具有管理员权限
 */

export default defineEventHandler(async (event) => {
  const url = event.node.req.url

  // 检查是否为管理员 API 路径
  if (url?.startsWith('/api/__admin')) {
    try {
      const authorization = getHeader(event, 'authorization')

      if (!authorization) {
        throw createError({
          statusCode: 401,
          message: '请先登录',
        })
      }

      const token = authorization.replace('Bearer ', '')

      // 导入并使用 requireAdmin 函数
      const { requireAdmin } = await import('~/server/utils/auth')
      await requireAdmin(token)
    } catch (error: any) {
      // 如果是已经抛出的错误，直接抛出
      if (error.statusCode) {
        throw error
      }

      // 其他错误统一处理
      throw createError({
        statusCode: 401,
        message: '认证失败',
      })
    }
  }
})
