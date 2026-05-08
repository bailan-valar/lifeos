import type { RouteLocationNormalized } from 'vue-router'

interface StackItem {
  fullPath: string
  path: string
}

const stack = ref<StackItem[]>([])
const isMenuNavigation = ref(false)

export function useRouteCache() {
  const route = useRoute()

  const currentLevel = computed(() => stack.value.length)

  const cacheKey = computed(() => {
    const level = currentLevel.value || 1
    return `${route.path}@L${level}`
  })

  /**
   * 菜单根页面跳转：重置栈，目标页面设为一级
   */
  function menuNavigate(toPath: string) {
    isMenuNavigation.value = true
    stack.value = [{ fullPath: toPath, path: toPath }]
    navigateTo(toPath)
  }

  /**
   * 根据目标路由调整栈：
   * - 目标已在栈中 → 回退到该层级
   * - 目标不在栈中 → 压栈
   */
  function pushOrPop(to: RouteLocationNormalized) {
    const index = stack.value.findIndex(item => item.path === to.path)
    if (index > -1) {
      // 回退：截取栈到目标位置
      stack.value = stack.value.slice(0, index + 1)
    } else {
      // 前进：压栈
      stack.value.push({ fullPath: to.fullPath, path: to.path })
    }
  }

  /**
   * 替换栈顶（用于 replace 导航）
   */
  function replaceTop(to: RouteLocationNormalized) {
    if (stack.value.length > 0) {
      stack.value[stack.value.length - 1] = { fullPath: to.fullPath, path: to.path }
    } else {
      stack.value.push({ fullPath: to.fullPath, path: to.path })
    }
  }

  /**
   * 初始化栈：浏览器直接访问或刷新时，当前页面为一级
   */
  function initStack(currentPath: string) {
    if (stack.value.length === 0) {
      stack.value = [{ fullPath: currentPath, path: currentPath }]
    }
  }

  /**
   * 重置栈（工作空间切换时调用）
   */
  function resetStack() {
    stack.value = []
  }

  return {
    stack: readonly(stack),
    currentLevel,
    cacheKey,
    isMenuNavigation,
    menuNavigate,
    pushOrPop,
    replaceTop,
    initStack,
    resetStack,
  }
}
