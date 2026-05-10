import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface HeaderAction {
  icon: string
  label: string
  handler: () => void
}

export const usePageHeaderStore = defineStore('pageHeader', () => {
  const actions = ref<HeaderAction[]>([])
  const moreMenuOpen = ref(false)

  function setActions(newActions: HeaderAction[]) {
    actions.value = newActions
  }

  function clearActions() {
    actions.value = []
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
    setActions,
    clearActions,
    toggleMoreMenu,
    closeMoreMenu
  }
})
