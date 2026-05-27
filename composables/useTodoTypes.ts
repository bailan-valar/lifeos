import { getDB } from '~/services/db'

export interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  order: number
  createdAt: string
  updatedAt: string
}

export function useTodoTypes() {
  const todoTypes = ref<TodoType[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadTodoTypes = async () => {
    try {
      loading.value = true
      error.value = null
      
      const db = await getDB()
      const docs = await db.todo_types.find().exec()
      todoTypes.value = docs.map(doc => doc.toJSON()) as TodoType[]
    } catch (err) {
      console.error('加载待办类型失败:', err)
      error.value = '加载待办类型失败'
    } finally {
      loading.value = false
    }
  }

  const getTodoTypeById = (id: string): TodoType | undefined => {
    return todoTypes.value.find(type => type.id === id)
  }

  const sortedTypes = computed(() => {
    return [...todoTypes.value].sort((a, b) => a.order - b.order)
  })

  // 默认待办类型
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

  return {
    todoTypes: readonly(todoTypes),
    sortedTypes,
    defaultTypes,
    loading: readonly(loading),
    error: readonly(error),
    loadTodoTypes,
    getTodoTypeById
  }
}