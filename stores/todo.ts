import { defineStore } from 'pinia'
import { ref, computed, readonly as vueReadonly } from 'vue'
import type {
  TodoItem,
  TodoStatus,
  TodoStatusFormData,
  TodoType,
  TodoTypeFormData,
  ViewMode,
  GroupBy,
  SortBy,
  TodoWithMeta,
  TaskGroup,
  ViewFilters
} from '~/types/todo'
import { todoDB } from '~/composables/useTodoDB'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { ICONS } from '~/composables/useIcons'

export const useTodoStore = defineStore('todo', () => {
  // ==================== 状态 ====================
  const loading = ref(false)
  const error = ref<string | null>(null)
  const allTasks = ref<TodoWithMeta[]>([])

  // ==================== 元数据状态 ====================
  const notesCache = ref<Map<string, string>>(new Map())
  const statuses = ref<TodoStatus[]>([])
  const types = ref<TodoType[]>([])
  const statusesLoading = ref(false)
  const typesLoading = ref(false)

  // 视图状态
  const viewMode = ref<ViewMode>('all')
  const groupBy = ref<GroupBy>('none')
  const sortBy = ref<SortBy>('created')
  const filters = reactive<ViewFilters>({
    status: [],
    type: [],
    search: ''
  })

  // 展开状态（用于树形展示）
  const expandedParents = ref<Record<string, boolean>>({})

  // 是否正在从远程同步（避免乐观更新时被覆盖）
  let isSyncing = false

  // ==================== 计算属性 ====================

  const getTodayString = () => new Date().toISOString().slice(0, 10)

  // 视图筛选
  const viewTasks = computed(() => {
    const today = getTodayString()
    return allTasks.value.filter(task => {
      if (task.parentId) return false

      switch (viewMode.value) {
        case 'today':
          if (task.completed) return false
          const dueDate = task.dueDate || task.createdAt.slice(0, 10)
          return dueDate <= today

        case 'overdue':
          if (task.completed) return false
          const due = task.dueDate || task.createdAt.slice(0, 10)
          return due < today

        case 'important':
          if (task.completed) return false
          return task.priority === 'high'

        default:
          return true
      }
    })
  })

  // 额外筛选
  const filteredTasks = computed(() => {
    return viewTasks.value.filter(task => {
      if (filters.status?.length) {
        if (!task.statusId || !filters.status.includes(task.statusId)) return false
      }
      if (filters.type?.length) {
        if (!task.typeId || !filters.type.includes(task.typeId)) return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return task.text.toLowerCase().includes(search) ||
          (task.noteTitle && task.noteTitle.toLowerCase().includes(search))
      }
      return true
    })
  })

  // 排序
  const sortedTasks = computed(() => {
    const tasks = [...filteredTasks.value]
    return tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1

      switch (sortBy.value) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 }
          const pa = priorityOrder[a.priority || 'none']
          const pb = priorityOrder[b.priority || 'none']
          if (pa !== pb) return pa - pb
          break

        case 'dueDate':
          const dateA = a.dueDate || a.createdAt.slice(0, 10)
          const dateB = b.dueDate || b.createdAt.slice(0, 10)
          if (dateA !== dateB) return dateA.localeCompare(dateB)
          break

        case 'name':
          return (a.text || '').localeCompare(b.text || '')

        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return 0
    })
  })

  // 分组
  const groupedTasks = computed(() => {
    const groups: Record<string, TaskGroup> = {}

    if (groupBy.value === 'none') {
      return {
        all: {
          id: 'all',
          title: '全部',
          count: sortedTasks.value.length,
          completedCount: sortedTasks.value.filter(t => t.completed).length,
          tasks: sortedTasks.value
        }
      }
    }

    for (const task of sortedTasks.value) {
      let groupKey = ''
      let groupTitle = ''

      switch (groupBy.value) {
        case 'date': {
          const today = getTodayString()
          const date = task.dueDate || task.createdAt.slice(0, 10)

          if (date === today) {
            groupKey = 'today'
            groupTitle = '📅 今天'
          } else if (date < today) {
            groupKey = 'overdue'
            groupTitle = '📅 逾期'
          } else if (date === new Date(Date.now() + 86400000).toISOString().slice(0, 10)) {
            groupKey = 'tomorrow'
            groupTitle = '📅 明天'
          } else if (date <= new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)) {
            groupKey = 'week'
            groupTitle = '📅 本周'
          } else {
            groupKey = date
            groupTitle = `📅 ${date}`
          }
          break
        }

        case 'note':
          groupKey = task.noteId
          groupTitle = task.noteTitle || '未命名笔记'
          break

        case 'status':
          groupKey = task.statusId || 'none'
          groupTitle = task.statusName || '无状态'
          break

        case 'priority':
          const priorityMap = {
            high: '🔴 高优先级',
            medium: '🟡 中优先级',
            low: '🟢 低优先级',
            none: '⚪ 无优先级'
          }
          groupKey = task.priority || 'none'
          groupTitle = priorityMap[task.priority || 'none']
          break
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          title: groupTitle,
          count: 0,
          completedCount: 0,
          tasks: []
        }
      }

      groups[groupKey].tasks.push(task)
      groups[groupKey].count++
      if (task.completed) groups[groupKey].completedCount++
    }

    const groupArray = Object.values(groups)

    if (groupBy.value === 'date') {
      const order = ['today', 'overdue', 'tomorrow', 'week']
      groupArray.sort((a, b) => {
        const ia = order.indexOf(a.id)
        const ib = order.indexOf(b.id)
        if (ia >= 0 && ib >= 0) return ia - ib
        if (ia >= 0) return -1
        if (ib >= 0) return 1
        return a.id.localeCompare(b.id)
      })
    } else if (groupBy.value === 'priority') {
      const order = ['high', 'medium', 'low', 'none']
      groupArray.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    }

    return groups
  })

  // 统计信息
  const stats = computed(() => {
    const today = getTodayString()
    const todayTasks = allTasks.value.filter(t => {
      if (t.parentId || t.completed) return false
      const due = t.dueDate || t.createdAt.slice(0, 10)
      return due <= today
    })

    const overdueTasks = allTasks.value.filter(t => {
      if (t.parentId || t.completed) return false
      const due = t.dueDate || t.createdAt.slice(0, 10)
      return due < today
    })

    const importantTasks = allTasks.value.filter(t => {
      if (t.parentId || t.completed) return false
      return t.priority === 'high'
    })

    // 计算本周任务数量
    const weekTasks = allTasks.value.filter(t => {
      if (t.parentId || t.completed) return false
      const due = t.dueDate || t.createdAt.slice(0, 10)
      const taskDate = new Date(due)
      const todayDate = new Date(today)
      const dayOfWeek = todayDate.getDay()
      const monday = new Date(todayDate)
      monday.setDate(todayDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return taskDate >= monday && taskDate <= sunday
    })

    return {
      all: allTasks.value.filter(t => !t.parentId).length,
      today: todayTasks.length,
      week: weekTasks.length,
      overdue: overdueTasks.length,
      important: importantTasks.length,
      completed: allTasks.value.filter(t => !t.parentId && t.completed).length
    }
  })

  // ==================== Actions ====================

  // 加载所有任务
  async function loadAllTasks() {
    if (isSyncing) return
    isSyncing = true

    try {
      loading.value = true
      error.value = null

      const result = await todoDB.loadAllTasks()

      // 更新元数据
      notesCache.value = new Map(result.notes.map(n => [n.id, n.title || '未命名笔记']))
      if (result.statuses.length > 0) statuses.value = result.statuses
      if (result.types.length > 0) types.value = result.types

      // 更新任务列表
      allTasks.value = result.tasks.map(task => ({
        ...task,
        noteTitle: notesCache.value.get(task.noteId),
        statusName: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.name : undefined,
        statusColor: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.color : undefined,
        statusIcon: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.icon : undefined,
        typeName: task.typeId ? types.value.find(t => t.id === task.typeId)?.name : undefined,
        typeColor: task.typeId ? types.value.find(t => t.id === task.typeId)?.color : undefined,
        typeIcon: task.typeId ? types.value.find(t => t.id === task.typeId)?.icon : undefined
      }))
    } catch (err) {
      console.error('加载待办任务失败:', err)
      error.value = '加载待办任务失败'
    } finally {
      loading.value = false
      isSyncing = false
    }
  }

  // 快速添加任务（乐观更新）
  async function quickAdd(text: string, options?: {
    dueDate?: string
    priority?: TodoItem['priority']
    typeId?: string
    statusId?: string
  }) {
    // 乐观更新：先创建本地对象
    const { generateId, now } = await import('~/services/db')
    const tempTask: TodoWithMeta = {
      id: generateId(),
      text,
      completed: false,
      createdAt: now(),
      dueDate: options?.dueDate,
      priority: options?.priority,
      typeId: options?.typeId,
      statusId: options?.statusId,
      noteId: 'temp', // 临时占位
      typeName: options?.typeId ? types.value.find(t => t.id === options.typeId)?.name : undefined,
      typeColor: options?.typeId ? types.value.find(t => t.id === options.typeId)?.color : undefined,
      typeIcon: options?.typeId ? types.value.find(t => t.id === options.typeId)?.icon : undefined,
      statusName: options?.statusId ? statuses.value.find(s => s.id === options.statusId)?.name : undefined,
      statusColor: options?.statusId ? statuses.value.find(s => s.id === options.statusId)?.color : undefined,
      statusIcon: options?.statusId ? statuses.value.find(s => s.id === options.statusId)?.icon : undefined
    }

    // 立即更新 UI
    allTasks.value.unshift(tempTask)

    try {
      // 异步写入数据库
      const result = await todoDB.createTodo(text, options)

      // 用数据库返回的真实数据替换临时数据
      const index = allTasks.value.findIndex(t => t.id === tempTask.id)
      if (index !== -1 && result) {
        allTasks.value[index] = {
          ...result,
          noteId: result.noteId,
          noteTitle: notesCache.value.get(result.noteId),
          statusName: result.statusId ? statuses.value.find(s => s.id === result.statusId)?.name : undefined,
          statusColor: result.statusId ? statuses.value.find(s => s.id === result.statusId)?.color : undefined,
          statusIcon: result.statusId ? statuses.value.find(s => s.id === result.statusId)?.icon : undefined,
          typeName: result.typeId ? types.value.find(t => t.id === result.typeId)?.name : undefined,
          typeColor: result.typeId ? types.value.find(t => t.id === result.typeId)?.color : undefined,
          typeIcon: result.typeId ? types.value.find(t => t.id === result.typeId)?.icon : undefined
        }
      }

      return result
    } catch (err) {
      // 失败时回滚
      allTasks.value = allTasks.value.filter(t => t.id !== tempTask.id)
      throw err
    }
  }

  // 更新任务（乐观更新）
  async function updateTask(taskId: string, updates: Partial<TodoItem>) {
    // 保存旧状态用于回滚
    const oldTasks = [...allTasks.value]
    const taskIndex = allTasks.value.findIndex(t => t.id === taskId)

    if (taskIndex === -1) return false

    // 乐观更新本地状态
    allTasks.value[taskIndex] = { ...allTasks.value[taskIndex], ...updates }

    try {
      const success = await todoDB.updateTask(taskId, updates)
      if (!success) {
        // 失败回滚
        allTasks.value = oldTasks
      }
      return success
    } catch (err) {
      allTasks.value = oldTasks
      throw err
    }
  }

  // 切换任务完成状态（乐观更新）
  async function toggleTask(taskId: string) {
    const task = allTasks.value.find(t => t.id === taskId)
    if (!task) return false

    return updateTask(taskId, { completed: !task.completed })
  }

  // 删除任务（乐观更新）
  async function deleteTask(taskId: string) {
    // 保存旧状态用于回滚
    const oldTasks = [...allTasks.value]

    // 收集要删除的 ID（包括子任务）
    const toDelete = new Set([taskId])
    const findChildren = (parentId: string) => {
      allTasks.value.forEach(t => {
        if (t.parentId === parentId) {
          toDelete.add(t.id)
          findChildren(t.id)
        }
      })
    }
    findChildren(taskId)

    // 乐观更新：立即从本地移除
    allTasks.value = allTasks.value.filter(t => !toDelete.has(t.id))

    try {
      const success = await todoDB.deleteTask(taskId)
      if (!success) {
        // 失败回滚
        allTasks.value = oldTasks
      }
      return success
    } catch (err) {
      allTasks.value = oldTasks
      throw err
    }
  }

  // ==================== 状态管理 ====================

  async function loadStatuses() {
    statusesLoading.value = true
    try {
      const db = await getDB()
      const result = await db.todoStatuses.find({
        sort: [{ order: 'asc' }]
      }).exec()
      statuses.value = result.map((doc: any) => doc.toJSON()) as TodoStatus[]
    } catch (err) {
      console.error('加载待办状态失败:', err)
    } finally {
      statusesLoading.value = false
    }
  }

  async function loadTypes() {
    typesLoading.value = true
    try {
      const db = await getDB()
      const result = await db.todo_types.find({
        sort: [{ order: 'asc' }]
      }).exec()
      types.value = result.map((doc: any) => doc.toJSON()) as TodoType[]
    } catch (err) {
      console.error('加载待办类型失败:', err)
    } finally {
      typesLoading.value = false
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
      updatedAt: now()
    }

    await db.todoStatuses.insert({ ...status })
    statuses.value.push(status)

    // 更新本地缓存的任务状态名称
    updateTasksStatusMeta()

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

    updateTasksStatusMeta()
  }

  async function deleteStatus(id: string) {
    const db = await getDB()
    const status = statuses.value.find(s => s.id === id)

    if (status?.isDefault) {
      throw new Error('默认状态不能删除')
    }

    // 检查是否有待办项使用此状态
    const todosUsingStatus = await db.todos.find({ statusId: id } as any).exec()
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

  async function reorderStatuses(fromIndex: number, toIndex: number) {
    const db = await getDB()
    const sortedStatuses = [...statuses.value].sort((a, b) => a.order - b.order)

    if (fromIndex < 0 || fromIndex >= sortedStatuses.length || toIndex < 0 || toIndex >= sortedStatuses.length) {
      return
    }

    // 移动元素
    const [moved] = sortedStatuses.splice(fromIndex, 1)
    sortedStatuses.splice(toIndex, 0, moved)

    // 更新所有状态的 order
    const updates = sortedStatuses.map((status, index) => ({
      id: status.id,
      order: index
    }))

    for (const update of updates) {
      const doc = await db.todoStatuses.findOne(update.id).exec()
      if (doc) {
        await doc.patch({ order: update.order, updatedAt: now() })
      }
    }

    // 更新本地状态
    statuses.value = sortedStatuses.map((status, index) => ({
      ...status,
      order: index,
      updatedAt: now()
    }))
  }

  function getDefaultStatus(): TodoStatus | null {
    return statuses.value.find(s => s.isDefault) || null
  }

  async function ensureDefaultStatuses(): Promise<boolean> {
    if (statuses.value.length > 0) return false
    return initDefaultTodoStatuses()
  }

  async function initDefaultTodoStatuses(): Promise<boolean> {
    const db = await getDB()
    const existing = await db.todoStatuses.find({ limit: 1 }).exec()
    if (existing.length > 0) return false

    const defaultStatuses: TodoStatus[] = [
      {
        id: generateId(),
        name: '待办',
        icon: ICONS.round,
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
        icon: ICONS.clockCircle,
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
        icon: ICONS.pauseCircle,
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
        icon: ICONS.checkCircle,
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
    await loadStatuses()
    return true
  }

  // ==================== 类型管理 ====================

  async function createType(data: TodoTypeFormData): Promise<TodoType> {
    const db = await getDB()

    const type: TodoType = {
      id: generateId(),
      name: data.name,
      icon: data.icon,
      color: data.color,
      description: data.description || '',
      order: types.value.length,
      createdAt: now(),
      updatedAt: now()
    }

    await db.todo_types.insert({ ...type })
    types.value.push(type)

    updateTasksTypeMeta()

    return type
  }

  async function updateType(id: string, data: Partial<TodoTypeFormData>) {
    const db = await getDB()
    const doc = await db.todo_types.findOne(id).exec()
    if (!doc) return

    await doc.patch({ ...data, updatedAt: now() })
    const idx = types.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      types.value[idx] = { ...types.value[idx], ...data, updatedAt: now() }
    }

    updateTasksTypeMeta()
  }

  async function deleteType(id: string) {
    const db = await getDB()

    // 检查是否有待办项使用此类型
    const todosUsingType = await db.todos.find({ typeId: id } as any).exec()
    if (todosUsingType.length > 0) {
      throw new Error(`有 ${todosUsingType.length} 个待办项正在使用此类型，无法删除`)
    }

    const doc = await db.todo_types.findOne(id).exec()
    if (!doc) return

    await doc.remove()
    types.value = types.value.filter(t => t.id !== id)
  }

  // 更新任务的状态元数据
  function updateTasksStatusMeta() {
    allTasks.value = allTasks.value.map(task => ({
      ...task,
      statusName: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.name : undefined,
      statusColor: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.color : undefined,
      statusIcon: task.statusId ? statuses.value.find(s => s.id === task.statusId)?.icon : undefined
    }))
  }

  // 更新任务的类型元数据
  function updateTasksTypeMeta() {
    allTasks.value = allTasks.value.map(task => ({
      ...task,
      typeName: task.typeId ? types.value.find(t => t.id === task.typeId)?.name : undefined,
      typeColor: task.typeId ? types.value.find(t => t.id === task.typeId)?.color : undefined,
      typeIcon: task.typeId ? types.value.find(t => t.id === task.typeId)?.icon : undefined
    }))
  }

  // ==================== 订阅变更 ====================
  const unsubscribes: (() => void)[] = []

  function subscribeChanges() {
    if (unsubscribes.length > 0) return

    // 订阅任务变更
    unsubscribes.push(
      onCollectionChange('todos', () => {
        if (!isSyncing) {
          loadAllTasks()
        }
      })
    )

    // 订阅状态变更
    unsubscribes.push(
      onCollectionChange('todoStatuses', () => {
        loadStatuses()
      })
    )

    // 订阅类型变更
    unsubscribes.push(
      onCollectionChange('todo_types', () => {
        loadTypes()
      })
    )
  }

  // 取消订阅
  function unsubscribeChanges() {
    unsubscribes.forEach(unsub => unsub())
    unsubscribes.length = 0
  }

  // 重置筛选
  function resetFilters() {
    filters.status = []
    filters.type = []
    filters.search = ''
  }

  return {
    // ==================== 状态 ====================
    loading: vueReadonly(loading),
    error: vueReadonly(error),
    allTasks: vueReadonly(allTasks),
    statuses: vueReadonly(statuses),
    types: vueReadonly(types),
    statusesLoading: vueReadonly(statusesLoading),
    typesLoading: vueReadonly(typesLoading),

    // ==================== 视图状态 ====================
    viewMode,
    groupBy,
    sortBy,
    filters,
    expandedParents,

    // ==================== 计算属性 ====================
    viewTasks,
    filteredTasks,
    sortedTasks,
    groupedTasks,
    stats,

    // ==================== 任务操作 ====================
    loadAllTasks,
    quickAdd,
    updateTask,
    toggleTask,
    deleteTask,

    // ==================== 状态操作 ====================
    loadStatuses,
    createStatus,
    updateStatus,
    deleteStatus,
    setDefaultStatus,
    reorderStatuses,
    getDefaultStatus,
    ensureDefaultStatuses,

    // ==================== 类型操作 ====================
    loadTypes,
    createType,
    updateType,
    deleteType,

    // ==================== 订阅管理 ====================
    subscribeChanges,
    unsubscribeChanges,
    resetFilters
  }
})
