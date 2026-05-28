import type { TodoType, TodoTypeFormData } from '~/types/todo'
import { useTodoStore } from '~/stores/todo'

/**
 * 待办类型管理 - Pinia Store 适配器
 *
 * 此 composable 提供对 Pinia store 中类型数据的访问，
 * 保持与原有 API 的兼容性。
 */
export function useTodoTypes() {
  const todoStore = useTodoStore()

  // 初始化时加载类型（如果尚未加载）
  onMounted(() => {
    if (todoStore.types.length === 0) {
      todoStore.loadTypes()
    }
  })

  // 监听工作空间切换，重新加载类型
  if (import.meta.client) {
    window.addEventListener('workspace:changed', () => {
      todoStore.loadTypes()
    })
  }

  const sortedTypes = computed(() => {
    return [...todoStore.types].sort((a, b) => a.order - b.order)
  })

  // 默认待办类型（如果没有配置任何类型）
  const defaultTypes = computed(() => {
    return sortedTypes.value.length > 0 ? sortedTypes.value : [
      {
        id: 'default',
        name: '默认',
        icon: 'solar:check-circle-linear',
        color: '#3b82f6',
        description: '默认待办类型',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  })

  function getTodoTypeById(id: string): TodoType | undefined {
    return todoStore.types.find(type => type.id === id)
  }

  async function createTodoType(data: TodoTypeFormData): Promise<TodoType> {
    return todoStore.createType(data)
  }

  async function updateTodoType(id: string, data: Partial<TodoTypeFormData>): Promise<void> {
    await todoStore.updateType(id, data)
  }

  async function deleteTodoType(id: string): Promise<void> {
    await todoStore.deleteType(id)
  }

  return {
    todoTypes: computed(() => todoStore.types),
    sortedTypes,
    defaultTypes,
    loading: computed(() => todoStore.typesLoading),
    error: ref(null), // Store 目前没有 error 字段，保持接口兼容
    loadTodoTypes: () => todoStore.loadTypes(),
    getTodoTypeById,
    createTodoType,
    updateTodoType,
    deleteTodoType
  }
}

// 重新导出类型，保持向后兼容
export type { TodoType } from '~/types/todo'
