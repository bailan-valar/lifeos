/**
 * 管理员前端路由中间件
 *
 * 保护所有 /__admin 路由，确保只有管理员用户可以访问
 */

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // 检查用户是否登录
  if (!authStore.user) {
    return navigateTo('/login')
  }

  // 检查用户是否为管理员
  if (authStore.user.role !== 'admin') {
    // 非管理员用户，返回首页或显示无权限页面
    return navigateTo('/')
  }
})
