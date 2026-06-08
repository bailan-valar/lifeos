<template>
  <div class="learning-detail-view">
    <!-- 头部导航 -->
    <div class="detail-header">
      <button class="back-btn" @click="goBack">
        <Icon :name="SOLAR_ICONS.nav.back" />
        <span>返回</span>
      </button>

      <div class="header-actions">
        <button class="action-btn" @click="showNotesDialog = true">
          <Icon :name="SOLAR_ICONS.doc.notebook" />
          <span>笔记</span>
        </button>
        <button class="action-btn danger" @click="handleDelete">
          <Icon :name="SOLAR_ICONS.action.delete" />
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- 目标不存在 -->
    <div v-else-if="!goal" class="empty-state">
      <Icon :name="SOLAR_ICONS.status.error" />
      <p>学习目标不存在</p>
      <button class="back-action-btn" @click="goBack">返回列表</button>
    </div>

    <!-- 目标详情 -->
    <div v-else class="detail-content">
      <!-- 目标信息卡片 -->
      <div class="goal-info-card">
        <div class="goal-header">
          <div class="dimension-badge" :style="{ backgroundColor: dimensionColor }">
            {{ dimensionName }}
          </div>
          <div class="status-badge" :class="goal.status">
            {{ statusText }}
          </div>
        </div>

        <h1 class="goal-title">{{ goal.title }}</h1>
        <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>

        <div class="goal-stats">
          <div class="stat">
            <span class="stat-label">预计周期</span>
            <span class="stat-value">{{ goal.estimatedWeeks }} 周</span>
          </div>
          <div class="stat">
            <span class="stat-label">总课时</span>
            <span class="stat-value">{{ goal.totalSessions }} 课时</span>
          </div>
          <div class="stat">
            <span class="stat-label">已完成</span>
            <span class="stat-value">{{ goal.completedSessions }} / {{ goal.totalSessions }}</span>
          </div>
        </div>

        <div class="overall-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
          </div>
          <span class="progress-text">{{ progressPercentage }}%</span>
        </div>
      </div>

      <!-- 阶段列表 -->
      <div class="stages-section">
        <h3 class="section-title">学习阶段</h3>

        <div class="stages-list">
          <div
            v-for="stage in stages"
            :key="stage.id"
            class="stage-item"
            :class="{ active: stage.id === activeStageId }"
          >
            <LearningStagePanel :stage="stage" />

            <!-- 该阶段的课程列表 -->
            <div v-if="stage.id === activeStageId" class="stage-sessions">
              <LearningSessionItem
                v-for="session in sessionsByStage(stage.id)"
                :key="session.id"
                :session="session"
                @toggle-complete="handleToggleComplete"
                @edit-notes="handleEditNotes"
              />

              <!-- 空状态 -->
              <div v-if="sessionsByStage(stage.id).length === 0" class="sessions-empty">
                <p>该阶段暂无课程</p>
              </div>
            </div>

            <button class="expand-stage-btn" @click="toggleStage(stage.id)">
              <Icon :name="stage.id === activeStageId ? SOLAR_ICONS.nav.up : SOLAR_ICONS.nav.down" />
              <span>{{ stage.id === activeStageId ? '收起' : '展开' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记弹窗 -->
    <BaseDialog v-model:visible="showNotesDialog" title="学习笔记" size="medium">
      <div class="notes-content">
        <textarea
          v-model="notesText"
          class="liquid-glass-input"
          rows="10"
          placeholder="记录你的学习心得和思考..."
        />
      </div>
      <template #footer>
        <button class="liquid-glass-button" @click="showNotesDialog = false">取消</button>
        <button class="liquid-glass-button liquid-glass-button-primary" @click="saveNotes">保存</button>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LearningGoal, LearningStage, LearningSession } from '~/types/goal'
import { useLearningGoals, useLearningStages, useLearningSessions, LEARNING_DIMENSIONS } from '~/composables/useLearning'
import { useConfirm } from '~/composables/useConfirm'
import { SOLAR_ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import LearningStagePanel from './components/LearningStagePanel.vue'
import LearningSessionItem from './components/LearningSessionItem.vue'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

// 状态
const loading = ref(true)
const goal = ref<LearningGoal | null>(null)
const stages = ref<LearningStage[]>([])
const sessions = ref<LearningSession[]>([])
const activeStageId = ref<string | null>(null)
const showNotesDialog = ref(false)
const notesText = ref('')

// Composables
const { getGoalById, deleteGoal } = useLearningGoals()

// 计算属性
const dimensionName = computed(() => {
  if (!goal.value) return ''
  return LEARNING_DIMENSIONS[goal.value.dimension]?.name || '学习'
})

const dimensionColor = computed(() => {
  if (!goal.value) return ''
  const color = LEARNING_DIMENSIONS[goal.value.dimension]?.color
  return color ? `${color}20` : 'rgba(102, 126, 234, 0.2)'
})

const progressPercentage = computed(() => {
  if (!goal.value || goal.value.totalSessions === 0) return 0
  return Math.round((goal.value.completedSessions / goal.value.totalSessions) * 100)
})

const statusText = computed(() => {
  if (!goal.value) return ''
  const statusMap: Record<string, string> = {
    pending: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停'
  }
  return statusMap[goal.value.status] || '未知'
})

// 按阶段筛选课程
function sessionsByStage(stageId: string): LearningSession[] {
  return sessions.value.filter((s) => s.stageId === stageId)
}

// 加载目标数据
async function loadGoal() {
  const goalId = route.query.learningId as string
  if (!goalId) {
    loading.value = false
    return
  }

  loading.value = true

  try {
    const goalData = await getGoalById(goalId)
    goal.value = goalData

    if (goalData) {
      // 加载阶段和课程
      const { fetchStages, stagesByGoal } = useLearningStages()
      const { fetchSessions, sessionsByGoal } = useLearningSessions()

      await fetchStages()
      await fetchSessions()

      stages.value = stagesByGoal(goalId)
      sessions.value = sessionsByGoal(goalId)

      // 默认展开第一个未完成的阶段
      const firstIncomplete = stages.value.find((s) => s.status !== 'completed')
      activeStageId.value = firstIncomplete?.id || stages.value[0]?.id || null
    }
  } catch (e) {
    console.error('Failed to load goal:', e)
  } finally {
    loading.value = false
  }
}

// 切换阶段展开
function toggleStage(stageId: string) {
  activeStageId.value = activeStageId.value === stageId ? null : stageId
}

// 标记课程完成
async function handleToggleComplete(session: LearningSession) {
  const { toggleSessionComplete } = useLearningSessions()
  await toggleSessionComplete(session.id)

  // 重新加载数据
  await loadGoal()
}

// 编辑笔记
function handleEditNotes(session: LearningSession) {
  notesText.value = session.notes || ''
  showNotesDialog.value = true
}

// 保存笔记
async function saveNotes() {
  showNotesDialog.value = false
  // TODO: 实现笔记保存逻辑
}

// 删除目标
async function handleDelete() {
  if (!goal.value) return

  const ok = await confirm({
    message: `确定要删除学习目标"${goal.value.title}"吗？`,
    danger: true
  })

  if (!ok) return

  try {
    await deleteGoal(goal.value.id)
    goBack()
  } catch (e) {
    console.error('Failed to delete goal:', e)
  }
}

// 返回列表
function goBack() {
  router.push({ path: '/goals', query: { tab: 'learning' } })
}

// 监听路由变化
watch(() => route.query.learningId, loadGoal)

// 初始加载
onMounted(loadGoal)
</script>

<style scoped>
.learning-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--liquid-bg-thin);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--liquid-bg);
}

.back-btn .icon {
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--liquid-bg-thin);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-primary, #1a1a1a);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--liquid-bg);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border-color: rgba(255, 59, 48, 0.3);
}

.action-btn .icon {
  font-size: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.empty-state .icon {
  font-size: 48px;
  color: var(--text-tertiary, #999);
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary, #666);
}

.back-action-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.goal-info-card {
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.dimension-badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: rgba(153, 153, 153, 0.2);
  color: #666;
}

.status-badge.in_progress {
  background: rgba(74, 222, 128, 0.2);
  color: #16a34a;
}

.status-badge.completed {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.status-badge.paused {
  background: rgba(251, 191, 36, 0.2);
  color: #d97706;
}

.goal-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.goal-description {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

.goal-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.overall-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  min-width: 40px;
  text-align: right;
}

.stages-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.stages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-item {
  background: var(--liquid-bg-thin);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border-radius: 16px;
  overflow: hidden;
}

.stage-item.active {
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.stage-sessions {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sessions-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.expand-stage-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.03);
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 12px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.expand-stage-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.expand-stage-btn .icon {
  font-size: 14px;
}

.notes-content {
  padding: 8px 0;
}

.notes-content textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

@media (prefers-color-scheme: dark) {
  .goal-title,
  .stat-value,
  .progress-text,
  .section-title {
    color: var(--text-primary, #f5f5f5);
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }

  .expand-stage-btn {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .notes-content textarea {
    border-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
