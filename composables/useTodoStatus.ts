import type { TodoStatus, TodoStatusFormData } from '~/types/todo'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'

export interface TodoStatusStore {
  statuses: Ref<TodoStatus[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadStatuses: () => Promise<void>
  createStatus: (data: TodoStatusFormData) => Promise<TodoStatus>
  updateStatus: (id: string, data: Partial<TodoStatusFormData>) => Promise<void>
  deleteStatus: (id: string) => Promise<void>
  setDefaultStatus: (id: string) => Promise<void>
  getDefaultStatus: () => TodoStatus | null
  resetStatuses: () => Promise<boolean>
  ensureDefaultStatuses: () => Promise<boolean>
}

let _store: TodoStatusStore | null = null
let _unsub: (() => void) | null = null

function startWatchingStatuses() {
  if (_unsub) return
  _unsub = onCollectionChange('todoStatuses', () => {
    if (_store) _store.loadStatuses()
  })
}

function stopWatchingStatuses() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingStatuses()
    startWatchingStatuses()
    if (_store) _store.loadStatuses()
  })
}

async function initDefaultTodoStatuses(): Promise<boolean> {
  const db = await getDB()
  const existing = await db.todoStatuses.find({ limit: 1 }).exec()
  if (existing.length > 0) return false

  const defaultStatuses: TodoStatus[] = [
    {
      id: generateId(),
      name: '待办',
      icon: 'solar:round-circle-linear',
      color: '#3b82f6',
      description: '待处理的任务',
      order: 0,
      isDefault: true,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: generateId(),
      name: '进行中',
      icon: 'solar:clock-circle-linear',
      color: '#f59e0b',
      description: '正在进行的任务',
      order: 1,
      isDefault: false,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: generateId(),
      name: '已暂停',
      icon: 'solar:pause-circle-linear',
      color: '#ef4444',
      description: '暂时停止的任务',
      order: 2,
      isDefault: false,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: generateId(),
      name: '已完成',
      icon: 'solar:check-circle-linear',
      color: '#10b981',
      description: '已完成的任务',
      order: 3,
      isDefault: false,
      createdAt: now(),
      updatedAt: now()
    }
  ]

  for (const status of defaultStatuses) {
    await db.todoStatuses.insert({ ...status })
  }
  return true
}

function createStore(): TodoStatusStore {
  const statuses = ref<TodoStatus[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadStatuses() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const result = await db.todoStatuses.find({
        sort: [{ order: 'asc' }]
      }).exec()
      statuses.value = result.map((doc: any) => doc.toJSON()) as TodoStatus[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load todo statuses:', e)
    } finally {
      loading.value = false
    }
  }

  async function createStatus(data: TodoStatusFormData): Promise<TodoStatus> {
    const db = await getDB()
    
    // 如果设置为默认状态，需要先取消其他默认状态
    if (data.isDefault) {
      const existingDefault = statuses.value.find(s => s.isDefault)
      if (existingDefault) {
        const defaultDoc = await db.todoStatuses.findOne(existingDefault.id).exec()
        if (defaultDoc) {
          await defaultDoc.patch({ isDefault: false, updatedAt: now() })
        }
      }
    }
    
    const status: TodoStatus = {
      id: generateId(),
      name: data.name,
      icon: data.icon,
      color: data.color,
      description: data.description || '',
      order: statuses.value.length,
      isDefault: data.isDefault || false,
      createdAt: now(),
      updatedAt: now(),
    }
    
    await db.todoStatuses.insert({ ...status })
    statuses.value.push(status)
    return status
  }

  async function updateStatus(id: string, data: Partial<TodoStatusFormData>) {
    const db = await getDB()
    const doc = await db.todoStatuses.findOne(id).exec()
    if (!doc) return
    
    // 如果设置为默认状态，需要先取消其他默认状态
    if (data.isDefault) {
      const existingDefault = statuses.value.find(s => s.isDefault && s.id !== id)
      if (existingDefault) {
        const defaultDoc = await db.todoStatuses.findOne(existingDefault.id).exec()
        if (defaultDoc) {
          await defaultDoc.patch({ isDefault: false, updatedAt: now() })
        }
      }
    }
    
    await doc.patch({ ...data, updatedAt: now() })
    const idx = statuses.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      statuses.value[idx] = { ...statuses.value[idx], ...data, updatedAt: now() }
    }
  }

  async function deleteStatus(id: string) {
    const db = await getDB()
    const status = statuses.value.find(s => s.id === id)
    
    if (status?.isDefault) {
      throw new Error('默认状态不能删除')
    }
    
    // 检查是否有待办项使用此状态
    const todosUsingStatus = await db.todos.find({ statusId: id }).exec()
    if (todosUsingStatus.length > 0) {
      throw new Error(`有 ${todosUsingStatus.length} 个待办项正在使用此状态，无法删除`)
    }
    
    const doc = await db.todoStatuses.findOne(id).exec()
    if (!doc) return
    
    await doc.remove()
    statuses.value = statuses.value.filter(s => s.id !== id)
  }

  async function setDefaultStatus(id: string) {
    const db = await getDB()
    
    // 取消所有其他默认状态
    const existingDefaults = statuses.value.filter(s => s.isDefault && s.id !== id)
    for (const existingDefault of existingDefaults) {
      const doc = await db.todoStatuses.findOne(existingDefault.id).exec()
      if (doc) {
        await doc.patch({ isDefault: false, updatedAt: now() })
      }
    }
    
    // 设置新的默认状态
    const newDefaultDoc = await db.todoStatuses.findOne(id).exec()
    if (newDefaultDoc) {
      await newDefaultDoc.patch({ isDefault: true, updatedAt: now() })
      
      const idx = statuses.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        statuses.value[idx] = { ...statuses.value[idx], isDefault: true, updatedAt: now() }
      }
    }
    
    // 更新其他状态的isDefault字段
    for (const existingDefault of existingDefaults) {
      const idx = statuses.value.findIndex(s => s.id === existingDefault.id)
      if (idx !== -1) {
        statuses.value[idx] = { ...statuses.value[idx], isDefault: false, updatedAt: now() }
      }
    }
  }

  function getDefaultStatus(): TodoStatus | null {
    return statuses.value.find(s => s.isDefault) || null
  }

  async function resetStatuses(): Promise<boolean> {
    const db = await getDB()
    
    // 删除所有现有状态
    const existingDocs = await db.todoStatuses.find({}).exec()
    for (const doc of existingDocs) {
      await doc.remove()
    }
    
    statuses.value = []
    return ensureDefaultStatuses()
  }

  async function ensureDefaultStatuses(): Promise<boolean> {
    if (statuses.value.length > 0) return false
    const initialized = await initDefaultTodoStatuses()
    if (initialized) {
      await loadStatuses()
    }
    return initialized
  }

  return {
    statuses,
    loading,
    error,
    loadStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    setDefaultStatus,
    getDefaultStatus,
    resetStatuses,
    ensureDefaultStatuses
  }
}

export function useTodoStatus(): TodoStatusStore {
  if (!_store) {
    _store = createStore()
    startWatchingStatuses()
  }
  return _store
}