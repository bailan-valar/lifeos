import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type BillingTabId = 'bills' | 'accounts' | 'categories' | 'budgets' | 'rules'
export type BillingViewMode = 'card' | 'table' | 'calendar'
export type BillingAccountType = 'personal' | 'contact' | 'merchant' | 'other'
export type BillingCategoryType = 'income' | 'expense'

export const useBillingStore = defineStore('billing', () => {
  // ========== 导航状态 ==========
  // 从 localStorage 读取初始状态
  const getStoredSidebarCollapsed = () => {
    if (import.meta.client) {
      return localStorage.getItem('lifeos:billing-sidebar-collapsed') === '1'
    }
    return false
  }

  const getStoredActiveTab = (): BillingTabId => {
    if (import.meta.client) {
      const stored = localStorage.getItem('lifeos:billing-active-tab')
      if (stored && ['bills', 'accounts', 'categories', 'budgets', 'rules'].includes(stored)) {
        return stored as BillingTabId
      }
    }
    return 'bills'
  }

  const activeTab = ref<BillingTabId>(getStoredActiveTab())
  const viewMode = ref<BillingViewMode>('card')
  const sidebarCollapsed = ref(getStoredSidebarCollapsed())

  const activeAccountSubTab = ref<BillingAccountType>('personal')
  const accountsMenuExpanded = ref(true)

  const activeCategorySubTab = ref<BillingCategoryType | 'all'>('expense')
  const categoryMenuExpanded = ref(true)

  // 常量数据
  const tabs = [
    { id: 'bills' as BillingTabId, name: '账单', icon: 'solar:wallet-money-linear' },
    { id: 'accounts' as BillingTabId, name: '账户', icon: 'solar:wallet-linear' },
    { id: 'categories' as BillingTabId, name: '分类', icon: 'solar:folder-linear' },
    { id: 'budgets' as BillingTabId, name: '预算', icon: 'solar:chart-linear' },
    { id: 'rules' as BillingTabId, name: '规则', icon: 'solar:filter-linear' }
  ]

  const mobileTabs = [
    { id: 'bills' as BillingTabId, name: '账单', icon: 'solar:wallet-money-linear' },
    { id: 'accounts' as BillingTabId, name: '账户', icon: 'solar:wallet-linear' },
    { id: 'budgets' as BillingTabId, name: '预算', icon: 'solar:chart-linear' },
    { id: 'categories' as BillingTabId, name: '分类', icon: 'solar:folder-linear' }
  ]

  const accountSubTabs = [
    { type: 'personal' as BillingAccountType, label: '个人账户' },
    { type: 'contact' as BillingAccountType, label: '人员/组织' },
    { type: 'merchant' as BillingAccountType, label: '商户' },
    { type: 'other' as BillingAccountType, label: '其他' }
  ]

  const categorySubTabs = [
    { type: 'income' as BillingCategoryType, label: '收入' },
    { type: 'expense' as BillingCategoryType, label: '支出' }
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
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('lifeos:billing-sidebar-collapsed', sidebarCollapsed.value ? '1' : '0')
  }

  function setActiveTab(tab: BillingTabId) {
    activeTab.value = tab
    if (import.meta.client) {
      localStorage.setItem('lifeos:billing-active-tab', tab)
    }
  }

  function onAccountsTabClick() {
    if (activeTab.value === 'accounts') {
      accountsMenuExpanded.value = !accountsMenuExpanded.value
    } else {
      setActiveTab('accounts')
      accountsMenuExpanded.value = true
    }
  }

  function onCategoriesTabClick() {
    if (activeTab.value === 'categories') {
      categoryMenuExpanded.value = !categoryMenuExpanded.value
    } else {
      setActiveTab('categories')
      categoryMenuExpanded.value = true
    }
  }

  // ========== 筛选状态 ==========
  const billYearFilter = ref<number | null>(new Date().getFullYear())
  const billMonthFilter = ref<number | null>(new Date().getMonth() + 1)

  const billYearOptions = computed<number[]>(() => {
    const current = new Date().getFullYear()
    return [current - 2, current - 1, current, current + 1]
  })

  const billMonthOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const isDateFiltered = computed(() => billYearFilter.value !== null || billMonthFilter.value !== null)

  const currentBudgetYear = computed(() => billYearFilter.value ?? new Date().getFullYear())
  const currentBudgetMonth = computed(() => billMonthFilter.value ?? new Date().getMonth() + 1)

  function getDateRange() {
    if (!isDateFiltered.value) return { start: undefined, end: undefined }
    const year = billYearFilter.value ?? new Date().getFullYear()
    const month = billMonthFilter.value ?? null

    if (month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`
      return { start, end }
    }

    const start = `${year}-01-01T00:00:00.000Z`
    const end = `${year + 1}-01-01T00:00:00.000Z`
    return { start, end }
  }

  return {
    // 导航
    activeTab,
    viewMode,
    sidebarCollapsed,
    activeAccountSubTab,
    accountsMenuExpanded,
    activeCategorySubTab,
    categoryMenuExpanded,
    tabs,
    mobileTabs,
    accountSubTabs,
    categorySubTabs,
    accountSubTabTitle,
    categorySubTabTitle,
    accountSubTabOptions,
    categorySubTabOptions,
    toggleSidebar,
    setActiveTab,
    onAccountsTabClick,
    onCategoriesTabClick,

    // 筛选
    billYearFilter,
    billMonthFilter,
    billYearOptions,
    billMonthOptions,
    isDateFiltered,
    currentBudgetYear,
    currentBudgetMonth,
    getDateRange
  }
})
