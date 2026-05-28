import { getDB, onCollectionChange } from '~/services/db'
import type { TodoItem } from '~/types/todo'

// 周视图颜色模式，内部使用
export type TodoColorMode = 'priority' | 'type' | 'status'

export interface WeekViewConfig {
  weekStart: Date
  timeStart: number // 默认 8
  timeEnd: number // 默认 23
  slotDuration: number // 30 (分钟)
  colorMode: TodoColorMode
}

export interface TimeSlot {
  hour: number
  minute: number
  label: string // "8:00", "8:30", ...
  value: number // 从 0 开始的索引
}

export interface GridTask extends TodoItem {
  columnIndex: number // 0-6 (周一到周日)
  startRow: number // 从时间轴顶部算起的行数（废弃，兼容性保留）
  rowSpan: number // 占据的行数（废弃，兼容性保留）
  startMinutes?: number // 开始时间的分钟数（从00:00算起）
  endMinutes?: number // 结束时间的分钟数（从00:00算起）
  leftOffset?: number // 重叠任务的左偏移百分比
  widthPercent?: number // 重叠任务的宽度百分比
  color: string // 任务显示颜色
  noteTitle?: string
  statusName?: string
  statusColor?: string
  typeName?: string
  typeColor?: string
}

export interface DayColumn {
  date: Date
  dateStr: string
  dayName: string
  dayNumber: number
  isToday: boolean
  allDayTasks: GridTask[]
  timedTasks: GridTask[]
}

export function useTodoWeekView(initialConfig?: Partial<WeekViewConfig>) {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 配置
  const config = reactive<WeekViewConfig>({
    weekStart: getMonday(new Date()),
    timeStart: initialConfig?.timeStart ?? 8,
    timeEnd: initialConfig?.timeEnd ?? 23,
    slotDuration: initialConfig?.slotDuration ?? 30,
    colorMode: initialConfig?.colorMode ?? 'priority'
  })

  // 原始任务数据
  const allTasks = ref<GridTask[]>([])

  // 笔记和类型缓存
  const notesCache = ref<Map<string, string>>(new Map())
  const statusesCache = ref<Map<string, { name: string; color: string; icon: string }>>(new Map())
  const typesCache = ref<Map<string, { name: string; color: string; icon: string }>>(new Map())

  // 变更订阅
  let unsubscribe: (() => void) | null = null

  // 订阅数据变更
  const subscribeChanges = () => {
    if (unsubscribe) return

    unsubscribe = onCollectionChange('module_data', () => {
      loadWeekTasks()
    })
  }

  const unsubscribeChanges = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // 获取本周一的日期
  function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  // 时间槽数组
  const timeSlots = computed<TimeSlot[]>(() => {
    const slots: TimeSlot[] = []
    const { timeStart, timeEnd, slotDuration } = config
    const slotsPerHour = 60 / slotDuration

    for (let h = timeStart; h < timeEnd; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        const hour = h
        const minute = m
        const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const value = (h - timeStart) * slotsPerHour + (m / slotDuration)
        slots.push({ hour, minute, label, value })
      }
    }

    return slots
  })

  // 格式化本地日期为 YYYY-MM-DD
  function formatDateLocal(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 从日期时间字符串中提取日期部分 (YYYY-MM-DD)
  function extractDatePart(dateStr: string): string {
    if (!dateStr) return ''
    // 如果包含 'T'，只取日期部分
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0]
    }
    // 如果是完整的 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    return dateStr.slice(0, 10)
  }

  // 本周日期数组
  const weekDays = computed(() => {
    const days = []
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const today = formatDateLocal(new Date())

    for (let i = 0; i < 7; i++) {
      const date = new Date(config.weekStart)
      date.setDate(date.getDate() + i)
      const dateStr = formatDateLocal(date)

      days.push({
        date: new Date(date),
        dateStr,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        isToday: dateStr === today,
        allDayTasks: [] as GridTask[],
        timedTasks: [] as GridTask[]
      })
    }

    return days
  })

  // 计算任务的颜色
  function getTaskColor(task: TodoItem): string {
    switch (config.colorMode) {
      case 'priority':
        const priorityColors = {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#22c55e',
          none: '#6b7280'
        }
        return priorityColors[task.priority || 'none']

      case 'type':
        if (task.typeId && typesCache.value.has(task.typeId)) {
          return typesCache.value.get(task.typeId)!.color
        }
        return '#6b7280'

      case 'status':
        if (task.statusId && statusesCache.value.has(task.statusId)) {
          return statusesCache.value.get(task.statusId)!.color
        }
        return '#6b7280'

      default:
        return '#6b7280'
    }
  }

  // 时间字符串转换为分钟数
  function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // 分钟数转换为时间槽索引
  function minutesToSlotIndex(minutes: number): number {
    const startMinutes = config.timeStart * 60
    const slotDuration = config.slotDuration
    return Math.floor((minutes - startMinutes) / slotDuration)
  }

  // 计算任务的网格位置
  function calculateTaskPosition(task: TodoItem, columnIndex: number): GridTask | null {
    const color = getTaskColor(task)

    // 从 startDate 和 dueDate 中提取时间
    // startDate 格式可能是 "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:mm:ss"
    const hasStartTime = task.startDate && task.startDate.includes('T')
    const hasEndTime = task.dueDate && task.dueDate.includes('T')

    // 全天任务或无时间任务
    if (!hasStartTime) {
      return {
        ...task,
        columnIndex,
        startRow: 0,
        rowSpan: 1,
        color
      }
    }

    // 从 startDate 中提取时间部分
    const startTimeStr = task.startDate!.split('T')[1]?.slice(0, 5) || '00:00'
    const taskStartMinutes = timeToMinutes(startTimeStr)

    // 从 dueDate 中提取时间部分，如果没有则使用开始时间 + 1小时
    let taskEndMinutes = taskStartMinutes + 60
    if (hasEndTime && task.dueDate) {
      const endTimeStr = task.dueDate.split('T')[1]?.slice(0, 5) || '00:00'
      taskEndMinutes = timeToMinutes(endTimeStr)
    }

    // 检查是否在时间范围内
    if (taskEndMinutes <= config.timeStart * 60 || taskStartMinutes >= config.timeEnd * 60) {
      return null
    }

    const startRow = minutesToSlotIndex(taskStartMinutes)
    const endRow = minutesToSlotIndex(taskEndMinutes)
    const rowSpan = Math.max(1, endRow - startRow)

    return {
      ...task,
      columnIndex,
      startRow,
      rowSpan,
      startMinutes: taskStartMinutes,
      endMinutes: taskEndMinutes,
      color
    }
  }

  // 处理重叠任务
  function handleOverlappingTasks(tasks: GridTask[]): GridTask[] {
    // 按开始时间分组（使用5分钟粒度分组）
    const groups: Record<number, GridTask[]> = {}

    for (const task of tasks) {
      // 检查是否有开始时间
      const hasStartTime = task.startDate && task.startDate.includes('T')
      if (!hasStartTime) continue
      // 使用 startMinutes 按5分钟粒度分组
      const key = task.startMinutes ? Math.floor(task.startMinutes / 5) : task.startRow
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    }

    // 为每组重叠任务计算位置
    for (const key in groups) {
      const group = groups[key]
      if (group.length <= 1) continue

      // 按结束时间排序
      group.sort((a, b) => {
        // 计算结束时间
        const getEndTime = (task: GridTask): number => {
          const hasEndTime = task.dueDate && task.dueDate.includes('T')
          if (hasEndTime && task.dueDate) {
            const endTimeStr = task.dueDate.split('T')[1]?.slice(0, 5) || '00:00'
            return timeToMinutes(endTimeStr)
          }
          // 使用开始时间 + 1小时
          const startTimeStr = task.startDate?.split('T')[1]?.slice(0, 5) || '00:00'
          return timeToMinutes(startTimeStr) + 60
        }
        return getEndTime(a) - getEndTime(b)
      })

      // 计算每个任务的偏移和宽度
      const count = group.length
      for (let i = 0; i < count; i++) {
        group[i].leftOffset = (i / count) * 100
        group[i].widthPercent = 100 / count
      }
    }

    return tasks
  }

  // 加载本周任务
  async function loadWeekTasks() {
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
      statusesCache.value.clear()
      for (const doc of statusDocs) {
        const status = doc.toJSON()
        statusesCache.value.set(status.id, {
          name: status.name,
          color: status.color,
          icon: status.icon
        })
      }

      const typeDocs = await db.todo_types.find().exec()
      typesCache.value.clear()
      for (const doc of typeDocs) {
        const type = doc.toJSON()
        typesCache.value.set(type.id, {
          name: type.name,
          color: type.color,
          icon: type.icon
        })
      }

      // 计算本周日期范围
      const weekEnd = new Date(config.weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const startIso = formatDateLocal(config.weekStart)
      const endIso = formatDateLocal(weekEnd)

      // 🐛 调试：输出本周日期范围
      console.log('[周视图] 本周范围:', { startIso, endIso })
      console.log('[周视图] 本周日期列:', weekDays.value.map(d => d.dateStr))

      // 加载模块数据
      const moduleDataList = await db.module_data.find({
        selector: { moduleId: 'todo' }
      }).exec()

      const tasks: GridTask[] = []

      for (const doc of moduleDataList) {
        const data = doc.get('data') as { todos: TodoItem[] } | undefined
        const noteId = doc.noteId

        if (data?.todos) {
          for (const todo of data.todos) {
            // 跳过子任务和已完成任务（可选）
            // if (todo.parentId || todo.completed) continue

            // 确定任务所属日期（只提取日期部分，不含时间）
            const rawDate = todo.dueDate || todo.createdAt
            const taskDate = extractDatePart(rawDate)

            // 检查是否在本周内
            if (taskDate >= startIso && taskDate < endIso) {
              const columnIndex = weekDays.value.findIndex(d => d.dateStr === taskDate)
              if (columnIndex === -1) {
                // 🐛 调试：输出日期未匹配的警告
                console.warn('[周视图] 日期未匹配:', { taskDate, text: todo.text, weekDates: weekDays.value.map(d => d.dateStr) })
                continue
              }

              const positioned = calculateTaskPosition(todo, columnIndex)
              if (positioned) {
                tasks.push({
                  ...positioned,
                  noteTitle: notesCache.value.get(noteId),
                  statusName: todo.statusId ? statusesCache.value.get(todo.statusId)?.name : undefined,
                  statusColor: todo.statusId ? statusesCache.value.get(todo.statusId)?.color : undefined,
                  typeName: todo.typeId ? typesCache.value.get(todo.typeId)?.name : undefined,
                  typeColor: todo.typeId ? typesCache.value.get(todo.typeId)?.color : undefined
                })
              }
            }
          }
        }
      }

      // 🐛 调试：输出加载的任务数量
      console.log('[周视图] 加载完成:', { 总任务数: tasks.length, 有时间任务: tasks.filter(t => t.startDate?.includes('T')).length })

      // 处理重叠任务
      allTasks.value = handleOverlappingTasks(tasks)
    } catch (err) {
      console.error('加载周任务失败:', err)
      error.value = '加载周任务失败'
    } finally {
      loading.value = false
    }
  }

  // 按日期分组的任务
  const weekColumns = computed<DayColumn[]>(() => {
    const columns = weekDays.value.map(day => ({
      ...day,
      allDayTasks: [] as GridTask[],
      timedTasks: [] as GridTask[]
    }))

    for (const task of allTasks.value) {
      if (task.columnIndex >= 0 && task.columnIndex < 7) {
        // 检查是否有时间信息
        const hasStartTime = task.startDate && task.startDate.includes('T')
        if (!hasStartTime) {
          columns[task.columnIndex].allDayTasks.push(task)
        } else {
          columns[task.columnIndex].timedTasks.push(task)
        }
      } else {
        console.warn('[周视图] 任务列索引越界:', { taskId: task.id, text: task.text, columnIndex: task.columnIndex })
      }
    }

    // 🐛 调试：输出每列的任务统计
    console.table(columns.map((col, i) => ({
      日期: col.dateStr,
      全天任务: col.allDayTasks.length,
      定时任务: col.timedTasks.length,
      总计: col.allDayTasks.length + col.timedTasks.length
    })))

    // 排序
    for (const col of columns) {
      col.allDayTasks.sort((a, b) => {
        const pa = { high: 0, medium: 1, low: 2, none: 3 }
        const pa_a = pa[a.priority || 'none']
        const pa_b = pa[b.priority || 'none']
        return pa_a - pa_b
      })

      col.timedTasks.sort((a, b) => {
        if (a.startRow !== b.startRow) return a.startRow - b.startRow
        return a.rowSpan - b.rowSpan
      })
    }

    return columns
  })

  // 周导航
  function prevWeek() {
    const newStart = new Date(config.weekStart)
    newStart.setDate(newStart.getDate() - 7)
    config.weekStart = newStart
  }

  function nextWeek() {
    const newStart = new Date(config.weekStart)
    newStart.setDate(newStart.getDate() + 7)
    config.weekStart = newStart
  }

  function goToToday() {
    config.weekStart = getMonday(new Date())
  }

  // 更新时间范围
  function updateTimeRange(start: number, end: number) {
    config.timeStart = Math.max(0, Math.min(23, start))
    config.timeEnd = Math.max(config.timeStart + 1, Math.min(24, end))
  }

  // 更新颜色模式
  function updateColorMode(mode: TodoColorMode) {
    config.colorMode = mode
    loadWeekTasks() // 重新加载以更新颜色
  }

  // 设置周起始日期
  function setWeekStart(date: Date) {
    config.weekStart = new Date(date)
  }

  // 统计信息
  const stats = computed(() => {
    return {
      total: allTasks.value.length,
      allDay: allTasks.value.filter(t => {
        const hasStartTime = t.startDate && t.startDate.includes('T')
        return !hasStartTime
      }).length,
      timed: allTasks.value.filter(t => {
        const hasStartTime = t.startDate && t.startDate.includes('T')
        return hasStartTime
      }).length,
      completed: allTasks.value.filter(t => t.completed).length
    }
  })

  // 🐛 调试：输出原始任务数据（用于排查问题）
  function debugRawTasks() {
    console.log('[周视图调试] 当前配置:', {
      weekStart: formatDateLocal(config.weekStart),
      timeStart: config.timeStart,
      timeEnd: config.timeEnd,
      slotDuration: config.slotDuration
    })
    console.log('[周视图调试] 本周日期:', weekDays.value.map(d => d.dateStr))
    console.log('[周视图调试] 所有任务:', allTasks.value.map(t => ({
      id: t.id,
      text: t.text,
      startDate: t.startDate,
      dueDate: t.dueDate,
      columnIndex: t.columnIndex,
      startRow: t.startRow,
      rowSpan: t.rowSpan
    })))
    console.log('[周视图调试] 按列分组:', weekColumns.value.map(col => ({
      date: col.dateStr,
      allDay: col.allDayTasks.map(t => t.text),
      timed: col.timedTasks.map(t => ({ text: t.text, startRow: t.startRow, rowSpan: t.rowSpan }))
    })))
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    config: readonly(config),
    timeSlots,
    weekDays,
    weekColumns,
    stats,
    loadWeekTasks,
    subscribeChanges,
    unsubscribeChanges,
    prevWeek,
    nextWeek,
    goToToday,
    setWeekStart,
    updateTimeRange,
    updateColorMode,
    debugRawTasks // 🐛 调试函数
  }
}
