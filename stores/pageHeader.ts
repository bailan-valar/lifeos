import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface HeaderAction {
  icon: string
  label: string
  handler: () => void
}

export const usePageHeaderStore = defineStore('pageHeader', () => {
  const actionsMap = ref<Map<string, HeaderAction[]>>(new Map())
  const activeModule = ref<string>('')
  const moreMenuOpen = ref(false)

  const actions = computed(() => actionsMap.value.get(activeModule.value) || [])

  function setActions(moduleKey: string, newActions: HeaderAction[]) {
    actionsMap.value.set(moduleKey, newActions)
    activeModule.value = moduleKey
  }

  function clearActions(moduleKey?: string) {
    if (moduleKey) {
      actionsMap.value.delete(moduleKey)
      if (activeModule.value === moduleKey) {
        activeModule.value = ''
      }
    } else {
      actionsMap.value.clear()
      activeModule.value = ''
    }
    moreMenuOpen.value = false
  }

  function toggleMoreMenu() {
    moreMenuOpen.value = !moreMenuOpen.value
  }

  function closeMoreMenu() {
    moreMenuOpen.value = false
  }

  return {
    actions,
    moreMenuOpen,
    activeModule,
    setActions,
    clearActions,
    toggleMoreMenu,
    closeMoreMenu
  }
})
