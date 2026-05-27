import { getDB, generateId, now } from '~/services/db'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  dueDate?: string
  typeId?: string
  priority?: 'none' | 'low' | 'medium' | 'high'
  parentId?: string
  noteId?: string
}

export interface TaskWithType extends TodoItem {
  noteTitle?: string
  typeName?: string
  typeIcon?: string
  typeColor?: string
}

export function useTodos() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 加载指定日期范围内的待办任务
  const loadTodosByDateRange = async (startDate: string, endDate: string): Promise<Record<string, TaskWithType[]>> => {
    try {
      loading.value = true
      error.value = null

      const db = await getDB()
      const tasksByDate: Record<string, TaskWithType[]> = {}

      // 加载待办类型
      const typeDocs = await db.todo_types.find().exec()
      const todoTypes = typeDocs.map(doc => doc.toJSON())

      // 加载所有待办任务
      const moduleDataList = await db.module_data.find({
        selector: {
          moduleId: 'todo'
        }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          for (const todo of data.todos) {
            // 只处理有截止日期的任务
            const taskDate = todo.dueDate || todo.createdAt.slice(0, 10)

            // 检查是否在指定范围内
            if (taskDate >= startDate && taskDate <= endDate) {
              if (!tasksByDate[taskDate]) {
                tasksByDate[taskDate] = []
              }

              let taskWithType: TaskWithType = { ...todo }

              // 添加类型信息
              if (todo.typeId) {
                const type = todoTypes.find(t => t.id === todo.typeId)
                if (type) {
                  taskWithType.typeName = type.name
                  taskWithType.typeIcon = type.icon
                  taskWithType.typeColor = type.color
                }
              }

              // 添加笔记标题
              if (todo.noteId) {
                const note = await db.notes.findOne(todo.noteId).exec()
                if (note) {
                  taskWithType.noteTitle = note.get('title')
                }
              }

              tasksByDate[taskDate].push(taskWithType)
            }
          }
        }
      }

      // 排序任务
      for (const date in tasksByDate) {
        tasksByDate[date].sort((a, b) => {
          // 先按完成状态排序
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1
          }
          // 再按优先级排序
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 }
          const priorityA = priorityOrder[a.priority || 'none']
          const priorityB = priorityOrder[b.priority || 'none']
          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }
          // 最后按创建时间排序
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
      }

      return tasksByDate
    } catch (err) {
      console.error('加载待办任务失败:', err)
      error.value = '加载待办任务失败'
      return {}
    } finally {
      loading.value = false
    }
  }

  // 创建新任务
  const createTodo = async (todo: Omit<TodoItem, 'id' | 'createdAt'>): Promise<TodoItem | null> => {
    try {
      const db = await getDB()

      // 查找或创建目标笔记
      const notes = await db.notes.find().exec()
      let targetNote = notes[0]

      if (!targetNote) {
        const noteId = generateId()
        await db.notes.insert({
          id: noteId,
          title: '待办任务',
          content: '',
          createdAt: now(),
          updatedAt: now()
        })
        targetNote = await db.notes.findOne(noteId).exec()
      }

      if (!targetNote) {
        throw new Error('无法找到或创建目标笔记')
      }

      const newTodo: TodoItem = {
        ...todo,
        id: generateId(),
        createdAt: now(),
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
        data.todos.push(newTodo)
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

      return newTodo
    } catch (err) {
      console.error('创建待办任务失败:', err)
      error.value = '创建待办任务失败'
      return null
    }
  }

  // 更新任务
  const updateTodo = async (todoId: string, updates: Partial<TodoItem>): Promise<boolean> => {
    try {
      const db = await getDB()

      const moduleDataList = await db.module_data.find({
        selector: {
          moduleId: 'todo'
        }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const todoIndex = data.todos.findIndex(t => t.id === todoId)
          if (todoIndex !== -1) {
            data.todos[todoIndex] = { ...data.todos[todoIndex], ...updates }
            await doc.patch({ data: { todos: data.todos } })
            return true
          }
        }
      }

      return false
    } catch (err) {
      console.error('更新待办任务失败:', err)
      error.value = '更新待办任务失败'
      return false
    }
  }

  // 切换任务完成状态
  const toggleTodo = async (todoId: string): Promise<boolean> => {
    try {
      const db = await getDB()

      const moduleDataList = await db.module_data.find({
        selector: {
          moduleId: 'todo'
        }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const todoIndex = data.todos.findIndex(t => t.id === todoId)
          if (todoIndex !== -1) {
            data.todos[todoIndex].completed = !data.todos[todoIndex].completed
            await doc.patch({ data: { todos: data.todos } })
            return data.todos[todoIndex].completed
          }
        }
      }

      return false
    } catch (err) {
      console.error('切换任务状态失败:', err)
      error.value = '切换任务状态失败'
      return false
    }
  }

  // 删除任务
  const deleteTodo = async (todoId: string): Promise<boolean> => {
    try {
      const db = await getDB()

      const moduleDataList = await db.module_data.find({
        selector: {
          moduleId: 'todo'
        }
      }).exec()

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] }
        if (data.todos) {
          const todoIndex = data.todos.findIndex(t => t.id === todoId)
          if (todoIndex !== -1) {
            data.todos.splice(todoIndex, 1)
            await doc.patch({ data: { todos: data.todos } })
            return true
          }
        }
      }

      return false
    } catch (err) {
      console.error('删除待办任务失败:', err)
      error.value = '删除待办任务失败'
      return false
    }
  }

  // 获取今日任务统计
  const getTodayStats = async (): Promise<{ total: number; completed: number; pending: number }> => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const tasks = await loadTodosByDateRange(today, today)
      const todayTasks = tasks[today] || []

      return {
        total: todayTasks.length,
        completed: todayTasks.filter(t => t.completed).length,
        pending: todayTasks.filter(t => !t.completed).length
      }
    } catch (err) {
      console.error('获取今日任务统计失败:', err)
      return { total: 0, completed: 0, pending: 0 }
    }
  }

  // 获取本周任务统计
  const getWeekStats = async (): Promise<{ total: number; completed: number; pending: number }> => {
    try {
      const today = new Date()
      const dayOfWeek = today.getDay() || 7
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - dayOfWeek + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const startDate = weekStart.toISOString().slice(0, 10)
      const endDate = weekEnd.toISOString().slice(0, 10)

      const tasks = await loadTodosByDateRange(startDate, endDate)
      let total = 0, completed = 0, pending = 0

      for (const date in tasks) {
        total += tasks[date].length
        completed += tasks[date].filter(t => t.completed).length
        pending += tasks[date].filter(t => !t.completed).length
      }

      return { total, completed, pending }
    } catch (err) {
      console.error('获取本周任务统计失败:', err)
      return { total: 0, completed: 0, pending: 0 }
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    loadTodosByDateRange,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    getTodayStats,
    getWeekStats
  }
}