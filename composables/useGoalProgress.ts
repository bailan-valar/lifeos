/**
 * 目标进度追踪核心业务逻辑
 * 支持自定义时间范围和智能进度计算
 */
import type { Goal, ProgressLog, ProgressStatistics, GoalFormData, ProgressRecordFormData, GoalFilter } from '~/types/goal'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { add, sub, mul, div, round } from '~/utils/decimal'

/**
 * 目标进度追踪 Composable
 */
export function useGoalProgress() {
  const goals = ref<Goal[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * 加载所有目标
   */
  async function loadGoals(filter?: GoalFilter): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = {}

      if (filter?.status) {
        selector.status = filter.status
      }
      if (filter?.type) {
        selector.type = filter.type
      }
      if (filter?.priority) {
        selector.priority = filter.priority
      }
      if (filter?.startDateBefore) {
        selector.startDate = { $lte: filter.startDateBefore }
      }
      if (filter?.endDateAfter) {
        selector.endDate = { $gte: filter.endDateAfter }
      }

      const result = await db.goals.find({
        selector,
        sort: [{ createdAt: 'desc' }]
      }).exec()

      goals.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      console.error('[useGoalProgress] Failed to load goals:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建或更新目标
   */
  async function upsertGoal(data: GoalFormData): Promise<Goal> {
    const db = await getDB()
    const isEditing = !!data.id

    if (isEditing && data.id) {
      // 更新现有目标
      const doc = await db.goals.findOne(data.id).exec()
      if (!doc) {
        throw new Error(`Goal not found: ${data.id}`)
      }

      const updated = {
        ...data,
        target: data.target || 0,
        currentProgress: data.currentProgress || 0,
        startDate: data.startDate || now(),
        endDate: data.endDate || now(),
        updatedAt: now()
      }

      await doc.patch(updated)
      goals.value = goals.value.map(g => g.id === data.id ? { ...g, ...updated } : g)
      return goals.value.find(g => g.id === data.id)!
    } else {
      // 创建新目标
      const newGoal: Goal = {
        id: generateId(),
        title: data.title,
        description: data.description,
        target: data.target,
        currentProgress: data.currentProgress || 0,
        unit: data.unit,
        startDate: data.startDate || now(),
        endDate: data.endDate || now(),
        status: data.status || 'pending',
        type: data.type || 'short_term',
        priority: data.priority || 'medium',
        plannedStartAt: data.startDate || now(), // 保留兼容性
        plannedEndAt: data.endDate || now(), // 保留兼容性
        noteIds: data.noteIds || [],
        createdAt: now(),
        updatedAt: now()
      }

      await db.goals.insert(newGoal)
      goals.value.unshift(newGoal)
      return newGoal
    }
  }

  /**
   * 删除目标
   */
  async function deleteGoal(goalId: string): Promise<void> {
    const db = await getDB()
    const doc = await db.goals.findOne(goalId).exec()
    if (!doc) {
      throw new Error(`Goal not found: ${goalId}`)
    }

    // 删除目标及其所有进度日志
    const logs = await db.goal_progress_logs.find({ selector: { goalId } }).exec()
    await Promise.all(logs.map((d: any) => d.remove()))

    await doc.remove()
    goals.value = goals.value.filter(g => g.id !== goalId)
  }

  /**
   * 记录进度
   */
  async function recordProgress(data: ProgressRecordFormData): Promise<ProgressLog> {
    const db = await getDB()

    // 更新目标的当前进度
    const goalDoc = await db.goals.findOne(data.goalId).exec()
    if (!goalDoc) {
      throw new Error(`Goal not found: ${data.goalId}`)
    }

    const goal = goalDoc.toJSON() as Goal
    const newProgress = add(goal.currentProgress, data.amount)

    // 如果已完成，自动更新状态
    const isCompleted = newProgress >= goal.target
    const patchData: Record<string, any> = {
      currentProgress: newProgress,
      updatedAt: now()
    }
    if (isCompleted && goal.status !== 'completed') {
      patchData.status = 'completed'
    }

    await goalDoc.patch(patchData)

    // 创建进度日志
    const log: ProgressLog = {
      id: generateId(),
      goalId: data.goalId,
      amount: data.amount,
      date: data.date || now(),
      notes: data.notes,
      createdAt: now()
    }

    await db.goal_progress_logs.insert(log)

    // 更新本地缓存
    goals.value = goals.value.map(g => {
      if (g.id === data.goalId) {
        return { ...g, currentProgress: newProgress, status: patchData.status || g.status, updatedAt: now() }
      }
      return g
    })

    return log
  }

  /**
   * 获取目标的进度统计信息
   */
  function calculateProgressStatistics(goal: Goal): ProgressStatistics {
    const today = new Date()

    // 处理无效日期
    const startValid = isValidDate(goal.startDate)
    const endValid = isValidDate(goal.endDate)

    // 时间相关计算
    const totalDays = startValid && endValid ? getDayDiff(goal.startDate, goal.endDate) : 0
    const elapsedDays = startValid ? getDayDiff(goal.startDate, today) : 0
    const remainingDays = endValid ? getDayDiff(today, goal.endDate) : 0

    // 处理无效数值
    const target = typeof goal.target === 'number' && !isNaN(goal.target) ? goal.target : 0
    const currentProgress = typeof goal.currentProgress === 'number' && !isNaN(goal.currentProgress) ? goal.currentProgress : 0

    // 进度百分比
    const percentage = target > 0 ? round(mul(div(currentProgress, target), 100), 10) : 0

    // 期望进度（基于时间比例）
    const timeProgressRatio = totalDays > 0 ? Math.max(0, Math.min(1, div(elapsedDays, totalDays))) : 0
    const expectedProgress = mul(target, timeProgressRatio)

    // 进度状态
    let progressStatus: 'behind' | 'on_track' | 'ahead' | 'completed'
    if (percentage >= 100) {
      progressStatus = 'completed'
    } else if (!startValid || !endValid || totalDays <= 0) {
      progressStatus = 'on_track'
    } else if (currentProgress < mul(expectedProgress, 0.9)) {
      progressStatus = 'behind'
    } else if (currentProgress > mul(expectedProgress, 1.1)) {
      progressStatus = 'ahead'
    } else {
      progressStatus = 'on_track'
    }

    // 每日平均值
    const dailyAverageRequired = remainingDays > 0 ? round(div(sub(target, currentProgress), remainingDays), 10) : 0
    const dailyAverageActual = elapsedDays > 0 ? round(div(currentProgress, elapsedDays), 10) : 0

    return {
      current: goal.currentProgress,
      target: goal.target,
      percentage,
      totalDays,
      elapsedDays: Math.max(0, elapsedDays),
      remainingDays: Math.max(0, remainingDays),
      expectedProgress,
      progressStatus,
      dailyAverageRequired,
      dailyAverageActual
    }
  }

  /**
   * 获取目标的进度历史
   */
  async function getProgressHistory(goalId: string): Promise<ProgressLog[]> {
    const db = await getDB()
    const result = await db.goal_progress_logs.find({
      selector: { goalId }
    }).exec()

    return result.map((doc: any) => doc.toJSON()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  /**
   * 监听数据变化
   */
  function onGoalsChange(callback: () => void): () => void {
    return onCollectionChange('goals', callback)
  }

  function onProgressLogsChange(callback: () => void): () => void {
    return onCollectionChange('goal_progress_logs', callback)
  }

  return {
    // 状态
    goals,
    loading,
    error,

    // CRUD操作
    loadGoals,
    upsertGoal,
    deleteGoal,
    recordProgress,

    // 计算方法
    calculateProgressStatistics,
    getProgressHistory,

    // 监听器
    onGoalsChange,
    onProgressLogsChange
  }
}

/**
 * 验证日期是否有效
 */
function isValidDate(date: string | Date | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return !isNaN(d.getTime())
}

/**
 * 计算两个日期之间的天数差异
 */
function getDayDiff(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 验证日期范围
 */
export function validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: '日期格式无效' }
  }

  if (start >= end) {
    return { valid: false, error: '开始日期必须早于结束日期' }
  }

  return { valid: true }
}

/**
 * 格式化日期显示
 */
export function formatDate(date: string | Date | undefined, format: 'short' | 'long' = 'short'): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  if (format === 'short') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
