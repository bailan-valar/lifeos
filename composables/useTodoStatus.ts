import type { TodoStatus, TodoStatusFormData } from '~/types/todo'
import { useTodoStore } from '~/stores/todo'

export interface TodoStatusStore {
  statuses: Readonly<Ref<readonly TodoStatus[]>>
  loading: Readonly<Ref<boolean>>
  error: Ref<string | null>
  loadStatuses: () => Promise<void>
  createStatus: (data: TodoStatusFormData) => Promise<TodoStatus>
  updateStatus: (id: string, data: Partial<TodoStatusFormData>) => Promise<void>
  deleteStatus: (id: string) => Promise<void>
  setDefaultStatus: (id: string) => Promise<void>
  reorderStatuses: (fromIndex: number, toIndex: number) => Promise<void>
  getDefaultStatus: () => TodoStatus | null
  resetStatuses: () => Promise<boolean>
  ensureDefaultStatuses: () => Promise<boolean>
}

/**
 * 待办状态管理 - Pinia Store 适配器
 *
 * 此 composable 提供对 Pinia store 中状态数据的访问，
 * 保持与原有 API 的兼容性。
 */
export function useTodoStatus(): TodoStatusStore {
  const todoStore = useTodoStore()

  // 初始化时加载状态（如果尚未加载）
  onMounted(() => {
    if (todoStore.statuses.length === 0) {
      todoStore.loadStatuses()
    }
  })

  // 监听工作空间切换，重新加载状态
  if (import.meta.client) {
    window.addEventListener('workspace:changed', () => {
      todoStore.loadStatuses()
    })
  }

  return {
    // 状态
    statuses: computed(() => todoStore.statuses) as Readonly<Ref<readonly TodoStatus[]>>,
    loading: computed(() => todoStore.statusesLoading) as Readonly<Ref<boolean>>,
    error: ref(null), // Store 目前没有 error 字段，保持接口兼容

    // 操作
    loadStatuses: () => todoStore.loadStatuses(),
    createStatus: (data: TodoStatusFormData) => todoStore.createStatus(data),
    updateStatus: (id: string, data: Partial<TodoStatusFormData>) => todoStore.updateStatus(id, data),
    deleteStatus: (id: string) => todoStore.deleteStatus(id),
    setDefaultStatus: (id: string) => todoStore.setDefaultStatus(id),
    reorderStatuses: (fromIndex: number, toIndex: number) => todoStore.reorderStatuses(fromIndex, toIndex),
    getDefaultStatus: () => todoStore.getDefaultStatus(),
    resetStatuses: async () => {
      // 重置功能需要特殊实现，暂时返回 false
      console.warn('resetStatuses is deprecated')
      return false
    },
    ensureDefaultStatuses: () => todoStore.ensureDefaultStatuses()
  }
}
