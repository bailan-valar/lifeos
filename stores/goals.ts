import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type GoalsTabId = 'goals' | 'types' | 'statistics'
export type GoalsViewMode = 'card' | 'table'
export type GoalTypeFilter = 'all' | 'short_term' | 'long_term' | 'habit' | 'project'

export const useGoalsStore = defineStore('goals', () => {
  // ========== 导航状态 ==========
  // 从 localStorage 读取初始状态
  const getStoredSidebarCollapsed = () => {
    if (import.meta.client) {
      return localStorage.getItem('lifeos:goals-sidebar-collapsed') === '1'
    }
    return false
  }

  const getStoredActiveTab = (): GoalsTabId => {
    if (import.meta.client) {
      const stored = localStorage.getItem('lifeos:goals-active-tab')
      if (stored && ['goals', 'types', 'statistics'].includes(stored)) {
        return stored as GoalsTabId
      }
    }
    return 'goals'
  }

  const activeTab = ref<GoalsTabId>(getStoredActiveTab())
  const viewMode = ref<GoalsViewMode>('card')
  const sidebarCollapsed = ref(getStoredSidebarCollapsed())

  const activeTypeFilter = ref<GoalTypeFilter>('all')
  const typesMenuExpanded = ref(true)

  // 常量数据
  const tabs = [
    { id: 'goals' as GoalsTabId, name: '目标', icon: 'solar:target-linear' },
    { id: 'types' as GoalsTabId, name: '类型管理', icon: 'solar:folder-linear' },
    { id: 'statistics' as GoalsTabId, name: '统计', icon: 'solar:chart-linear' }
  ]

  const mobileTabs = [
    { id: 'goals' as GoalsTabId, name: '目标', icon: 'solar:target-linear' },
    { id: 'types' as GoalsTabId, name: '类型', icon: 'solar:folder-linear' },
    { id: 'statistics' as GoalsTabId, name: '统计', icon: 'solar:chart-linear' }
  ]

  const typeFilters = [
    { type: 'all' as GoalTypeFilter, label: '全部目标' },
    { type: 'short_term' as GoalTypeFilter, label: '短期目标' },
    { type: 'long_term' as GoalTypeFilter, label: '长期目标' },
    { type: 'habit' as GoalTypeFilter, label: '习惯养成' },
    { type: 'project' as GoalTypeFilter, label: '项目任务' }
  ]

  // 计算属性
  const typeFilterTitle = computed(() => {
    const map: Record<string, string> = {
      all: '全部目标',
      short_term: '短期目标',
      long_term: '长期目标',
      habit: '习惯养成',
      project: '项目任务'
    }
    return map[activeTypeFilter.value] || '目标列表'
  })

  const typeFilterOptions = computed(() => typeFilters.map(f => ({ value: f.type, label: f.label })))

  // 操作
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('lifeos:goals-sidebar-collapsed', sidebarCollapsed.value ? '1' : '0')
  }

  function setActiveTab(tab: GoalsTabId) {
    activeTab.value = tab
    if (import.meta.client) {
      localStorage.setItem('lifeos:goals-active-tab', tab)
    }
  }

  function onTypesTabClick() {
    if (activeTab.value === 'goals') {
      typesMenuExpanded.value = !typesMenuExpanded.value
    } else {
      setActiveTab('goals')
      typesMenuExpanded.value = true
    }
  }

  function onGoalsTabClick() {
    if (activeTab.value === 'goals') {
      typesMenuExpanded.value = !typesMenuExpanded.value
    } else {
      setActiveTab('goals')
      typesMenuExpanded.value = true
    }
  }

  return {
    // 导航
    activeTab,
    viewMode,
    sidebarCollapsed,
    activeTypeFilter,
    typesMenuExpanded,
    tabs,
    mobileTabs,
    typeFilters,
    typeFilterTitle,
    typeFilterOptions,
    toggleSidebar,
    setActiveTab,
    onGoalsTabClick,
    onTypesTabClick
  }
})