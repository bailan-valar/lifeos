import { ref, computed } from 'vue'

type TabId = 'bills' | 'accounts' | 'categories' | 'budgets' | 'rules'
type ViewMode = 'card' | 'table' | 'calendar'
type AccountType = 'personal' | 'contact' | 'merchant' | 'other'
type CategoryType = 'income' | 'expense'

export function useBillingNavigation() {
  // 状态
  const activeTab = ref<TabId>('bills')
  const viewMode = ref<ViewMode>('card')
  const sidebarCollapsed = ref(false)

  const activeAccountSubTab = ref<AccountType>('personal')
  const accountsMenuExpanded = ref(true)

  const activeCategorySubTab = ref<CategoryType | 'all'>('expense')
  const categoryMenuExpanded = ref(true)

  // 常量数据
  const tabs = [
    { id: 'bills' as TabId, name: '账单', icon: 'solar:wallet-money-linear' },
    { id: 'accounts' as TabId, name: '账户', icon: 'solar:wallet-linear' },
    { id: 'categories' as TabId, name: '分类', icon: 'solar:folder-linear' },
    { id: 'budgets' as TabId, name: '预算', icon: 'solar:chart-2-linear' },
    { id: 'rules' as TabId, name: '规则', icon: 'solar:filter-linear' }
  ]

  const mobileTabs = [
    { id: 'bills' as TabId, name: '账单', icon: 'solar:wallet-money-linear' },
    { id: 'accounts' as TabId, name: '账户', icon: 'solar:wallet-linear' },
    { id: 'budgets' as TabId, name: '预算', icon: 'solar:chart-2-linear' },
    { id: 'categories' as TabId, name: '分类', icon: 'solar:folder-linear' }
  ]

  const accountSubTabs = [
    { type: 'personal' as AccountType, label: '个人账户' },
    { type: 'contact' as AccountType, label: '人员/组织' },
    { type: 'merchant' as AccountType, label: '商户' },
    { type: 'other' as AccountType, label: '其他' }
  ]

  const categorySubTabs = [
    { type: 'income' as CategoryType, label: '收入' },
    { type: 'expense' as CategoryType, label: '支出' }
  ]

  // 计算属性
  const accountSubTabTitle = computed(() => {
    const map: Record<string, string> = {
      personal: '个人账户',
      contact: '人员/组织',
      merchant: '商户'
    }
    return map[activeAccountSubTab.value] || '账户管理'
  })

  const categorySubTabTitle = computed(() => {
    const map: Record<string, string> = {
      all: '分类管理',
      income: '收入分类',
      expense: '支出分类'
    }
    return map[activeCategorySubTab.value] || '分类管理'
  })

  const accountSubTabOptions = computed(() => accountSubTabs.map(s => ({ value: s.type, label: s.label })))
  const categorySubTabOptions = computed(() => categorySubTabs.map(s => ({ value: s.type, label: s.label })))

  // 操作
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    const SIDEBAR_COLLAPSED_KEY = 'lifeos:billing-sidebar-collapsed'
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  }

  const onAccountsTabClick = () => {
    if (activeTab.value === 'accounts') {
      accountsMenuExpanded.value = !accountsMenuExpanded.value
    } else {
      activeTab.value = 'accounts'
      accountsMenuExpanded.value = true
    }
  }

  const onCategoriesTabClick = () => {
    if (activeTab.value === 'categories') {
      categoryMenuExpanded.value = !categoryMenuExpanded.value
    } else {
      activeTab.value = 'categories'
      categoryMenuExpanded.value = true
    }
  }

  return {
    // 状态
    activeTab,
    viewMode,
    sidebarCollapsed,
    activeAccountSubTab,
    accountsMenuExpanded,
    activeCategorySubTab,
    categoryMenuExpanded,

    // 常量数据
    tabs,
    mobileTabs,
    accountSubTabs,
    categorySubTabs,

    // 计算属性
    accountSubTabTitle,
    categorySubTabTitle,
    accountSubTabOptions,
    categorySubTabOptions,

    // 操作
    toggleSidebar,
    onAccountsTabClick,
    onCategoriesTabClick
  }
}
