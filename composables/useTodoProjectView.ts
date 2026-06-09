import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Note, Class, NoteClassBinding } from '~/types/block'
import type { TodoItem, TodoWithMeta } from '~/types/todo'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { ICONS } from '~/composables/useIcons'

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
  typeId?: string
  statusId?: string
  statusName?: string
  statusColor?: string
  statusIcon?: string
  statusIsCompleted?: boolean  // 状态是否标记为完成状态
  startDate?: string
  dueDate?: string
  createdAt?: string
  noteId: string
  isUndated?: boolean  // 是否为无日期待办
}

/**
 * 任务布局信息，用于在周视图中定位任务
 */
export interface TaskLayout {
  task: CellTask
  colIndex: number      // 起始列索引 (0-7)，0-6 为日期列，7 为无日期列
  colSpan: number       // 跨越的列数 (1-7)
  rowIndex: number      // 行索引 (1+)，用于同一列多个任务的堆叠
  isMultiDay: boolean   // 是否跨天任务
}

export interface WeekRow {
  noteId: string
  title: string
  level: number
  expanded: boolean
  taskLayouts: TaskLayout[]  // 该笔记的所有任务布局信息
  collapsedCount?: {
    [dateStr: string]: number // 折叠时，每天子笔记的待办合计数
  }
  noteClass?: Class // 笔记类
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
    // 使用本地时间而非 UTC 时间，避免时区偏差
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

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

/**
 * 检查任务是否在指定日期范围内（包含跨天待办）
 * @param task - 待办任务
 * @param targetDate - 目标日期 (YYYY-MM-DD)
 * @returns 是否应该在该日期显示
 */
function isTaskInRange(task: TodoWithMeta, targetDate: string): boolean {
  const dueDate = parseTaskDate(task.dueDate)
  const startDate = parseTaskDate(task.startDate)

  // 如果没有截止日期，不显示
  if (!dueDate) return false

  // 如果没有开始日期或开始日期等于截止日期（单日任务），直接比较截止日期
  if (!startDate || startDate === dueDate) {
    return dueDate === targetDate
  }

  // 跨天任务：检查目标日期是否在 [startDate, dueDate] 范围内
  return targetDate >= startDate && targetDate <= dueDate
}

/**
 * 计算任务在本周视图中的布局信息
 * @param task - 待办任务
 * @param weekDates - 本周的日期数组
 * @returns 任务布局信息，如果任务不在本周显示则返回 null
 */
function calculateTaskLayout(
  task: TodoWithMeta,
  weekDates: WeekDate[]
): TaskLayout | null {
  const dueDate = parseTaskDate(task.dueDate)
  const startDate = parseTaskDate(task.startDate)

  // 如果没有截止日期，放在无日期列（索引 7）
  if (!dueDate) {
    return {
      task: {
        id: task.id,
        text: task.text,
        completed: task.completed,
        priority: task.priority,
        typeId: task.typeId,
        statusId: task.statusId,
        statusName: task.statusName,
        statusColor: task.statusColor,
        statusIcon: task.statusIcon,
        statusIsCompleted: task.statusIsCompleted,
        startDate: task.startDate,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        noteId: task.noteId,
        isUndated: true
      },
      colIndex: 7,  // 无日期列在最后
      colSpan: 1,
      isMultiDay: false
    }
  }

  // 计算任务在本周中的显示范围
  let startIdx = -1
  let endIdx = -1
  const isMultiDay: boolean = !!startDate && startDate !== dueDate

  // 找到开始日期在本周的位置
  const displayStart = startDate || dueDate
  const displayEnd = dueDate

  for (let i = 0; i < weekDates.length; i++) {
    const dateStr = weekDates[i].dateStr
    if (startIdx === -1 && dateStr >= displayStart) {
      startIdx = i
    }
    if (dateStr <= displayEnd) {
      endIdx = i
    }
  }

  // 如果任务不在本周范围内，不显示
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    return null
  }

  // 计算跨越的列数
  const colSpan = endIdx - startIdx + 1

  return {
    task: {
      id: task.id,
      text: task.text,
      completed: task.completed,
      priority: task.priority,
      typeId: task.typeId,
      statusId: task.statusId,
      statusName: task.statusName,
      statusColor: task.statusColor,
      statusIcon: task.statusIcon,
      statusIsCompleted: task.statusIsCompleted,
      startDate: task.startDate,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      noteId: task.noteId,
      isUndated: false
    },
    colIndex: startIdx,
    colSpan,
    isMultiDay
  }
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

  // 笔记类列表
  const classes = ref<Class[]>([])

  // 笔记与类的绑定
  const noteBindings = ref<NoteClassBinding[]>([])

  // 展开的笔记ID集合
  const expandedNotes = ref<Set<string>>(new Set())

  // 聚焦的笔记ID（null 表示不聚焦，显示所有笔记）
  const focusedNoteId = ref<string | null>(null)

  // ==================== 计算属性 ====================

  // 一周的日期
  const weekDates = computed(() => generateWeekDates(weekStart.value))

  // 面包屑导航：从根笔记到聚焦笔记的路径
  const focusBreadcrumbs = computed(() => {
    if (!focusedNoteId.value) return []

    const crumbs: Note[] = []
    let currentId = focusedNoteId.value

    while (currentId) {
      const note = notes.value.find(n => n.id === currentId)
      if (!note) break

      crumbs.unshift(note) // 添加到开头，保持从根到子的顺序
      currentId = note.parentId || ''
    }

    return crumbs
  })

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

    // 聚焦模式下，只显示聚焦笔记及其子笔记
    const visibleNoteIds = focusedNoteId.value
      ? new Set([focusedNoteId.value, ...getDescendantNoteIds(focusedNoteId.value)])
      : null

    // 构建笔记ID到展开状态的映射（用于快速查找祖先折叠状态）
    const noteExpandedMap = new Map<string, boolean>()
    for (const note of notesWithLevel.value) {
      noteExpandedMap.set(note.id, note.expanded)
    }

    // 构建笔记ID到类的映射
    const noteClassMap = new Map<string, Class>()
    for (const binding of noteBindings.value) {
      const cls = classes.value.find(c => c.id === binding.classId)
      if (cls) {
        noteClassMap.set(binding.noteId, cls)
      }
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
      // 聚焦模式：如果不是聚焦笔记或其子笔记，跳过
      if (visibleNoteIds && !visibleNoteIds.has(note.id)) continue

      // 如果有被折叠的祖先笔记，跳过（不显示）
      if (hasCollapsedAncestor(note.id)) continue

      // 获取该笔记的所有待办任务
      const noteTasks = tasks.value.filter(t => t.noteId === note.id)

      // 计算每个任务的布局信息
      const taskLayouts: TaskLayout[] = []

      // 记录每列当前已使用的最大行数（用于堆叠同一列的多个任务）
      const columnRowCounts = new Map<string, number>()

      // 先处理未完成的任务，再处理已完成的任务（确保已完成任务排在每列最后）
      const pendingTasks: TodoWithMeta[] = []
      const completedTasks: TodoWithMeta[] = []

      for (const task of noteTasks) {
        if (task.completed || task.statusIsCompleted) {
          completedTasks.push(task)
        } else {
          pendingTasks.push(task)
        }
      }

      // 处理未完成的任务
      for (const task of pendingTasks) {
        const layout = calculateTaskLayout(task, weekDates.value)
        if (layout) {
          // 计算该任务应该在的行位置
          // 检查任务跨越的所有列，找出最大行数
          let maxRowCount = 0
          for (let i = layout.colIndex; i < layout.colIndex + layout.colSpan; i++) {
            const key = `col-${i}`
            const count = columnRowCounts.get(key) || 0
            maxRowCount = Math.max(maxRowCount, count)
          }

          // 行索引 = 最大行数 + 1（Grid 行从 1 开始）
          const rowIndex = maxRowCount + 1
          layout.rowIndex = rowIndex

          // 更新所有跨越列的行数
          for (let i = layout.colIndex; i < layout.colIndex + layout.colSpan; i++) {
            const key = `col-${i}`
            columnRowCounts.set(key, rowIndex)
          }

          taskLayouts.push(layout)
        }
      }

      // 处理已完成的任务（会排在每列最后）
      for (const task of completedTasks) {
        const layout = calculateTaskLayout(task, weekDates.value)
        if (layout) {
          // 计算该任务应该在的行位置
          // 检查任务跨越的所有列，找出最大行数
          let maxRowCount = 0
          for (let i = layout.colIndex; i < layout.colIndex + layout.colSpan; i++) {
            const key = `col-${i}`
            const count = columnRowCounts.get(key) || 0
            maxRowCount = Math.max(maxRowCount, count)
          }

          // 行索引 = 最大行数 + 1（Grid 行从 1 开始）
          const rowIndex = maxRowCount + 1
          layout.rowIndex = rowIndex

          // 更新所有跨越列的行数
          for (let i = layout.colIndex; i < layout.colIndex + layout.colSpan; i++) {
            const key = `col-${i}`
            columnRowCounts.set(key, rowIndex)
          }

          taskLayouts.push(layout)
        }
      }

      // 按列索引排序，确保渲染顺序正确
      taskLayouts.sort((a, b) => a.colIndex - b.colIndex)

      // 如果笔记有子笔记
      const hasChildren = notes.value.some(n => n.parentId === note.id)

      if (!note.expanded && hasChildren) {
        // 折叠且有子笔记，计算子笔记的合计数
        const descendantNoteIds = getDescendantNoteIds(note.id)
        const allDescendantTasks = tasks.value.filter(t =>
          descendantNoteIds.includes(t.noteId)
        )

        // 计算每天子笔记的待办合计数（不包含该笔记自己的待办）
        const collapsedCount: Record<string, number> = {}
        for (const date of weekDates.value) {
          const count = allDescendantTasks.filter(task =>
            isTaskInRange(task, date.dateStr)
          ).length
          collapsedCount[date.dateStr] = count
        }
        // 添加无日期待办的计数
        const undatedCount = allDescendantTasks.filter(task => !task.dueDate).length
        if (undatedCount > 0) {
          collapsedCount['undated'] = undatedCount
        }

        rows.push({
          noteId: note.id,
          title: note.title || '未命名笔记',
          level: note.level,
          expanded: note.expanded,
          taskLayouts, // 只显示该笔记自己的任务
          collapsedCount, // 子笔记的合计数
          noteClass: noteClassMap.get(note.id)
        })
      } else {
        // 展开状态或叶子笔记，正常显示
        rows.push({
          noteId: note.id,
          title: note.title || '未命名笔记',
          level: note.level,
          expanded: note.expanded,
          taskLayouts,
          noteClass: noteClassMap.get(note.id)
        })
      }
    }

    return rows
  })

  // ==================== 方法 ====================

  /**
   * 加载数据
   * @param silent - 静默模式，不显示 loading 状态（用于拖拽等本地操作）
   */
  async function loadData(silent = false): Promise<void> {
    if (!silent) {
      loading.value = true
    }
    error.value = null

    try {
      const db = await getDB()

      // 并行加载笔记、待办任务和笔记类数据
      const [notesResult, moduleDataList, statusDocs, classesResult, bindingsResult] = await Promise.all([
        db.notes.find({ sort: [{ order: 'asc' }] }).exec(),
        db.module_data.find({ selector: { moduleId: 'todo' } }).exec(),
        db.todoStatuses.find().exec(),
        db.classes.find({ sort: [{ order: 'asc' }] }).exec(),
        db.noteClassBindings.find().exec()
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
              id: todo.id,
              text: todo.text,
              completed: todo.completed,
              createdAt: todo.createdAt,
              typeId: todo.typeId,
              priority: todo.priority,
              startDate: todo.startDate,
              dueDate: todo.dueDate,
              statusId: todo.statusId,
              parentId: todo.parentId,
              noteId: doc.noteId,
              statusName: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.name : undefined,
              statusColor: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.color : undefined,
              statusIcon: (todo.statusId ? statuses.find(s => s.id === todo.statusId)?.icon : undefined) ?? ICONS.round,
              statusIsCompleted: todo.statusId ? statuses.find(s => s.id === todo.statusId)?.isCompleted : undefined
            })
          }
        }
      }

      tasks.value = allTasks

      // 处理笔记类数据
      classes.value = classesResult.map((doc: any) => doc.toJSON())
      noteBindings.value = bindingsResult.map((doc: any) => doc.toJSON())

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

  /**
   * 聚焦到指定笔记
   */
  function focusNote(noteId: string): void {
    focusedNoteId.value = noteId
    // 聚焦时自动展开该笔记
    expandNote(noteId)
  }

  /**
   * 清除聚焦
   */
  function clearFocus(): void {
    focusedNoteId.value = null
  }

  // ==================== 订阅变更 ====================
  let unsubscribes: (() => void)[] = []

  function subscribeChanges(): void {
    unsubscribes = [
      onCollectionChange('notes', () => loadData(true)),
      onCollectionChange('module_data', () => loadData(true)),
      onCollectionChange('classes', () => loadData(true)),
      onCollectionChange('noteClassBindings', () => loadData(true))
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
    focusedNoteId,
    focusBreadcrumbs,

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
    focusNote,
    clearFocus,
    subscribeChanges,
    unsubscribeChanges
  }
}
