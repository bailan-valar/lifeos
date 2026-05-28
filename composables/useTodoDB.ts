import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import type { TodoItem, TodoStatus, TodoType } from '~/types/todo'

export interface TodoWithNoteId extends TodoItem {
  noteId: string
}

export interface LoadAllResult {
  notes: Array<{ id: string; title: string }>
  statuses: TodoStatus[]
  types: TodoType[]
  tasks: TodoWithNoteId[]
}

class TodoDBAccess {
  /**
   * 加载所有待办相关数据
   */
  async loadAllTasks(): Promise<LoadAllResult> {
    const db = await getDB()

    // 并行加载所有数据
    const [notes, statusDocs, typeDocs, moduleDataList] = await Promise.all([
      db.notes.find().exec(),
      db.todoStatuses.find().exec(),
      db.todo_types.find().exec(),
      db.module_data.find({ selector: { moduleId: 'todo' } }).exec()
    ])

    const tasks: TodoWithNoteId[] = []

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] } | undefined
      if (data?.todos) {
        for (const todo of data.todos) {
          tasks.push({
            ...todo,
            noteId: doc.noteId
          })
        }
      }
    }

    return {
      notes: notes.map(n => ({ id: n.id, title: n.title || '未命名笔记' })),
      statuses: statusDocs.map(d => d.toJSON()) as TodoStatus[],
      types: typeDocs.map(d => d.toJSON()) as TodoType[],
      tasks
    }
  }

  /**
   * 创建新任务
   */
  async createTodo(text: string, options?: {
    dueDate?: string
    priority?: TodoItem['priority']
    typeId?: string
    statusId?: string
  }): Promise<TodoWithNoteId | null> {
    const db = await getDB()

    // 查找或创建默认笔记
    let notes = await db.notes.find({
      selector: { title: '待办任务' }
    }).exec()

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
      const created = await db.notes.findOne(noteId).exec()
      if (!created) {
        throw new Error('无法创建目标笔记')
      }
      targetNote = created
    }

    if (!targetNote) {
      throw new Error('无法找到或创建目标笔记')
    }

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

    const moduleData = await db.module_data.findOne({
      selector: {
        noteId: targetNote.get('id'),
        moduleId: 'todo'
      }
    }).exec()

    if (moduleData) {
      const data = moduleData.get('data') as { todos: TodoItem[] }
      data.todos.unshift(newTodo)
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

    return {
      ...newTodo,
      noteId: targetNote.get('id')
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<TodoItem>): Promise<boolean> {
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
          return true
        }
      }
    }

    return false
  }

  /**
   * 删除任务（包括子任务）
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const db = await getDB()

    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data.todos) {
        const index = data.todos.findIndex(t => t.id === taskId)
        if (index !== -1) {
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
          return true
        }
      }
    }

    return false
  }

  /**
   * 订阅 module_data 变更
   */
  subscribeChanges(callback: () => void): () => void {
    return onCollectionChange('module_data', callback)
  }
}

// 导出单例
export const todoDB = new TodoDBAccess()

// 保留 composable 风格的导出（向后兼容）
export function useTodoDB() {
  return todoDB
}
