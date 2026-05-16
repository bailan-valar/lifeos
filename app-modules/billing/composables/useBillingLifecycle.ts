import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export interface UseBillingLifecycleOptions {
  openBillDialog: () => void
  activeTab: Ref<string>
  billDialogVisible: Ref<boolean>
}

export function useBillingLifecycle(options: UseBillingLifecycleOptions) {
  const savedViewMode = ref<'card' | 'table' | null>(null)
  const savedSidebarCollapsed = ref(false)

  function onGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      if (options.activeTab.value === 'bills' && !options.billDialogVisible.value) {
        options.openBillDialog()
      }
    }
  }

  onMounted(() => {
    const vm = localStorage.getItem('lifeos:bill-view-mode')
    if (vm === 'card' || vm === 'table') savedViewMode.value = vm
    const sc = localStorage.getItem('lifeos:billing-sidebar-collapsed')
    if (sc === '1') savedSidebarCollapsed.value = true

    window.addEventListener('keydown', onGlobalKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onGlobalKeydown)
  })

  return {
    savedViewMode,
    savedSidebarCollapsed
  }
}
