<template>
  <div class="goal-progress-dashboard">
    <!-- 头部导航 -->
    <div class="dashboard-header liquid-glass-nav">
      <div class="header-left">
        <h2 class="title2">目标进度</h2>
      </div>
      <div class="header-right">
        <button @click="openCreateDialog" class="liquid-glass-button">
          <Icon name="solar:add-circle-linear" size="18" />
          新建目标
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card liquid-glass-card">
        <div class="stat-value headline">{{ filteredGoals.length }}</div>
        <div class="stat-label caption1 liquid-text-secondary">总目标</div>
      </div>
      <div class="stat-card liquid-glass-card">
        <div class="stat-value headline">{{ completedCount }}</div>
        <div class="stat-label caption1 liquid-text-secondary">已完成</div>
      </div>
      <div class="stat-card liquid-glass-card">
        <div class="stat-value headline">{{ inProgressCount }}</div>
        <div class="stat-label caption1 liquid-text-secondary">进行中</div>
      </div>
      <div class="stat-card liquid-glass-card">
        <div class="stat-value headline">{{ averageProgress.toFixed(0) }}%</div>
        <div class="stat-label caption1 liquid-text-secondary">平均进度</div>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <GoalShortcutHint
      v-if="showShortcutHint"
      @dismiss="handleShortcutHintDismiss"
    />

    <!-- 目标表格 -->
    <div class="table-wrapper liquid-glass-card">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span class="subheadline">加载中...</span>
      </div>

      <div v-else-if="filteredGoals.length === 0" class="empty-state">
        <Icon name="solar:target-linear" size="48" class="empty-icon" />
        <h3 class="title3">暂无目标</h3>
        <p class="body liquid-text-secondary">创建你的第一个目标开始追踪进度</p>
        <button @click="openCreateDialog" class="liquid-glass-button liquid-glass-button-primary">
          创建目标
        </button>
      </div>

      <div v-else class="goals-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col-goal">目标</div>
          <div class="col-time">时间范围</div>
          <div class="col-target">总目标</div>
          <div class="col-expected">期望进度</div>
          <div class="col-actual">实际进度</div>
          <div class="col-progress">完成度</div>
          <div class="col-status">状态</div>
          <div class="col-actions">操作</div>
        </div>

        <!-- 数据行 -->
        <div
          v-for="goal in sortedGoals"
          :key="goal.id"
          class="table-row liquid-glass-list-item"
          @click="openGoalDetail(goal)"
        >
          <div class="col-goal">
            <div class="goal-name headline">{{ goal.title }}</div>
            <div class="goal-type caption2 liquid-text-tertiary">{{ getTypeLabel(goal.type) }}</div>
          </div>
          <div class="col-time">
            <div class="date-range caption1">
              {{ formatDateShort(goal.startDate) }} - {{ formatDateShort(goal.endDate) }}
            </div>
            <div class="time-info caption2 liquid-text-tertiary">
              {{ getTimeInfo(goal) }}
            </div>
          </div>
          <div class="col-target">
            <span class="target-value subheadline">{{ goal.target }}</span>
            <span class="unit caption2">{{ goal.unit }}</span>
          </div>
          <div class="col-expected">
            <span class="expected-value subheadline">{{ getGoalStats(goal).expectedProgress.toFixed(0) }}</span>
          </div>
          <div class="col-actual">
            <span class="actual-value subheadline">{{ goal.currentProgress }}</span>
          </div>
          <div class="col-progress">
            <ProgressBar
              :current="goal.currentProgress"
              :target="goal.target"
              :unit="goal.unit"
              :statistics="getGoalStats(goal)"
              size="compact"
            />
          </div>
          <div class="col-status">
            <GoalStatusBadge
              :status="getGoalStats(goal).progressStatus"
              size="compact"
            />
          </div>
          <div class="col-actions" @click.stop>
            <button
              @click="openProgressDialog(goal)"
              class="liquid-glass-button action-btn"
              title="记录进度"
            >
              <Icon name="solar:add-circle-linear" size="16" />
            </button>
            <button
              @click="openEditDialog(goal)"
              class="liquid-glass-button action-btn"
              title="编辑"
            >
              <Icon name="solar:pen-linear" size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB按钮（移动端） -->
    <button
      v-if="isMobile"
      @click="openCreateDialog"
      class="liquid-glass-fab mobile-fab"
    >
      <Icon name="solar:add-circle-linear" size="24" />
    </button>

    <!-- 全局快捷键目标选择对话框 -->
    <GoalSelectorDialog
      :visible="goalShortcutDialogVisible"
      @select="handleShortcutGoalSelect"
      @close="goalShortcutDialogVisible = false"
    />

    <!-- 进度记录对话框 -->
    <QuickProgressDialog
      v-if="selectedGoal"
      :visible="progressDialogVisible"
      :goal="selectedGoal"
      @confirm="handleProgressRecord"
      @cancel="progressDialogVisible = false"
    />

    <!-- 创建/编辑目标对话框 -->
    <GoalDialog
      v-model:visible="goalDialogVisible"
      :goal="editingGoal"
      @confirm="handleGoalSave"
    />
  </div>
</template>

<script setup lang="ts">
import type { Goal, GoalFormData } from '~/types/goal'
import { useGoalProgress, formatDate } from '~/composables/useGoalProgress'
import { useGoalShortcut } from '~/composables/useGoalShortcut'
import { useToast } from '~/composables/useToast'
import GoalSelectorDialog from '~/components/GoalSelectorDialog.vue'
import GoalShortcutHint from '~/components/GoalShortcutHint.vue'
import GoalDialog from './components/GoalDialog.vue'

const props = defineProps<{
  typeFilter?: string
}>()

const { isMobile } = useDevice()

// 使用目标进度composable
const {
  goals,
  loading,
  loadGoals,
  recordProgress,
  calculateProgressStatistics,
  onGoalsChange,
  onProgressLogsChange,
  upsertGoal
} = useGoalProgress()

const { success: showSuccess, error: showError } = useToast()

// 全局快捷键
const { goalShortcutDialogVisible, openQuickProgressDialog, registerShortcut, unregisterShortcut } = useGoalShortcut()

// 路由查询参数
const route = useRoute()
const typeFilter = computed(() => {
  return (props.typeFilter || route.query.type as string) || 'all'
})

// 注册/注销全局快捷键
onMounted(() => {
  registerShortcut()
})
onUnmounted(() => {
  unregisterShortcut()
})

// 过滤后的目标列表
const filteredGoals = computed(() => {
  if (!typeFilter.value || typeFilter.value === 'all') {
    return goals.value
  }
  return goals.value.filter(goal => goal.type === typeFilter.value)
})

// 选中的目标（用于进度记录）
const selectedGoal = ref<Goal>()
const progressDialogVisible = ref(false)

// 快捷键提示（带本地存储持久化）
const shortcutHintStorageKey = 'lifeos:goal-shortcut-hint-dismissed'
const showShortcutHint = ref(!import.meta.client || !localStorage.getItem(shortcutHintStorageKey))

function handleShortcutHintDismiss() {
  showShortcutHint.value = false
  if (import.meta.client) {
    localStorage.setItem(shortcutHintStorageKey, '1')
  }
}

// 统计信息缓存（避免重复计算）
const goalStatisticsMap = computed(() => {
  const map = new Map<string, ReturnType<typeof calculateProgressStatistics>>()
  for (const g of goals.value) {
    map.set(g.id, calculateProgressStatistics(g))
  }
  return map
})

function getGoalStats(goal: Goal) {
  return goalStatisticsMap.value.get(goal.id) || calculateProgressStatistics(goal)
}

// 统计数据
const completedCount = computed(() =>
  filteredGoals.value.filter(g => getGoalStats(g).progressStatus === 'completed').length
)

const inProgressCount = computed(() =>
  filteredGoals.value.filter(g => getGoalStats(g).progressStatus !== 'completed').length
)

const averageProgress = computed(() => {
  if (filteredGoals.value.length === 0) return 0
  const total = filteredGoals.value.reduce((sum, g) => sum + getGoalStats(g).percentage, 0)
  return total / filteredGoals.value.length
})

// 排序的目标列表（按进度百分比排序）
const sortedGoals = computed(() => {
  return [...filteredGoals.value].sort((a, b) => {
    return getGoalStats(b).percentage - getGoalStats(a).percentage
  })
})

// 格式化日期（简短格式）
function formatDateShort(date: string): string {
  return formatDate(date, 'short')
}

// 获取类型标签
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    short_term: '短期',
    long_term: '长期',
    habit: '习惯',
    project: '项目'
  }
  return labels[type] || type
}

// 获取时间信息
function getTimeInfo(goal: Goal): string {
  const stats = getGoalStats(goal)
  return `${stats.elapsedDays}/${stats.totalDays}天`
}

// 创建/编辑对话框
const goalDialogVisible = ref(false)
const editingGoal = ref<Goal>()

// 打开创建对话框
function openCreateDialog() {
  editingGoal.value = undefined
  goalDialogVisible.value = true
}

// 打开编辑对话框
function openEditDialog(goal: Goal) {
  editingGoal.value = goal
  goalDialogVisible.value = true
}

// 保存目标
async function handleGoalSave(data: GoalFormData, isEditing: boolean, id?: string) {
  try {
    await upsertGoal({ ...data, id })
    goalDialogVisible.value = false
    editingGoal.value = undefined
    showSuccess(isEditing ? '目标已更新' : '目标已创建')
    await loadGoals()
  } catch (e) {
    showError(e instanceof Error ? e.message : '保存失败')
  }
}

// 打开目标详情
function openGoalDetail(goal: Goal) {
  navigateTo(`/goals/${goal.id}`)
}

// 打开进度记录对话框
function openProgressDialog(goal: Goal) {
  selectedGoal.value = goal
  progressDialogVisible.value = true
}

// 处理快捷键目标选择
function handleShortcutGoalSelect(goal: Goal) {
  goalShortcutDialogVisible.value = false
  openProgressDialog(goal)
}

// 处理进度记录
async function handleProgressRecord(amount: number, date: string, notes?: string) {
  if (!selectedGoal.value) return

  try {
    await recordProgress({
      goalId: selectedGoal.value.id,
      amount,
      date,
      notes
    })
    progressDialogVisible.value = false
    showSuccess('进度已记录')
    // 刷新列表数据
    await loadGoals()
  } catch (e) {
    showError(e instanceof Error ? e.message : '记录进度失败')
  }
}

// 加载数据
onMounted(async () => {
  await loadGoals()
})

// 监听数据变化自动刷新
let unsubGoals: (() => void) | undefined
let unsubLogs: (() => void) | undefined
onMounted(() => {
  unsubGoals = onGoalsChange(() => loadGoals())
  unsubLogs = onProgressLogsChange(() => loadGoals())
})
onUnmounted(() => {
  unsubGoals?.()
  unsubLogs?.()
})
</script>

<style scoped>
.goal-progress-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
}

/* 头部 */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
}

.header-left h2 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.stat-value {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.stat-label {
  color: var(--liquid-text-secondary);
}

/* 表格容器 */
.table-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.goals-table {
  flex: 1;
  overflow: auto;
  min-width: 900px;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.empty-state h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.empty-state p {
  margin: 0;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 表格样式 */
.table-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--liquid-bg-thick);
  backdrop-filter: blur(var(--liquid-blur-thick));
  border-bottom: var(--liquid-border);
  padding: 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--liquid-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  display: flex;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
  transition: background 0.15s ease;
  cursor: pointer;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* 列宽定义 */
.col-goal {
  width: 180px;
  flex-shrink: 0;
  padding: 12px 8px;
}

.col-time {
  width: 160px;
  flex-shrink: 0;
  padding: 12px 8px;
}

.col-target {
  width: 100px;
  flex-shrink: 0;
  padding: 12px 8px;
  text-align: right;
}

.col-expected {
  width: 80px;
  flex-shrink: 0;
  padding: 12px 8px;
  text-align: right;
}

.col-actual {
  width: 80px;
  flex-shrink: 0;
  padding: 12px 8px;
  text-align: right;
}

.col-progress {
  flex: 1;
  min-width: 150px;
  padding: 12px 8px;
}

.col-status {
  width: 90px;
  flex-shrink: 0;
  padding: 12px 8px;
}

.col-actions {
  width: 80px;
  flex-shrink: 0;
  padding: 12px 8px;
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* 列内容样式 */
.goal-name {
  color: var(--liquid-text-primary);
  font-weight: 600;
  margin-bottom: 2px;
}

.date-range {
  color: var(--liquid-text-primary);
  font-weight: 500;
  margin-bottom: 2px;
}

.target-value,
.actual-value,
.expected-value {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.unit {
  color: var(--liquid-text-tertiary);
  margin-left: 2px;
}

.action-btn {
  padding: 6px;
  min-width: 32px;
  height: 32px;
}

/* 移动端FAB */
.mobile-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--z-fab);
}

/* 响应式适配 */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .goal-progress-dashboard {
    padding: 8px;
    gap: 8px;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 12px;
  }

  .dashboard-header {
    padding: 12px;
  }

  .header-left h2 {
    font-size: 20px;
  }

  /* 表格在移动端使用卡片布局 */
  .goals-table {
    display: flex;
    flex-direction: column;
    min-width: unset;
  }

  .table-header {
    display: none;
  }

  .table-row {
    flex-direction: column;
    border: 0.5px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--liquid-radius);
    margin-bottom: 12px;
    padding: 12px;
  }

  .col-goal,
  .col-time,
  .col-target,
  .col-expected,
  .col-actual,
  .col-progress,
  .col-status,
  .col-actions {
    width: 100%;
    padding: 4px 0;
  }

  .col-actions {
    justify-content: flex-start;
  }
}
</style>
