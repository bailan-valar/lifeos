import { getDB, onCollectionChange } from '~/services/db'
import type {
  TodoItem,
  TodoTreeNode,
  ViewMode,
  GroupBy,
  SortBy,
  TodoWithMeta,
  TaskGroup,
  ViewFilters
} from '~/types/todo'

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useTodoViews() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 原始任务数据（扁平化，包含子任务）
  const allTasks = ref<TodoWithMeta[]>([])

  // 笔记数据缓存
  const notesCache = ref<Map<string, string>>(new Map())

  // 变更订阅取消函数
  let unsubscribe: (() => void) | null = null

  // 订阅 module_data 变更，自动刷新数据
  const subscribeChanges = () => {
    if (unsubscribe) return // 避免重复订阅

    unsubscribe = onCollectionChange('module_data', () => {
      // module_data 变更时自动重新加载
      loadAllTasks()
    })
  }

  // 取消订阅
  const unsubscribeChanges = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // 当前视图模式
  const viewMode = ref<ViewMode>('all')
  const groupBy = ref<GroupBy>('none')
  const sortBy = ref<SortBy>('created')
  const filters = reactive<ViewFilters>({
    status: [],
    type: [],
    search: ''
  })

  // 加载所有待办任务
  const loadAllTasks = async () => {
    try {
      loading.value = true
      error.value = null

      const db = await getDB()

      // 加载笔记
      const notes = await db.notes.find().exec()
      notesCache.value.clear()
      for (const note of notes) {
        notesCache.value.set(note.id, note.title || '未命名笔记')
      }

      // 加载状态和类型
      const statusDocs = await db.todoStatuses.find().exec()
      const statuses = statusDocs.map(doc => doc.toJSON())

      const typeDocs = await db.todo_types.find().exec()
      const types = typeDocs.map(doc => doc.toJSON())

      // 加载模块数据
      const moduleDataList = await db.module_data.find({
        selector: { moduleId: 'todo' }
      }).exec()

      const tasks: TodoWithMeta[] = []

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] } | undefined
        if (data?.todos) {
          for (const todo of data.todos) {
            const taskWithMeta: TodoWithMeta = {
              ...todo,
              noteId: doc.noteId,
              noteTitle: notesCache.value.get(doc.noteId)
            }

            // 添加状态信息
            if (todo.statusId) {
              const status = statuses.find(s => s.id === todo.statusId)
              if (status) {
                taskWithMeta.statusName = status.name
                taskWithMeta.statusColor = status.color
                taskWithMeta.statusIcon = status.icon
              }
            }

            // 添加类型信息
            if (todo.typeId) {
              const type = types.find(t => t.id === todo.typeId)
              if (type) {
                taskWithMeta.typeName = type.name
                taskWithMeta.typeColor = type.color
                taskWithMeta.typeIcon = type.icon
              }
            }

            tasks.push(taskWithMeta)
          }
        }
      }

      allTasks.value = tasks
    } catch (err) {
      console.error('加载待办任务失败:', err)
      error.value = '加载待办任务失败'
    } finally {
      loading.value = false
    }
  }

  // 获取今天的日期字符串
  const getTodayString = () => {
    return formatDateLocal(new Date())
  }

  // 视图筛选逻辑
  const viewTasks = computed(() => {
    const today = getTodayString()

    return allTasks.value.filter(task => {
      // 只显示根任务（有 parentId 的是子任务）
      if (task.parentId) return false

      switch (viewMode.value) {
        case 'today':
          // 今日任务：截止日期为今天或之前，且未完成
          if (task.completed) return false
          const dueDate = task.dueDate || task.createdAt.slice(0, 10)
          return dueDate <= today

        case 'overdue':
          // 逾期任务：截止日期早于今天，且未完成
          if (task.completed) return false
          const due = task.dueDate || task.createdAt.slice(0, 10)
          return due < today

        case 'important':
          // 重要任务：高优先级，且未完成
          if (task.completed) return false
          return task.priority === 'high'

        default:
          // 全部任务
          return true
      }
    })
  })

  // 应用额外筛选
  const filteredTasks = computed(() => {
    return viewTasks.value.filter(task => {
      // 状态筛选
      if (filters.status && filters.status.length > 0) {
        if (!task.statusId || !filters.status.includes(task.statusId)) {
          return false
        }
      }

      // 类型筛选
      if (filters.type && filters.type.length > 0) {
        if (!task.typeId || !filters.type.includes(task.typeId)) {
          return false
        }
      }

      // 搜索筛选
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
      // 未完成的排前面
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }

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
          } else {
            const tomorrow = formatDateLocal(new Date(Date.now() + 86400000))
            const weekEnd = formatDateLocal(new Date(Date.now() + 86400000 * 7))

            if (date === tomorrow) {
              groupKey = 'tomorrow'
              groupTitle = '📅 明天'
            } else if (date <= weekEnd) {
              groupKey = 'week'
              groupTitle = '📅 本周'
            } else {
              groupKey = date
              groupTitle = `📅 ${date}`
            }
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

    // 转换为数组并排序
    const groupArray = Object.values(groups)

    // 特定分组排序
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
      groupArray.sort((a, b) => {
        return order.indexOf(a.id) - order.indexOf(b.id)
      })
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

  // 快速添加任务
  const quickAdd = async (text: string, options?: {
    dueDate?: string
    priority?: TodoItem['priority']
    typeId?: string
    statusId?: string
  }) => {
    try {
      const db = await getDB()

      // 查找或创建默认笔记
      let notes = await db.notes.find({
        selector: {
          title: '待办任务'
        }
      }).exec()

      let targetNote = notes[0]
      if (!targetNote) {
        const { generateId, now } = await import('~/services/db')
        const noteId = generateId()
        await db.notes.insert({
          id: noteId,
          title: '待办任务',
          content: '',
          createdAt: now(),
          updatedAt: now()
        })
        const created = await db.notes.findOne(noteId).exec()
        if (!created) {
          throw new Error('无法创建目标笔记')
        }
        targetNote = created
      }

      if (!targetNote) {
        throw new Error('无法找到或创建目标笔记')
      }

      const { generateId, now } = await import('~/services/db')
      const newTodo: TodoItem = {
        id: generateId(),
        text,
        completed: false,
        createdAt: now(),
        dueDate: options?.dueDate,
        priority: options?.priority,
        typeId: options?.typeId,
        statusId: options?.statusId,
        noteId: targetNote.get('id')
      }

      // 查找或创建模块数据
      const moduleData = await db.module_data.findOne({
        selector: {
          noteId: targetNote.get('id'),
          moduleId: 'todo'
        }
      }).exec()

      if (moduleData) {
        const data = moduleData.get('data') as { todos: TodoItem[] }
        data.todos.unshift(newTodo) // 添加到开头
        await moduleData.patch({ data: { todos: data.todos } })
      } else {
        await db.module_data.insert({
          id: generateId(),
          noteId: targetNote.get('id'),
          moduleId: 'todo',
          data: { todos: [newTodo] },
          createdAt: now(),
          updatedAt: now()
        })
      }

      // 刷新数据
      await loadAllTasks()

      return newTodo
    } catch (err) {
      console.error('快速添加任务失败:', err)
      throw err
    }
  }

  // 更新任务
  const updateTask = async (taskId: string, updates: Partial<TodoItem>) => {
    try {
      const db = await getDB()

      const moduleDataList = await db.module_data.find({
        selector: { moduleId: 'todo' }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const index = data.todos.findIndex(t => t.id === taskId)
          if (index !== -1) {
            data.todos[index] = { ...data.todos[index], ...updates }
            await doc.patch({ data: { todos: data.todos } })
            await loadAllTasks()
            return true
          }
        }
      }

      return false
    } catch (err) {
      console.error('更新任务失败:', err)
      throw err
    }
  }

  // 切换任务完成状态
  const toggleTask = async (taskId: string) => {
    const task = allTasks.value.find(t => t.id === taskId)
    if (!task) return false

    return updateTask(taskId, { completed: !task.completed })
  }

  // 删除任务
  const deleteTask = async (taskId: string) => {
    try {
      const db = await getDB()

      const moduleDataList = await db.module_data.find({
        selector: { moduleId: 'todo' }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const index = data.todos.findIndex(t => t.id === taskId)
          if (index !== -1) {
            // 同时删除子任务
            const toDelete = new Set([taskId])
            const findChildren = (parentId: string) => {
              data.todos.forEach(t => {
                if (t.parentId === parentId) {
                  toDelete.add(t.id)
                  findChildren(t.id)
                }
              })
            }
            findChildren(taskId)

            data.todos = data.todos.filter(t => !toDelete.has(t.id))
            await doc.patch({ data: { todos: data.todos } })
            await loadAllTasks()
            return true
          }
        }
      }

      return false
    } catch (err) {
      console.error('删除任务失败:', err)
      throw err
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    viewMode,
    groupBy,
    sortBy,
    filters,
    viewTasks,
    groupedTasks,
    stats,
    loadAllTasks,
    quickAdd,
    updateTask,
    toggleTask,
    deleteTask,
    subscribeChanges,
    unsubscribeChanges
  }
}
