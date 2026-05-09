export type FabAction = () => void | Promise<void>

export interface FabContext {
  key: string
  label: string
  icon: string
}

export function useGlobalFab() {
  const _fabActions = useState<Record<string, FabAction>>('global-fab-actions', () => ({}))
  const route = useRoute()

  const register = (key: string, action: FabAction) => {
    _fabActions.value[key] = action
  }

  const getCurrentAction = (): FabAction | undefined => {
    const path = route.path
    if (path.startsWith('/billing/categories/')) return _fabActions.value['billing-category']
    if (path.startsWith('/billing/accounts/')) return _fabActions.value['billing-account']
    if (path.startsWith('/billing')) return _fabActions.value['billing']
    if (path.startsWith('/notes')) return _fabActions.value['notes']
    if (path === '/todo') return _fabActions.value['todo']
    return undefined
  }

  const getCurrentContext = (): FabContext | null => {
    const path = route.path
    if (path.startsWith('/billing/categories/')) {
      return { key: 'billing-category', label: '记一笔', icon: 'solar:wallet-money-linear' }
    }
    if (path.startsWith('/billing/accounts/')) {
      return { key: 'billing-account', label: '记一笔', icon: 'solar:wallet-money-linear' }
    }
    if (path.startsWith('/billing')) {
      return { key: 'billing', label: '记一笔', icon: 'solar:wallet-money-linear' }
    }
    if (path.startsWith('/notes')) {
      return { key: 'notes', label: '新建笔记', icon: 'solar:document-add-linear' }
    }
    if (path === '/todo') {
      return { key: 'todo', label: '添加目标', icon: 'solar:flag-linear' }
    }
    return null
  }

  const isBillingRoute = computed(() => {
    const path = route.path
    return path.startsWith('/billing')
  })

  const trigger = (key: string) => {
    _fabActions.value[key]?.()
  }

  return {
    register,
    getCurrentAction,
    getCurrentContext,
    isBillingRoute,
    trigger,
    actions: _fabActions,
  }
}
