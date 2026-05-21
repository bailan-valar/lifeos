import type { Goal } from '~/types/goal'

function isEditingInput(): boolean {
  if (!import.meta.client) return false
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
    || (active as HTMLElement).isContentEditable
}

export function useGoalShortcut() {
  const route = useRoute()
  const goalShortcutDialogVisible = ref(false)
  const selectedGoalForShortcut = ref<Goal>()
  let shortcutRegistered = false

  // 打开快捷进度记录对话框
  function openQuickProgressDialog(goal?: Goal) {
    selectedGoalForShortcut.value = goal
    goalShortcutDialogVisible.value = true
  }

  // 处理全局快捷键 Cmd/Ctrl+G
  function handleGlobalShortcut(e: KeyboardEvent) {
    // Cmd/Ctrl + G
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      // 如果在输入框中，不拦截
      if (isEditingInput()) return

      e.preventDefault()

      // 如果不在目标页面，先导航到目标页面
      if (route.path !== '/goals') {
        navigateTo('/goals')
        return
      }

      // 在目标页面，打开快捷对话框（需要用户选择目标）
      openQuickProgressDialog()
    }
  }

  // 注册全局快捷键
  function registerShortcut() {
    if (import.meta.client && !shortcutRegistered) {
      window.addEventListener('keydown', handleGlobalShortcut)
      shortcutRegistered = true
    }
  }

  // 注销全局快捷键
  function unregisterShortcut() {
    if (import.meta.client && shortcutRegistered) {
      window.removeEventListener('keydown', handleGlobalShortcut)
      shortcutRegistered = false
    }
  }

  return {
    goalShortcutDialogVisible,
    selectedGoalForShortcut,
    openQuickProgressDialog,
    registerShortcut,
    unregisterShortcut
  }
}
