/**
 * 目标进度追踪类型定义
 * 支持自定义时间范围和量化进度追踪
 */

/**
 * 目标状态
 */
export type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * 目标类型
 */
export type GoalType = 'short_term' | 'long_term' | 'habit' | 'project'

/**
 * 目标优先级
 */
export type GoalPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * 进度状态（基于实际进度vs期望进度）
 */
export type ProgressStatus = 'behind' | 'on_track' | 'ahead' | 'completed'

/**
 * 目标实体
 */
export interface Goal {
  id: string
  title: string
  description: string

  // 量化目标字段
  target: number              // 总目标量（如3000个俯卧撑）
  currentProgress: number     // 当前进度
  unit: string                // 单位（次、分钟、页、km等）

  // 时间范围字段
  startDate: string           // ISO 8601日期（如"2026-03-01"）
  endDate: string             // ISO 8601日期（如"2026-06-30"）

  // 原有字段（保持兼容性）
  status: GoalStatus
  type: GoalType
  priority: GoalPriority
  plannedStartAt: string      // 保留兼容性
  plannedEndAt: string        // 保留兼容性
  noteIds: string[]
  createdAt: string
  updatedAt: string
}

/**
 * 进度日志
 */
export interface ProgressLog {
  id: string
  goalId: string
  amount: number              // 本次进度增量
  date: string                // ISO 8601日期时间
  notes?: string              // 备注
  createdAt: string
}

/**
 * 进度统计信息
 */
export interface ProgressStatistics {
  current: number             // 当前进度
  target: number              // 总目标
  percentage: number          // 完成百分比 (0-100)

  // 时间相关
  totalDays: number           // 总天数
  elapsedDays: number         // 已过天数
  remainingDays: number       // 剩余天数

  // 期望进度
  expectedProgress: number    // 基于时间比例的期望进度
  progressStatus: ProgressStatus  // 进度状态（超前/正常/落后）

  // 每日平均值
  dailyAverageRequired: number // 每日需要完成量（基于剩余时间）
  dailyAverageActual: number   // 实际每日完成量
}

/**
 * 目标表单数据
 */
export interface GoalFormData {
  id?: string
  title: string
  description: string
  target: number
  currentProgress?: number
  unit: string
  startDate: string
  endDate: string
  status: GoalStatus
  type: GoalType
  priority: GoalPriority
  noteIds: string[]
}

/**
 * 进度记录表单数据
 */
export interface ProgressRecordFormData {
  goalId: string
  amount: number
  date: string                // ISO 8601日期时间
  notes?: string
}

/**
 * 日期范围信息
 */
export interface DateRangeInfo {
  startDate: string
  endDate: string
  totalDays: number
  totalMonths: number
  totalYears: number
}

/**
 * 目标筛选条件
 */
export interface GoalFilter {
  status?: GoalStatus
  type?: GoalType
  priority?: GoalPriority
  startDateBefore?: string    // 在某日期之前开始
  endDateAfter?: string       // 在某日期之后结束
  searchKeyword?: string      // 标题/描述关键词
}
