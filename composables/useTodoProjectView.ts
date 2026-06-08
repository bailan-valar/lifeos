import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Note } from '~/types/block'
import type { TodoItem, TodoWithMeta } from '~/types/todo'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'

// ==================== 类型定义 ====================

export interface WeekDate {
  date: Date
  dateStr: string // YYYY-MM-DD
  label: string  // 如 "6/1"
  isToday: boolean
}

export interface NoteWithLevel extends Note {
  level: number
  expanded: boolean
}

export interface CellTask {
  id: string
  text: string
  completed: boolean
  priority?: TodoItem['priority']
  statusId?: string
  statusName?: string
  statusColor?: string
  statusIcon?: string
  dueDate?: string
  noteId: string
}

export interface WeekRow {
  noteId: string
  title: string
  level: number
  expanded: boolean
  tasks: CellTask[] // 该笔记的所有待办
  cells: {
    [dateStr: string]: CellTask[] // 按日期分组的待办
  }
}

export interface ProjectViewConfig {
  weekStart: Date
}

// ==================== 工具函数 ====================

/**
 * 获取本周一的日期
 */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 生成一周的日期数组
 */
function generateWeekDates(weekStart: Date): WeekDate[] {
  const dates: WeekDate[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)
    const month = date.getMonth() + 1
    const day = date.getDate()

    dates.push({
      date,
      dateStr,
      label: `${month}/${day}`,
      isToday: date.getTime() === today.getTime()
    })
  }

  return dates
}

/**
 * 解析任务日期，返回日期部分 (YYYY-MM-DD)
 */
function parseTaskDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  // 如果已包含 T，取日期部分
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0]
  }
  return dateStr
}

// ==================== Composable ====================

export function useTodoProjectView(config?: Partial<ProjectViewConfig>) {
  // ==================== 状态 ====================
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 当前周的起始日期（默认为本周一）
  const weekStart = ref(config?.weekStart || getMonday(new Date()))

  // 笔记列表
  const notes = ref<Note[]>([])

  // 待办任务列表
  const tasks = ref<TodoWithMeta[]>([])

  // 展开的笔记ID集合
  const expandedNotes = ref<Set<string>>(new Set())

  // ==================== 计算属性 ====================

  // 一周的日期
  const weekDates = computed(() => generateWeekDates(weekStart.value))

  // 构建带层级的笔记列表（树形结构扁平化）
  const notesWithLevel = computed(() => {
    const result: NoteWithLevel[] = []

    function buildTree(parentId: string = '', level: number = 0): void {
      const children = notes.value.filter(n => n.parentId === parentId)
      for (const note of children) {
        const isExpanded = expandedNotes.value.has(note.id)
        result.push({
          ...note,
          level,
          expanded: isExpanded
        })
        // 递归处理子节点
        buildTree(note.id, level + 1)
      }
    }

    buildTree()
    return result
  })

  // 构建周视图行数据
  const weekRows = computed(() => {
    const rows: WeekRow[] = []

    // 构建笔记ID到展开状态的映射（用于快速查找祖先折叠状态）
    const noteExpandedMap = new Map<string, boolean>()
    for (const note of notesWithLevel.value) {
      noteExpandedMap.set(note.id, note.expanded)
    }

    // 检查笔记是否有被折叠的祖先笔记
    function hasCollapsedAncestor(noteId: string): boolean {
      const note = notes.value.find(n => n.id === noteId)
      if (!note || !note.parentId) return false

      const parentExpanded = noteExpandedMap.get(note.parentId)
      if (parentExpanded === false) return true

      return hasCollapsedAncestor(note.parentId)
    }

    for (const note of notesWithLevel.value) {
      // 如果有被折叠的祖先笔记，跳过（不显示）
      if (hasCollapsedAncestor(note.id)) continue

      // 获取该笔记的所有待办任务
      const noteTasks = tasks.value.filter(t => t.noteId === note.id)

      // 按日期分组任务
      const cells: Record<string, CellTask[]> = {}

      for (const date of weekDates.value) {
        // 找出在该日期有截止日期的任务
        const tasksForDate = noteTasks.filter(task => {
          const taskDate = parseTaskDate(task.dueDate || task.createdAt.slice(0, 10))
          return taskDate === date.dateStr
        })

        cells[date.dateStr] = tasksForDate
      }

      // 如果笔记有子笔记
      const hasChildren = notes.value.some(n => n.parentId === note.id)

      if (!note.expanded && hasChildren) {
        // 折叠且有子笔记，只显示笔记行本身
        rows.push({
          noteId: note.id,
          title: note.title || '未命名笔记',
          level: note.level,
          expanded: note.expanded,
          tasks: noteTasks,
          cells
        })
      } else if (note.expanded && hasChildren) {
        // 展开且有子笔记，聚合所有后代笔记的任务
        const descendantNoteIds = getDescendantNoteIds(note.id)
        const allTasks = tasks.value.filter(t =>
          descendantNoteIds.includes(t.noteId)
        )

        // 按日期汇总所有子笔记的任务
        const expandedCells: Record<string, CellTask[]> = {}
        for (const date of weekDates.value) {
          const tasksForDate = allTasks.filter(task => {
            const taskDate = parseTaskDate(task.dueDate || task.createdAt.slice(0, 10))
            return taskDate === date.dateStr
          })
          expandedCells[date.dateStr] = tasksForDate
        }

        rows.push({
          noteId: note.id,
          title: note.title || '未命名笔记',
          level: note.level,
          expanded: note.expanded,
          tasks: allTasks,
          cells: expandedCells
        })
      } else {
        // 叶子笔记（无子笔记），正常显示
        rows.push({
          noteId: note.id,
          title: note.title || '未命名笔记',
          level: note.level,
          expanded: note.expanded,
          tasks: noteTasks,
          cells
        })
      }
    }

    return rows
  })

  // ==================== 方法 ====================

  /**
   * 加载数据
   */
  async function loadData(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const db = await getDB()

      // 并行加载笔记和待办任务
      const [notesResult, moduleDataList, statusDocs] = await Promise.all([
        db.notes.find({ sort: [{ order: 'asc' }] }).exec(),
        db.module_data.find({ selector: { moduleId: 'todo' } }).exec(),
        db.todoStatuses.find().exec()
      ])

      notes.value = notesResult.map((doc: any) => doc.toJSON())

      const statuses = statusDocs.map((doc: any) => doc.toJSON())

      // 解析待办任务
      const allTasks: TodoWithMeta[] = []
      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] } | undefined
        if (data?.todos) {
          for (const todo of data.todos) {
            allTasks.push({
              ...todo,
              noteId: doc.noteId,
              statusName: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.name : undefined,
              statusColor: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.color : undefined,
              statusIcon: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.icon : undefined
            })
          }
        }
      }

      tasks.value = allTasks

      // 默认展开所有有任务的笔记
      const notesWithTasks = new Set(allTasks.map(t => t.noteId))
      for (const noteId of notesWithTasks) {
        expandNote(noteId)
      }
    } catch (err) {
      console.error('加载项目视图数据失败:', err)
      error.value = err instanceof Error ? err.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取笔记的所有后代笔记ID
   */
  function getDescendantNoteIds(noteId: string): string[] {
    const result: string[] = []
    const queue = [noteId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const children = notes.value.filter(n => n.parentId === current)
      for (const child of children) {
        result.push(child.id)
        queue.push(child.id)
      }
    }

    return result
  }

  /**
   * 切换笔记展开/折叠
   */
  function toggleNote(noteId: string): void {
    if (expandedNotes.value.has(noteId)) {
      expandedNotes.value.delete(noteId)
    } else {
      expandedNotes.value.add(noteId)
    }
    // 触发响应式更新
    expandedNotes.value = new Set(expandedNotes.value)
  }

  /**
   * 展开笔记
   */
  function expandNote(noteId: string): void {
    expandedNotes.value.add(noteId)
    expandedNotes.value = new Set(expandedNotes.value)
  }

  /**
   * 折叠笔记
   */
  function collapseNote(noteId: string): void {
    expandedNotes.value.delete(noteId)
    expandedNotes.value = new Set(expandedNotes.value)
  }

  /**
   * 展开所有笔记
   */
  function expandAll(): void {
    for (const note of notes.value) {
      expandedNotes.value.add(note.id)
    }
    expandedNotes.value = new Set(expandedNotes.value)
  }

  /**
   * 折叠所有笔记
   */
  function collapseAll(): void {
    expandedNotes.value.clear()
    expandedNotes.value = new Set(expandedNotes.value)
  }

  /**
   * 切换到上一周
   */
  function prevWeek(): void {
    const newStart = new Date(weekStart.value)
    newStart.setDate(newStart.getDate() - 7)
    weekStart.value = newStart
  }

  /**
   * 切换到下一周
   */
  function nextWeek(): void {
    const newStart = new Date(weekStart.value)
    newStart.setDate(newStart.getDate() + 7)
    weekStart.value = newStart
  }

  /**
   * 跳转到今天所在周
   */
  function goToToday(): void {
    weekStart.value = getMonday(new Date())
  }

  // ==================== 订阅变更 ====================
  let unsubscribes: (() => void)[] = []

  function subscribeChanges(): void {
    unsubscribes = [
      onCollectionChange('notes', () => loadData()),
      onCollectionChange('module_data', () => loadData())
    ]
  }

  function unsubscribeChanges(): void {
    unsubscribes.forEach(unsub => unsub())
    unsubscribes = []
  }

  return {
    // 状态
    loading,
    error,
    weekStart,
    weekDates,
    notesWithLevel,
    weekRows,
    expandedNotes,

    // 方法
    loadData,
    toggleNote,
    expandNote,
    collapseNote,
    expandAll,
    collapseAll,
    prevWeek,
    nextWeek,
    goToToday,
    subscribeChanges,
    unsubscribeChanges
  }
}
