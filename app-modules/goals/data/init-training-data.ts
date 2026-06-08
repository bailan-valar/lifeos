/**
 * 学习板块初始化数据
 *
 * 从 training-data.json 加载预设的学习方案
 */

import type { LearningGoal, LearningStage, LearningSession } from '~/types/goal'

export interface TrainingData {
  meta: {
    title: string
    version: string
    generated: string
    description: string
    totalSessions: number
    totalFlashcards: number
  }
  dimensions: Array<{
    id: string
    name: string
    color: string
    fullDetail: boolean
    sessions: number
    description: string
  }>
  training: {
    [key: string]: {
      name: string
      intro: string
      totalSessions: number
      stages: Array<{
        name: string
        weeks: string
        description?: string
        meta?: string
        topics?: string[]
        sessions: Array<{
          no: number
          title: string
          learn: string
          practice: string
        }>
      }>
    }
  }
  flashcards: Array<{
    dimension: string
    question: string
    answer: string
  }>
}

/**
 * 从训练数据创建学习目标
 */
export async function createGoalFromTrainingData(
  dimensionId: string,
  createGoal: (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LearningGoal>,
  createStage: (stage: Omit<LearningStage, 'id' | 'createdAt'>) => Promise<LearningStage>,
  createSession: (session: Omit<LearningSession, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LearningSession>
): Promise<LearningGoal | null> {
  // 加载训练数据
  const trainingData = await loadTrainingData()
  if (!trainingData) return null

  const dimension = trainingData.dimensions.find((d) => d.id === dimensionId)
  if (!dimension) return null

  const training = trainingData.training[dimensionId]
  if (!training) return null

  // 创建目标
  const goal = await createGoal({
    title: `${dimension.name}训练计划`,
    dimension: dimensionId as any,
    description: training.intro,
    aiGenerated: false,
    totalStages: training.stages.length,
    estimatedWeeks: training.stages.length * 2,
    totalSessions: training.totalSessions,
    status: 'pending',
    completedSessions: 0
  })

  // 创建阶段和课程
  let sessionOrder = 1
  for (const stageData of training.stages) {
    const stage = await createStage({
      goalId: goal.id,
      stageNo: training.stages.indexOf(stageData) + 1,
      name: stageData.name,
      weeks: stageData.weeks,
      description: stageData.description || stageData.meta || '',
      totalSessions: stageData.sessions.length,
      completedSessions: 0,
      status: 'pending',
      order: training.stages.indexOf(stageData) + 1
    })

    // 创建课程
    for (const sessionData of stageData.sessions) {
      await createSession({
        goalId: goal.id,
        stageId: stage.id,
        sessionNo: sessionData.no,
        title: sessionData.title,
        learn: sessionData.learn,
        practice: sessionData.practice || '',
        completed: false,
        order: sessionOrder++
      })
    }
  }

  return goal
}

/**
 * 加载训练数据
 */
async function loadTrainingData(): Promise<TrainingData | null> {
  try {
    const data = await import('./training-data.json')
    return data.default as unknown as TrainingData
  } catch {
    return null
  }
}

/**
 * 获取可用的训练维度列表
 */
export async function getAvailableTrainingDimensions(): Promise<Array<{
  id: string
  name: string
  color: string
  description: string
  sessions: number
}>> {
  const data = await loadTrainingData()
  if (!data) return []

  return data.dimensions.map((d) => ({
    id: d.id,
    name: d.name,
    color: d.color,
    description: d.description,
    sessions: d.sessions
  }))
}

/**
 * 获取闪卡数据
 */
export async function getFlashcards(dimensionId?: string): Promise<Array<{
  dimension: string
  question: string
  answer: string
}>> {
  const data = await loadTrainingData()
  if (!data) return []

  const cards = data.flashcards
  if (dimensionId) {
    return cards.filter((c) => c.dimension === dimensionId)
  }
  return cards
}
