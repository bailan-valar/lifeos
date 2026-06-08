import { ref, computed } from 'vue'
import type { CellTask } from './useTodoProjectView'
import type { TodoItem } from '~/types/todo'
import { getDB, generateId, now } from '~/services/db'

// ==================== 类型定义 ====================

export interface DragState {
  isDragging: boolean
  dragType: 'task' | 'note' | null
  dragData: CellTask | NoteDragData | null
  sourceDate: string | null
  sourceNoteId: string | null
}

export interface NoteDragData {
  noteId: string
  title: string
  level: number
}

export interface DropTarget {
  dateStr: string
  noteId: string
}

export interface DragDropOptions {
  onTaskDrop?: (taskId: string, targetNoteId: string, targetDate: string) => Promise<void>
  onNoteDrop?: (noteId: string, targetParentId: string | null, targetIndex: number) => Promise<void>
}

// ==================== Composable ====================

export function useDragDrop(options?: DragDropOptions) {
  // ==================== 状态 ====================
  const dragState = ref<DragState>({
    isDragging: false,
    dragType: null,
    dragData: null,
    sourceDate: null,
    sourceNoteId: null
  })

  const dropTarget = ref<DropTarget | null>(null)

  // ==================== 计算属性 ====================
  const isDragging = computed(() => dragState.value.isDragging)
  const dragType = computed(() => dragState.value.dragType)
  const canDrop = computed(() => {
    if (!isDragging.value || !dropTarget.value) return false
    return true
  })

  // ==================== 任务拖拽方法 ====================

  /**
   * 开始拖拽任务
   */
  function startDragTask(
    task: CellTask,
    sourceDate: string,
    sourceNoteId: string,
    event: DragEvent
  ) {
    event.stopPropagation()

    dragState.value = {
      isDragging: true,
      dragType: 'task',
      dragData: task,
      sourceDate,
      sourceNoteId
    }

    // 设置拖拽数据
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'task',
        taskId: task.id,
        sourceDate,
        sourceNoteId
      }))

      // 创建自定义拖拽图像
      const dragImage = createDragImage(task.text)
      event.dataTransfer.setDragImage(dragImage, 0, 0)
    }
  }

  /**
   * 处理任务拖拽进入目标区域
   */
  function onTaskDragOver(dateStr: string, noteId: string, event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (dragState.value.dragType !== 'task') return

    dropTarget.value = { dateStr, noteId }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  /**
   * 处理任务拖拽离开
   */
  function onTaskDragLeave(event: DragEvent) {
    // 只在真正离开拖拽区域时清除目标
    const relatedTarget = event.relatedTarget as HTMLElement
    const currentTarget = event.currentTarget as HTMLElement

    if (relatedTarget && !currentTarget.contains(relatedTarget)) {
      dropTarget.value = null
    }
  }

  /**
   * 处理任务放置
   */
  async function onTaskDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (!dragState.value.isDragging || dragState.value.dragType !== 'task') {
      return
    }

    const task = dragState.value.dragData as CellTask
    const target = dropTarget.value

    if (!task || !target || !options?.onTaskDrop) {
      resetDragState()
      return
    }

    try {
      // 检查是否是同一位置
      if (
        dragState.value.sourceNoteId === target.noteId &&
        dragState.value.sourceDate === target.dateStr
      ) {
        resetDragState()
        return
      }

      // 调用回调处理实际的数据更新
      await options.onTaskDrop(task.id, target.noteId, target.dateStr)
    } catch (err) {
      console.error('拖拽任务失败:', err)
    } finally {
      resetDragState()
    }
  }

  // ==================== 笔记拖拽方法 ====================

  /**
   * 开始拖拽笔记
   */
  function startDragNote(note: NoteDragData, event: DragEvent) {
    event.stopPropagation()

    dragState.value = {
      isDragging: true,
      dragType: 'note',
      dragData: note,
      sourceDate: null,
      sourceNoteId: note.noteId
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'note',
        noteId: note.noteId
      }))

      const dragImage = createDragImage(note.title, 'note')
      event.dataTransfer.setDragImage(dragImage, 0, 0)
    }
  }

  /**
   * 处理笔记拖拽进入目标区域
   */
  function onNoteDragOver(targetParentId: string | null, targetIndex: number, event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (dragState.value.dragType !== 'note') return

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  /**
   * 处理笔记放置
   */
  async function onNoteDrop(targetParentId: string | null, targetIndex: number, event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (!dragState.value.isDragging || dragState.value.dragType !== 'note') {
      return
    }

    const note = dragState.value.dragData as NoteDragData

    if (!note || !options?.onNoteDrop) {
      resetDragState()
      return
    }

    try {
      // 调用回调处理实际的数据更新
      await options.onNoteDrop(note.noteId, targetParentId, targetIndex)
    } catch (err) {
      console.error('拖拽笔记失败:', err)
    } finally {
      resetDragState()
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 重置拖拽状态
   */
  function resetDragState() {
    dragState.value = {
      isDragging: false,
      dragType: null,
      dragData: null,
      sourceDate: null,
      sourceNoteId: null
    }
    dropTarget.value = null
  }

  /**
   * 创建拖拽图像
   */
  function createDragImage(text: string, type: 'task' | 'note' = 'task'): HTMLElement {
    const element = document.createElement('div')
    element.className = `drag-preview drag-preview-${type}`
    element.textContent = text.length > 20 ? text.slice(0, 20) + '...' : text

    // 添加到 DOM 以获取尺寸
    element.style.position = 'absolute'
    element.style.top = '-9999px'
    element.style.left = '-9999px'
    document.body.appendChild(element)

    // 从 DOM 移除（浏览器会创建快照）
    setTimeout(() => {
      document.body.removeChild(element)
    }, 0)

    return element
  }

  /**
   * 更新待办任务的日期
   */
  async function updateTaskDate(
    taskId: string,
    targetNoteId: string,
    targetDate: string
  ): Promise<void> {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === taskId)
        if (index !== -1) {
          // 找到任务，更新日期和笔记ID
          data.todos[index].dueDate = targetDate
          data.todos[index].startDate = targetDate
          // 如果目标笔记不同，也需要更新 noteId
          if (doc.noteId !== targetNoteId) {
            // 从原笔记移除
            data.todos.splice(index, 1)
            await doc.patch({ data: { todos: data.todos } })

            // 添加到目标笔记
            let targetModuleData = await db.module_data.findOne({
              selector: { noteId: targetNoteId, moduleId: 'todo' }
            }).exec()

            if (targetModuleData) {
              const targetData = targetModuleData.get('data') as { todos: TodoItem[] } | undefined
              if (targetData?.todos) {
                targetData.todos.push(data.todos[index])
                await targetModuleData.patch({ data: { todos: targetData.todos } })
              } else {
                await targetModuleData.patch({ data: { todos: [data.todos[index]] } })
              }
            } else {
              await db.module_data.insert({
                id: generateId(),
                noteId: targetNoteId,
                moduleId: 'todo',
                data: { todos: [data.todos[index]] },
                createdAt: now(),
                updatedAt: now()
              })
            }
          } else {
            // 同一笔记，只更新日期
            await doc.patch({ data: { todos: data.todos } })
          }
          return
        }
      }
    }
  }

  /**
   * 更新笔记的父级和排序
   */
  async function updateNoteParent(
    noteId: string,
    targetParentId: string | null,
    targetIndex: number
  ): Promise<void> {
    const db = await getDB()
    const noteDoc = await db.notes.findOne(noteId).exec()

    if (!noteDoc) return

    // 获取目标父级的子笔记
    const siblings = await db.notes.find({
      selector: { parentId: targetParentId || { $exists: false } },
      sort: [{ order: 'asc' }]
    }).exec()

    // 计算新的 order 值
    let newOrder: number
    if (targetIndex >= siblings.length) {
      // 放到最后
      const lastSibling = siblings[siblings.length - 1]
      newOrder = lastSibling ? (lastSibling.order || 0) + 1 : 0
    } else if (targetIndex === 0) {
      // 放到最前
      newOrder = (siblings[0]?.order || 0) - 1
    } else {
      // 放在中间
      const before = siblings[targetIndex - 1]
      const after = siblings[targetIndex]
      newOrder = ((before?.order || 0) + (after?.order || 1)) / 2
    }

    // 更新笔记
    await noteDoc.patch({
      parentId: targetParentId || undefined,
      order: newOrder
    })
  }

  return {
    // 状态
    dragState,
    dropTarget,
    isDragging,
    dragType,
    canDrop,

    // 任务拖拽
    startDragTask,
    onTaskDragOver,
    onTaskDragLeave,
    onTaskDrop,

    // 笔记拖拽
    startDragNote,
    onNoteDragOver,
    onNoteDrop,

    // 工具
    resetDragState
  }
}
