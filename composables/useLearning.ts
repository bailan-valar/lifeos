/**
 * 学习板块 Composable
 *
 * 提供学习目标、阶段、课程的 CRUD 操作和 AI 拆分功能
 */

import { ref, computed, shallowRef } from 'vue'
import type {
  LearningGoal,
  LearningStage,
  LearningSession,
  LearningProgress,
  LearningDimension,
  AISplitRequest,
  AISplitResponse,
  LearningGoalStatus
} from '~/types/goal'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { splitLearningGoal, setAnthropicApiKey, hasApiKey, LEARNING_DIMENSIONS } from '~/services/learningSplitter'

/**
 * 学习目标管理
 */
export function useLearningGoals() {
  const goals = shallowRef<LearningGoal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchGoals() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const docs = await db.learning_goals
        .find({
          selector: {},
          sort: [{ createdAt: 'desc' }]
        })
        .exec()

      goals.value = docs.map((d) => d.toJSON() as LearningGoal)
    } catch (e: any) {
      error.value = e.message
      console.error('[useLearningGoals] fetch failed:', e)
    } finally {
      loading.value = false
    }
  }

  async function createGoal(goal: Omit<LearningGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningGoal> {
    const db = await getDB()
    const newGoal: LearningGoal = {
      ...goal,
      id: generateId(),
      createdAt: now(),
      updatedAt: now()
    }

    await db.learning_goals.insert(newGoal)
    await fetchGoals()
    return newGoal
  }

  async function updateGoal(id: string, updates: Partial<LearningGoal>): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_goals.findOne(id).exec()

    if (!doc) {
      throw new Error(`Learning goal ${id} not found`)
    }

    await doc.patch({
      ...updates,
      updatedAt: now()
    })

    await fetchGoals()
  }

  async function deleteGoal(id: string): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_goals.findOne(id).exec()

    if (!doc) return

    // 删除关联的阶段和课程
    const stages = await db.learning_stages.find({ selector: { goalId: id } }).exec()
    for (const stage of stages) {
      await stage.remove()
      // 删除课程
      const sessions = await db.learning_sessions.find({ selector: { stageId: stage.id } }).exec()
      for (const session of sessions) {
        await session.remove()
      }
    }

    await doc.remove()
    await fetchGoals()
  }

  async function getGoalById(id: string): Promise<LearningGoal | null> {
    const db = await getDB()
    const doc = await db.learning_goals.findOne(id).exec()
    return doc ? (doc.toJSON() as LearningGoal) : null
  }

  // 按状态筛选
  const goalsByStatus = computed(() => (status: LearningGoalStatus) => {
    return goals.value.filter((g) => g.status === status)
  })

  // 按维度筛选
  const goalsByDimension = computed(() => (dimension: LearningDimension) => {
    return goals.value.filter((g) => g.dimension === dimension)
  })

  // 进行中的目标
  const inProgressGoals = computed(() => {
    return goals.value.filter((g) => g.status === 'in_progress')
  })

  // 订阅变更
  if (import.meta.client) {
    onCollectionChange('learning_goals', fetchGoals)
  }

  // 初始加载
  fetchGoals()

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalById,
    goalsByStatus,
    goalsByDimension,
    inProgressGoals
  }
}

/**
 * 学习阶段管理
 */
export function useLearningStages(goalId?: string) {
  const stages = shallowRef<LearningStage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStages(goalId?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector = goalId ? { goalId } : {}
      const docs = await db.learning_stages
        .find({
          selector,
          sort: [{ goalId: 'asc' }, { order: 'asc' }]
        })
        .exec()

      stages.value = docs.map((d) => d.toJSON() as LearningStage)
    } catch (e: any) {
      error.value = e.message
      console.error('[useLearningStages] fetch failed:', e)
    } finally {
      loading.value = false
    }
  }

  async function createStage(stage: Omit<LearningStage, 'id' | 'createdAt'>): Promise<LearningStage> {
    const db = await getDB()
    const newStage: LearningStage = {
      ...stage,
      id: generateId(),
      createdAt: now()
    }

    await db.learning_stages.insert(newStage)

    if (stage.goalId) {
      await fetchStages(stage.goalId)
    } else {
      await fetchStages()
    }

    return newStage
  }

  async function updateStage(id: string, updates: Partial<LearningStage>): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_stages.findOne(id).exec()

    if (!doc) {
      throw new Error(`Learning stage ${id} not found`)
    }

    await doc.patch(updates)

    const stage = doc.toJSON() as LearningStage
    if (stage.goalId) {
      await fetchStages(stage.goalId)
    } else {
      await fetchStages()
    }
  }

  async function deleteStage(id: string): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_stages.findOne(id).exec()

    if (!doc) return

    const stage = doc.toJSON() as LearningStage

    // 删除关联的课程
    const sessions = await db.learning_sessions.find({ selector: { stageId: id } }).exec()
    for (const session of sessions) {
      await session.remove()
    }

    await doc.remove()

    if (stage.goalId) {
      await fetchStages(stage.goalId)
    } else {
      await fetchStages()
    }
  }

  // 按目标筛选
  const stagesByGoal = computed(() => (goalId: string) => {
    return stages.value.filter((s) => s.goalId === goalId)
  })

  // 订阅变更
  if (import.meta.client) {
    onCollectionChange('learning_stages', () => fetchStages(goalId))
  }

  // 初始加载
  fetchStages(goalId)

  return {
    stages,
    loading,
    error,
    fetchStages,
    createStage,
    updateStage,
    deleteStage,
    stagesByGoal
  }
}

/**
 * 学习课程单元管理
 */
export function useLearningSessions(stageId?: string) {
  const sessions = shallowRef<LearningSession[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSessions(stageId?: string) {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector = stageId ? { stageId } : {}
      const docs = await db.learning_sessions
        .find({
          selector,
          sort: [{ stageId: 'asc' }, { order: 'asc' }]
        })
        .exec()

      sessions.value = docs.map((d) => d.toJSON() as LearningSession)
    } catch (e: any) {
      error.value = e.message
      console.error('[useLearningSessions] fetch failed:', e)
    } finally {
      loading.value = false
    }
  }

  async function createSession(session: Omit<LearningSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningSession> {
    const db = await getDB()
    const newSession: LearningSession = {
      ...session,
      id: generateId(),
      createdAt: now(),
      updatedAt: now()
    }

    await db.learning_sessions.insert(newSession)

    if (session.stageId) {
      await fetchSessions(session.stageId)
    } else {
      await fetchSessions()
    }

    return newSession
  }

  async function updateSession(id: string, updates: Partial<LearningSession>): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_sessions.findOne(id).exec()

    if (!doc) {
      throw new Error(`Learning session ${id} not found`)
    }

    await doc.patch({
      ...updates,
      updatedAt: now()
    })

    const session = doc.toJSON() as LearningSession
    if (session.stageId) {
      await fetchSessions(session.stageId)
    } else {
      await fetchSessions()
    }
  }

  async function deleteSession(id: string): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_sessions.findOne(id).exec()

    if (!doc) return

    const session = doc.toJSON() as LearningSession
    await doc.remove()

    if (session.stageId) {
      await fetchSessions(session.stageId)
    } else {
      await fetchSessions()
    }
  }

  async function toggleSessionComplete(id: string): Promise<void> {
    const db = await getDB()
    const doc = await db.learning_sessions.findOne(id).exec()

    if (!doc) {
      throw new Error(`Learning session ${id} not found`)
    }

    const session = doc.toJSON() as LearningSession
    const newCompleted = !session.completed

    await doc.patch({
      completed: newCompleted,
      completedAt: newCompleted ? now() : undefined,
      updatedAt: now()
    })

    if (session.stageId) {
      await fetchSessions(session.stageId)
    } else {
      await fetchSessions()
    }

    // 更新阶段和目标的完成计数
    await updateProgressAfterSessionChange(session.goalId, session.stageId, newCompleted ? 1 : -1)
  }

  /**
   * 课程完成后更新阶段和目标的进度
   */
  async function updateProgressAfterSessionChange(goalId: string, stageId: string, delta: number) {
    const db = await getDB()

    // 更新阶段完成数
    const stageDoc = await db.learning_stages.findOne(stageId).exec()
    if (stageDoc) {
      const stage = stageDoc.toJSON() as LearningStage
      await stageDoc.patch({
        completedSessions: Math.max(0, stage.completedSessions + delta)
      })
    }

    // 更新目标完成数
    const goalDoc = await db.learning_goals.findOne(goalId).exec()
    if (goalDoc) {
      const goal = goalDoc.toJSON() as LearningGoal
      await goalDoc.patch({
        completedSessions: Math.max(0, goal.completedSessions + delta)
      })
    }
  }

  // 按阶段筛选
  const sessionsByStage = computed(() => (stageId: string) => {
    return sessions.value.filter((s) => s.stageId === stageId)
  })

  // 按目标筛选
  const sessionsByGoal = computed(() => (goalId: string) => {
    return sessions.value.filter((s) => s.goalId === goalId)
  })

  // 已完成的课程
  const completedSessions = computed(() => {
    return sessions.value.filter((s) => s.completed)
  })

  // 订阅变更
  if (import.meta.client) {
    onCollectionChange('learning_sessions', () => fetchSessions(stageId))
  }

  // 初始加载
  fetchSessions(stageId)

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    toggleSessionComplete,
    sessionsByStage,
    sessionsByGoal,
    completedSessions
  }
}

/**
 * AI 拆分功能
 */
export function useAISplit() {
  const splitting = ref(false)
  const error = ref<string | null>(null)

  /**
   * 执行 AI 拆分
   */
  async function splitGoal(request: AISplitRequest, usePreset = true): Promise<AISplitResponse> {
    splitting.value = true
    error.value = null

    try {
      // 先尝试使用预设模板
      if (usePreset) {
        const preset = await import('~/services/learningSplitter').then((m) =>
          m.getPresetSplit(request.title)
        )
        if (preset) {
          return preset
        }
      }

      // 调用 AI API
      const result = await splitLearningGoal(request)
      return result
    } catch (e: any) {
      error.value = e.message
      console.error('[useAISplit] split failed:', e)
      throw e
    } finally {
      splitting.value = false
    }
  }

  /**
   * 创建完整的学习目标（包含阶段和课程）
   */
  async function createLearningGoalFromSplit(request: AISplitRequest): Promise<LearningGoal> {
    const splitResult = await splitGoal(request)

    // 创建目标
    const { createGoal } = useLearningGoals()
    const goal = await createGoal(splitResult.goal)

    // 创建阶段和课程
    const { createStage } = useLearningStages()
    const { createSession } = useLearningSessions()

    // 先创建所有阶段
    const stageMap = new Map<number, string>() // order -> stageId
    for (const stageData of splitResult.stages) {
      const stage = await createStage({
        ...stageData,
        goalId: goal.id
      })
      stageMap.set(stageData.order, stage.id)
    }

    // 创建课程，通过 order 关联到对应阶段
    for (const sessionData of splitResult.sessions) {
      // 根据课程的 order 确定所属阶段
      // 假设课程 order 连续，前8个属于阶段1，接下来的8个属于阶段2，等
      const sessionOrder = sessionData.order
      let stageOrder = 1

      if (sessionOrder > 24) stageOrder = 4
      else if (sessionOrder > 16) stageOrder = 3
      else if (sessionOrder > 8) stageOrder = 2

      const stageId = stageMap.get(stageOrder)
      if (stageId) {
        await createSession({
          ...sessionData,
          goalId: goal.id,
          stageId
        })
      }
    }

    return goal
  }

  return {
    splitting,
    error,
    splitGoal,
    createLearningGoalFromSplit
  }
}

/**
 * 学习进度统计
 */
export function useLearningProgress(goalId: string) {
  const progress = ref({
    totalSessions: 0,
    completedSessions: 0,
    percentage: 0,
    currentStage: null as LearningStage | null,
    stagesCompleted: 0,
    totalStages: 0
  })

  const { fetchSessions, sessionsByGoal } = useLearningSessions()
  const { fetchStages, stagesByGoal } = useLearningStages()

  async function calculateProgress() {
    await Promise.all([fetchSessions(), fetchStages()])

    const sessions = sessionsByGoal.value(goalId)
    const stages = stagesByGoal.value(goalId)

    const completed = sessions.filter((s) => s.completed).length
    const total = sessions.length

    // 找到当前进行中的阶段
    const currentStage = stages.find((s) => s.status === 'in_progress') || stages[0] || null
    const stagesCompleted = stages.filter((s) => s.status === 'completed').length

    progress.value = {
      totalSessions: total,
      completedSessions: completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      currentStage,
      stagesCompleted,
      totalStages: stages.length
    }
  }

  // 订阅变更
  if (import.meta.client) {
    onCollectionChange('learning_sessions', calculateProgress)
    onCollectionChange('learning_stages', calculateProgress)
  }

  // 初始计算
  calculateProgress()

  return {
    progress,
    calculateProgress
  }
}

/**
 * API Key 管理
 */
export function useLearningApiKey() {
  const configured = ref(false)

  function checkApiKey() {
    configured.value = hasApiKey()
  }

  function setApiKey(key: string) {
    setAnthropicApiKey(key)
    configured.value = !!key
  }

  // 初始检查
  if (import.meta.client) {
    checkApiKey()
  }

  return {
    configured,
    setApiKey,
    checkApiKey
  }
}

// 导出维度配置
export { LEARNING_DIMENSIONS }
