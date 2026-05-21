<template>
  <div class="goal-detail-view">
    <!-- 头部卡片 -->
    <div class="detail-header liquid-glass-card liquid-glass-shimmer">
      <button @click="goBack" class="liquid-glass-button back-btn">
        <Icon name="solar:alt-arrow-left-linear" />
      </button>
      <h1 class="title2">{{ goal?.title }}</h1>
      <button @click="openEdit" class="liquid-glass-button action-btn">
        <Icon name="solar:pen-linear" size="18" />
      </button>
    </div>

    <!-- 进度概览卡片 -->
    <div v-if="goal" class="progress-overview liquid-glass-card-thick">
      <div class="overview-stats">
        <div class="stat-item">
          <span class="stat-label caption1 liquid-text-secondary">目标</span>
          <span class="stat-value headline">{{ goal.target }} {{ goal.unit }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label caption1 liquid-text-secondary">已完成</span>
          <span class="stat-value headline">{{ goal.currentProgress }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label caption1 liquid-text-secondary">完成度</span>
          <span class="stat-value headline">{{ statistics.percentage.toFixed(0) }}%</span>
        </div>
      </div>

      <ProgressBar
        :current="goal.currentProgress"
        :target="goal.target"
        :unit="goal.unit"
        :statistics="statistics"
        size="large"
      />

      <!-- 时间信息 -->
      <div class="time-info">
        <div class="time-range">
          <Icon name="solar:calendar-linear" />
          <span class="body">{{ formatDate(goal.startDate, 'long') }} - {{ formatDate(goal.endDate, 'long') }}</span>
        </div>
        <div class="time-stats">
          <span class="caption2 liquid-text-secondary">
            已过 {{ statistics.elapsedDays }} 天 / 剩余 {{ statistics.remainingDays }} 天
          </span>
        </div>
      </div>

      <!-- 每日统计 -->
      <div class="daily-stats">
        <div class="daily-stat">
          <span class="stat-label caption2 liquid-text-secondary">每日需完成</span>
          <span class="stat-value subheadline">{{ statistics.dailyAverageRequired.toFixed(1) }} {{ goal.unit }}</span>
        </div>
        <div class="daily-stat">
          <span class="stat-label caption2 liquid-text-secondary">实际平均</span>
          <span class="stat-value subheadline">{{ statistics.dailyAverageActual.toFixed(1) }} {{ goal.unit }}</span>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <button
        @click="openProgressDialog"
        class="liquid-glass-button liquid-glass-button-primary action-card"
      >
        <Icon name="solar:add-circle-linear" size="20" />
        <span>记录进度</span>
      </button>
      <button
        @click="openEdit"
        class="liquid-glass-button action-card"
      >
        <Icon name="solar:pen-linear" size="20" />
        <span>编辑目标</span>
      </button>
    </div>

    <!-- 可视化图表 -->
    <div v-if="goal" class="charts-section">
      <div class="chart-card liquid-glass-card">
        <ProgressTrendChart
          :goal="goal"
          :progress-logs="progressLogs"
          :loading="loadingLogs"
        />
      </div>

      <div class="chart-card liquid-glass-card">
        <MonthlyProgressHeatmap
          :goal-id="goal.id"
          :progress-logs="progressLogs"
          :loading="loadingLogs"
        />
      </div>
    </div>

    <!-- 进度历史时间线 -->
    <div class="timeline-section liquid-glass-card">
      <div class="section-header">
        <h3 class="headline">进度记录</h3>
        <span class="caption1 liquid-text-secondary">{{ progressLogs.length }} 条记录</span>
      </div>

      <div v-if="loadingLogs" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="progressLogs.length === 0" class="empty-state">
        <Icon name="solar:document-linear" size="32" class="empty-icon" />
        <p class="body liquid-text-secondary">暂无进度记录</p>
      </div>

      <div v-else class="timeline-list">
        <div
          v-for="log in progressLogs"
          :key="log.id"
          class="timeline-item liquid-glass-list-item"
        >
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="log-header">
              <span class="log-amount headline">+{{ log.amount }} {{ goal?.unit }}</span>
              <span class="log-date caption2 liquid-text-tertiary">{{ formatDateTime(log.date) }}</span>
            </div>
            <div v-if="log.notes" class="log-notes caption1">{{ log.notes }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 进度记录对话框 -->
    <QuickProgressDialog
      v-if="goal"
      :visible="progressDialogVisible"
      :goal="goal"
      @confirm="handleProgressRecord"
      @cancel="progressDialogVisible = false"
    />

    <!-- 编辑目标对话框 -->
    <GoalDialog
      v-if="goal"
      v-model:visible="editDialogVisible"
      :goal="goal"
      @confirm="handleGoalSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { Goal, GoalFormData } from '~/types/goal'
import { useGoalProgress, formatDate } from '~/composables/useGoalProgress'
import { useToast } from '~/composables/useToast'
import ProgressTrendChart from '~/components/ProgressTrendChart.vue'
import MonthlyProgressHeatmap from '~/components/MonthlyProgressHeatmap.vue'
import GoalDialog from './components/GoalDialog.vue'

const route = useRoute()
const router = useRouter()

// 使用目标进度composable
const {
  getProgressHistory,
  recordProgress,
  calculateProgressStatistics,
  upsertGoal
} = useGoalProgress()

const { success: showSuccess, error: showError } = useToast()

// 目标数据
const goal = ref<Goal>()
const loadingLogs = ref(false)
const progressLogs = ref<any[]>([])
const progressDialogVisible = ref(false)

// 进度统计
const statistics = computed(() => {
  if (!goal.value) {
    return {
      current: 0,
      target: 0,
      percentage: 0,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      expectedProgress: 0,
      progressStatus: 'on_track' as const,
      dailyAverageRequired: 0,
      dailyAverageActual: 0
    }
  }
  return calculateProgressStatistics(goal.value)
})

// 加载目标详情
async function loadGoalDetail() {
  const goalId = route.params.id as string
  const { getDB } = await import('~/services/db')
  const db = await getDB()

  try {
    const doc = await db.goals.findOne(goalId).exec()
    if (!doc) {
      console.error('Goal not found:', goalId)
      navigateTo('/goals')
      return
    }
    goal.value = doc.toJSON() as Goal

    // 加载进度历史
    loadingLogs.value = true
    progressLogs.value = await getProgressHistory(goalId)
  } catch (e) {
    console.error('Failed to load goal:', e)
    navigateTo('/goals')
  } finally {
    loadingLogs.value = false
  }
}

// 返回
function goBack() {
  router.back()
}

// 编辑对话框
const editDialogVisible = ref(false)
function openEdit() {
  editDialogVisible.value = true
}

async function handleGoalSave(data: GoalFormData, isEditing: boolean) {
  if (!goal.value) return
  try {
    await upsertGoal({ ...data, id: goal.value.id })
    editDialogVisible.value = false
    showSuccess('目标已更新')
    await loadGoalDetail()
  } catch (e) {
    showError(e instanceof Error ? e.message : '保存失败')
  }
}

// 打开进度记录对话框
function openProgressDialog() {
  progressDialogVisible.value = true
}

// 处理进度记录
async function handleProgressRecord(amount: number, date: string, notes?: string) {
  if (!goal.value) return

  try {
    await recordProgress({
      goalId: goal.value.id,
      amount,
      date,
      notes
    })

    // 重新加载进度历史
    progressLogs.value = await getProgressHistory(goal.value.id)
    progressDialogVisible.value = false

    // 刷新目标数据
    await loadGoalDetail()
    showSuccess('进度已记录')
  } catch (e) {
    showError(e instanceof Error ? e.message : '记录进度失败')
  }
}

// 格式化日期时间
function formatDateTime(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
}

// 监听路由变化
watch(() => route.params.id, () => {
  loadGoalDetail()
}, { immediate: true })

// 设置页面头部
useHead(() => ({
  title: goal.value ? `${goal.value.title} - 目标详情` : '目标详情 - LifeOS'
}))
</script>

<style scoped>
.goal-detail-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
}

/* 头部 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.back-btn {
  padding: 8px;
}

.detail-header h1 {
  flex: 1;
  margin: 0;
  color: var(--liquid-text-primary);
}

.action-btn {
  padding: 8px;
}

/* 进度概览 */
.progress-overview {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  text-align: center;
}

.stat-value {
  text-align: center;
  color: var(--liquid-text-primary);
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.time-range {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--liquid-text-primary);
}

.time-stats {
  text-align: center;
}

.daily-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  padding-top: 12px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.daily-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* 快速操作 */
.quick-actions {
  display: flex;
  gap: 12px;
}

.action-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.chart-card {
  min-height: 300px;
}

/* 时间线 */
.timeline-section {
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
  margin-bottom: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(0, 122, 255);
  flex-shrink: 0;
  margin-top: 4px;
  box-shadow: 0 0 8px rgba(0, 122, 255, 0.4);
}

.timeline-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.log-amount {
  color: rgb(52, 199, 89);
  font-weight: 600;
}

.log-date {
  color: var(--liquid-text-tertiary);
}

.log-notes {
  color: var(--liquid-text-secondary);
  line-height: 1.4;
}

/* 响应式 */
@media (max-width: 640px) {
  .goal-detail-view {
    padding: 8px;
    gap: 12px;
  }

  .overview-stats {
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1 1 calc(50% - 8px);
  }

  .quick-actions {
    flex-direction: column;
  }
}
</style>
