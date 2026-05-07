export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { isMenuNavigation, menuNavigate, pushOrPop, replaceTop, initStack } = useRouteCache()

  // 初始化：应用启动时，将当前路由设为栈底（一级）
  const currentRoute = router.currentRoute.value
  initStack(currentRoute.fullPath)

  router.beforeEach((to, from) => {
    // 忽略相同路径的重复导航（可能由 query 变化触发）
    if (to.path === from.path && to.fullPath === from.fullPath) {
      return
    }

    // 菜单根页面跳转
    if (isMenuNavigation.value) {
      // 标志位已在 menuNavigate 中触发 stack 重置，这里只需清除标志
      isMenuNavigation.value = false
      return
    }

    // 普通导航：目标在栈中则回退，不在则压栈
    pushOrPop(to)
  })
})
