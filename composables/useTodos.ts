import { getDB, generateId, now } from '~/services/db'
import type { TodoItem, TodoTreeNode } from '~/types/todo'

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

      // 确定目标笔记：优先使用用户指定的 noteId，否则查找或创建默认笔记
      let targetNoteId = todo.noteId

      if (!targetNoteId) {
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
          targetNoteId = noteId
        } else {
          targetNoteId = targetNote.get('id')
        }
      }

      if (!targetNoteId) {
        throw new Error('无法找到或创建目标笔记')
      }

      const newTodo: TodoItem = {
        ...todo,
        id: generateId(),
        createdAt: now(),
        noteId: targetNoteId
      }

      // 查找或创建模块数据
      const moduleData = await db.module_data.findOne({
        selector: {
          noteId: targetNoteId,
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
          noteId: targetNoteId,
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
      const today = formatDateLocal(new Date())
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

      const startDate = formatDateLocal(weekStart)
      const endDate = formatDateLocal(weekEnd)

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

  // ==================== 父子任务相关方法 ====================

  /**
   * 获取指定父任务的所有直接子任务
   */
  const getChildren = (todos: TodoItem[], parentId: string): TodoItem[] => {
    return todos.filter(t => t.parentId === parentId)
  }

  /**
   * 检查任务是否有子任务
   */
  const hasChildren = (todos: TodoItem[], id: string): boolean => {
    return todos.some(t => t.parentId === id)
  }

  /**
   * 获取任务的层级深度（用于缩进）
   */
  const getDepth = (todos: TodoItem[], id: string, depth = 0): number => {
    const todo = todos.find(t => t.id === id)
    if (!todo?.parentId) return depth
    return getDepth(todos, todo.parentId, depth + 1)
  }

  /**
   * 获取父任务的完成进度
   */
  const getTodoProgress = (todos: TodoItem[], parentId: string): { completed: number; total: number; text: string } => {
    const children = getChildren(todos, parentId)
    if (children.length === 0) return { completed: 0, total: 0, text: '' }
    const completed = children.filter(t => t.completed).length
    return { completed, total: children.length, text: `${completed}/${children.length}` }
  }

  /**
   * 递归更新子任务完成状态
   */
  const updateChildrenCompletion = (todos: TodoItem[], parentId: string, completed: boolean): TodoItem[] => {
    const result = [...todos]
    const updateRecursive = (todoId: string) => {
      const children = getChildren(result, todoId)
      children.forEach(child => {
        const index = result.findIndex(t => t.id === child.id)
        if (index !== -1) {
          result[index] = { ...result[index], completed }
        }
        if (hasChildren(result, child.id)) {
          updateRecursive(child.id)
        }
      })
    }
    updateRecursive(parentId)
    return result
  }

  /**
   * 递归检查并更新父任务完成状态（所有子任务完成时父任务也完成）
   */
  const updateParentCompletion = (todos: TodoItem[], parentId: string): TodoItem[] => {
    const result = [...todos]
    const updateRecursive = (currentParentId: string) => {
      const children = getChildren(result, currentParentId)
      const parentIndex = result.findIndex(t => t.id === currentParentId)

      if (parentIndex !== -1 && children.length > 0) {
        const allCompleted = children.every(t => t.completed)
        result[parentIndex] = { ...result[parentIndex], completed: allCompleted }

        // 继续向上检查
        const parent = result[parentIndex]
        if (parent.parentId) {
          updateRecursive(parent.parentId)
        }
      }
    }
    updateRecursive(parentId)
    return result
  }

  /**
   * 递归删除任务及其所有子任务
   */
  const deleteTodoRecursive = (todos: TodoItem[], todoId: string): TodoItem[] => {
    const result = [...todos]
    const idsToDelete = new Set<string>()

    const collectIds = (id: string) => {
      idsToDelete.add(id)
      const children = getChildren(result, id)
      children.forEach(child => collectIds(child.id))
    }

    collectIds(todoId)
    return result.filter(t => !idsToDelete.has(t.id))
  }

  /**
   * 构建树形结构的任务列表（用于扁平展示）
   */
  const buildTodoTree = (
    todos: TodoItem[],
    expandedParents?: Record<string, boolean>
  ): TodoTreeNode[] => {
    const parents = expandedParents ?? {}
    const result: TodoTreeNode[] = []

    // 获取根任务
    const rootTodos = todos
      .filter(t => !t.parentId)
      .sort((a, b) => {
        if (a.completed === b.completed) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return a.completed ? 1 : -1
      })

    const buildNode = (todo: TodoItem, level = 0): TodoTreeNode => {
      const children = getChildren(todos, todo.id)
      const node: TodoTreeNode = {
        ...todo,
        hasChildren: children.length > 0,
        level
      }

      return node
    }

    const traverse = (todo: TodoItem, level = 0) => {
      const node = buildNode(todo, level)
      result.push(node)

      // 如果展开或有子任务，递归添加子任务
      const children = getChildren(todos, todo.id)
      if (children.length > 0 && parents[todo.id] !== false) {
        children
          .sort((a, b) => {
            if (a.completed === b.completed) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
            return a.completed ? 1 : -1
          })
          .forEach(child => traverse(child, level + 1))
      }
    }

    rootTodos.forEach(todo => traverse(todo))
    return result
  }

  /**
   * 切换任务完成状态（支持父子任务联动）
   */
  const toggleTodoWithChildren = async (
    todos: TodoItem[],
    todoId: string,
    onSave: (todos: TodoItem[]) => Promise<void>
  ): Promise<TodoItem[]> => {
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return todos

    const newCompletedState = !todo.completed
    let result = [...todos]

    // 更新当前任务
    const index = result.findIndex(t => t.id === todoId)
    if (index !== -1) {
      result[index] = { ...result[index], completed: newCompletedState }
    }

    // 如果是父任务，同时更新所有子任务
    if (hasChildren(result, todoId)) {
      result = updateChildrenCompletion(result, todoId, newCompletedState)
    }

    // 如果是子任务，检查父任务是否应该被标记为完成
    if (todo.parentId) {
      result = updateParentCompletion(result, todo.parentId)
    }

    // 持久化
    await onSave(result)

    return result
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
    getWeekStats,
    // 父子任务方法
    getChildren,
    hasChildren,
    getDepth,
    getTodoProgress,
    updateChildrenCompletion,
    updateParentCompletion,
    deleteTodoRecursive,
    buildTodoTree,
    toggleTodoWithChildren
  }
}