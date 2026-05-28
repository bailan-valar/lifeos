import type { TodoItem, TodoTreeNode } from '~/types/todo'

/**
 * 待办树形结构管理 Composable
 * 提供纯函数工具方法，不涉及数据库操作
 * 适用于模块组件内部的内存操作
 */
export function useTodoTree() {
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
   * @returns { completed, total, text } 如 { completed: 2, total: 5, text: '2/5' }
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
    const idsToDelete = new Set<string>()

    const collectIds = (id: string) => {
      idsToDelete.add(id)
      const children = getChildren(todos, id)
      children.forEach(child => collectIds(child.id))
    }

    collectIds(todoId)
    return todos.filter(t => !idsToDelete.has(t.id))
  }

  /**
   * 清除已完成的根任务及其子任务
   */
  const clearCompleted = (todos: TodoItem[]): TodoItem[] => {
    const result = [...todos]
    const completedRootIds = result
      .filter(t => t.completed && !t.parentId)
      .map(t => t.id)

    completedRootIds.forEach(id => {
      const cleared = deleteTodoRecursive(result, id)
      result.length = 0
      result.push(...cleared)
    })

    return result
  }

  /**
   * 构建树形结构的任务列表（用于扁平展示）
   * @param expandedParents 控制哪些父任务是展开的
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

    const traverse = (todo: TodoItem, level = 0) => {
      const children = getChildren(todos, todo.id)
      const node: TodoTreeNode = {
        ...todo,
        hasChildren: children.length > 0,
        level
      }
      result.push(node)

      // 如果展开或有子任务，递归添加子任务
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
  const toggleTodoWithChildren = (todos: TodoItem[], todoId: string): TodoItem[] => {
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

    return result
  }

  /**
   * 创建新任务
   */
  const createTodo = (todos: TodoItem[], text: string, parentId?: string, statusId?: string): TodoItem[] => {
    const newTodo: TodoItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      parentId,
      statusId
    }
    return [...todos, newTodo]
  }

  /**
   * 更新任务
   */
  const updateTodo = (todos: TodoItem[], todoId: string, updates: Partial<TodoItem>): TodoItem[] => {
    const index = todos.findIndex(t => t.id === todoId)
    if (index === -1) return todos
    const result = [...todos]
    result[index] = { ...result[index], ...updates }
    return result
  }

  return {
    getChildren,
    hasChildren,
    getDepth,
    getTodoProgress,
    updateChildrenCompletion,
    updateParentCompletion,
    deleteTodoRecursive,
    clearCompleted,
    buildTodoTree,
    toggleTodoWithChildren,
    createTodo,
    updateTodo
  }
}
