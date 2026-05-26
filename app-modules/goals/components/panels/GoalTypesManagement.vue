<template>
  <div class="goal-types-management">
    <!-- 头部 -->
    <div class="header liquid-glass-nav">
      <div class="header-left">
        <h2 class="title2">目标类型管理</h2>
        <p class="body2 liquid-text-secondary">管理不同类型的目标及其配置</p>
      </div>
    </div>

    <!-- 类型卡片网格 -->
    <div class="types-grid">
      <div
        v-for="type in goalTypes"
        :key="type.id"
        class="type-card liquid-glass-card"
        :class="{ active: type.enabled }"
      >
        <div class="type-header">
          <div class="type-icon" :style="{ background: type.color + '20', color: type.color }">
            <Icon :name="type.icon" size="24" />
          </div>
          <div class="type-info">
            <h3 class="title3">{{ type.name }}</h3>
            <p class="caption1 liquid-text-secondary">{{ type.description }}</p>
          </div>
          <div class="type-toggle">
            <button
              type="button"
              class="toggle-btn"
              :class="{ active: type.enabled }"
              @click="toggleType(type.id)"
            >
              <Icon :name="type.enabled ? 'solar:check-circle-linear' : 'solar:circle-linear'" size="20" />
            </button>
          </div>
        </div>

        <div class="type-stats">
          <div class="stat-item">
            <span class="stat-value subheadline">{{ type.goalCount }}</span>
            <span class="stat-label caption2 liquid-text-secondary">目标数量</span>
          </div>
          <div class="stat-item">
            <span class="stat-value subheadline">{{ type.completionRate }}%</span>
            <span class="stat-label caption2 liquid-text-secondary">完成率</span>
          </div>
        </div>

        <div class="type-actions">
          <button
            type="button"
            class="liquid-glass-button action-btn"
            @click="editType(type)"
          >
            <Icon name="solar:pen-linear" size="16" />
            编辑
          </button>
          <button
            type="button"
            class="liquid-glass-button action-btn"
            @click="viewGoals(type.id)"
          >
            <Icon name="solar:users-group-rounded-linear" size="16" />
            查看目标
          </button>
        </div>
      </div>
    </div>

    <!-- 新建类型按钮 -->
    <button
      type="button"
      class="liquid-glass-button add-type-btn liquid-glass-button-primary"
      @click="createNewType"
    >
      <Icon name="solar:add-circle-linear" size="18" />
      新建类型
    </button>

    <!-- 编辑对话框 -->
    <BaseDialog
      v-model:visible="editDialogVisible"
      :title="editingType ? '编辑类型' : '新建类型'"
      width="500px"
    >
      <div class="dialog-content">
        <div class="form-group">
          <label class="form-label">类型名称</label>
          <input
            v-model="formData.name"
            type="text"
            class="liquid-glass-input"
            placeholder="例如：学习目标"
          />
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea
            v-model="formData.description"
            class="liquid-glass-input"
            rows="3"
            placeholder="简要描述此类型的目标"
          />
        </div>

        <div class="form-group">
          <label class="form-label">图标</label>
          <input
            v-model="formData.icon"
            type="text"
            class="liquid-glass-input"
            placeholder="solar:book-bookmark-linear"
          />
        </div>

        <div class="form-group">
          <label class="form-label">颜色</label>
          <div class="color-picker">
            <button
              v-for="color in presetColors"
              :key="color"
              type="button"
              class="color-btn"
              :class="{ active: formData.color === color }"
              :style="{ background: color }"
              @click="formData.color = color"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="liquid-glass-button"
          @click="editDialogVisible = false"
        >
          取消
        </button>
        <button
          type="button"
          class="liquid-glass-button liquid-glass-button-primary"
          @click="saveType"
        >
          保存
        </button>
      </template>
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Goal } from '~/types/goal'
import { useGoalProgress } from '~/composables/useGoalProgress'

const { goals, loading, loadGoals } = useGoalProgress()

// 对话框状态
const editDialogVisible = ref(false)
const editingType = ref<GoalTypeConfig | null>(null)

// 表单数据
const formData = ref({
  name: '',
  description: '',
  icon: 'solar:target-linear',
  color: '#007AFF'
})

// 预设颜色
const presetColors = [
  '#007AFF', // 蓝色
  '#34C759', // 绿色
  '#FF9500', // 橙色
  '#FF3B30', // 红色
  '#AF52DE', // 紫色
  '#5856D6', // 靛蓝
  '#FF2D55', // 粉红
  '#5AC8FA'  // 青色
]

// 目标类型配置
interface GoalTypeConfig {
  id: string
  name: string
  description: string
  icon: string
  color: string
  enabled: boolean
  goalCount: number
  completionRate: number
}

const goalTypes = ref<GoalTypeConfig[]>([
  {
    id: 'short_term',
    name: '短期目标',
    description: '在较短时间内可以完成的目标',
    icon: 'solar:clock-circle-linear',
    color: '#34C759',
    enabled: true,
    goalCount: 0,
    completionRate: 0
  },
  {
    id: 'long_term',
    name: '长期目标',
    description: '需要较长时间持续努力的目标',
    icon: 'solar:mountains-linear',
    color: '#FF9500',
    enabled: true,
    goalCount: 0,
    completionRate: 0
  },
  {
    id: 'habit',
    name: '习惯养成',
    description: '日常习惯的培养和坚持',
    icon: 'solar:heart-linear',
    color: '#AF52DE',
    enabled: true,
    goalCount: 0,
    completionRate: 0
  },
  {
    id: 'project',
    name: '项目任务',
    description: '具体的项目和任务目标',
    icon: 'solar:folder-linear',
    color: '#FF3B30',
    enabled: true,
    goalCount: 0,
    completionRate: 0
  }
])

// 更新统计数据
function updateStatistics() {
  for (const type of goalTypes.value) {
    const typeGoals = goals.value.filter(g => g.type === type.id)
    type.goalCount = typeGoals.length

    if (typeGoals.length > 0) {
      const completedGoals = typeGoals.filter(g => {
        const stats = calculateProgressStatistics(g)
        return stats.progressStatus === 'completed'
      })
      type.completionRate = Math.round((completedGoals.length / typeGoals.length) * 100)
    } else {
      type.completionRate = 0
    }
  }
}

// 切换类型启用状态
function toggleType(typeId: string) {
  const type = goalTypes.value.find(t => t.id === typeId)
  if (type) {
    type.enabled = !type.enabled
    saveTypeConfigs()
  }
}

// 编辑类型
function editType(type: GoalTypeConfig) {
  editingType.value = type
  formData.value = {
    name: type.name,
    description: type.description,
    icon: type.icon,
    color: type.color
  }
  editDialogVisible.value = true
}

// 新建类型
function createNewType() {
  editingType.value = null
  formData.value = {
    name: '',
    description: '',
    icon: 'solar:target-linear',
    color: '#007AFF'
  }
  editDialogVisible.value = true
}

// 保存类型
function saveType() {
  if (editingType.value) {
    // 编辑现有类型
    editingType.value.name = formData.value.name
    editingType.value.description = formData.value.description
    editingType.value.icon = formData.value.icon
    editingType.value.color = formData.value.color
  } else {
    // 新建类型
    const newType: GoalTypeConfig = {
      id: 'custom_' + Date.now(),
      name: formData.value.name,
      description: formData.value.description,
      icon: formData.value.icon,
      color: formData.value.color,
      enabled: true,
      goalCount: 0,
      completionRate: 0
    }
    goalTypes.value.push(newType)
  }

  saveTypeConfigs()
  editDialogVisible.value = false
}

// 查看目标
function viewGoals(typeId: string) {
  // TODO: 实现跳转到对应类型目标列表的功能
  console.log('查看类型:', typeId, '的目标')
}

// 保存类型配置到本地存储
function saveTypeConfigs() {
  const configs = goalTypes.value.map(({ id, name, description, icon, color, enabled }) => ({
    id, name, description, icon, color, enabled
  }))
  if (import.meta.client) {
    localStorage.setItem('lifeos:goal-type-configs', JSON.stringify(configs))
  }
}

// 从本地存储加载类型配置
function loadTypeConfigs() {
  if (!import.meta.client) return

  const stored = localStorage.getItem('lifeos:goal-type-configs')
  if (stored) {
    try {
      const configs = JSON.parse(stored)
      for (const config of configs) {
        const existing = goalTypes.value.find(t => t.id === config.id)
        if (existing) {
          Object.assign(existing, config)
        }
      }
    } catch (e) {
      console.error('加载目标类型配置失败:', e)
    }
  }
}

// 计算进度统计（从GoalProgressDashboard复制的逻辑）
function calculateProgressStatistics(goal: Goal) {
  const startDate = new Date(goal.startDate)
  const endDate = new Date(goal.endDate)
  const now = new Date()

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const remainingDays = Math.max(0, totalDays - elapsedDays)

  const percentage = goal.target > 0 ? (goal.currentProgress / goal.target) * 100 : 0

  // 计算期望进度（基于时间）
  const expectedProgress = goal.target > 0 ? (elapsedDays / totalDays) * goal.target : 0

  // 确定进度状态
  let progressStatus: 'behind' | 'on_track' | 'ahead' | 'completed' = 'on_track'
  if (percentage >= 100) {
    progressStatus = 'completed'
  } else if (goal.currentProgress < expectedProgress * 0.8) {
    progressStatus = 'behind'
  } else if (goal.currentProgress > expectedProgress * 1.2) {
    progressStatus = 'ahead'
  }

  return {
    current: goal.currentProgress,
    target: goal.target,
    percentage,
    totalDays,
    elapsedDays: Math.max(0, elapsedDays),
    remainingDays,
    expectedProgress,
    progressStatus,
    dailyAverageRequired: remainingDays > 0 ? (goal.target - goal.currentProgress) / remainingDays : 0,
    dailyAverageActual: elapsedDays > 0 ? goal.currentProgress / elapsedDays : 0
  }
}

// 生命周期
onMounted(async () => {
  await loadGoals()
  loadTypeConfigs()
  updateStatistics()
})
</script>

<style scoped>
.goal-types-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
}

/* 头部 */
.header {
  padding: 16px;
  border-radius: var(--liquid-radius);
}

.header-left h2 {
  margin: 0 0 4px 0;
  color: var(--liquid-text-primary);
}

.header-left p {
  margin: 0;
}

/* 类型卡片网格 */
.types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.type-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: var(--liquid-radius);
  transition: all 0.2s ease;
}

.type-card:hover {
  transform: translateY(-2px);
}

.type-card.active {
  border-left: 3px solid var(--liquid-primary);
}

.type-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.type-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-info h3 {
  margin: 0 0 4px 0;
  color: var(--liquid-text-primary);
}

.type-info p {
  margin: 0;
  line-height: 1.4;
}

.type-toggle {
  flex-shrink: 0;
}

.toggle-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toggle-btn.active {
  color: rgb(52, 199, 89);
}

.type-stats {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.stat-label {
  color: var(--liquid-text-secondary);
}

.type-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
}

.add-type-btn {
  align-self: flex-start;
  margin-top: auto;
}

/* 对话框 */
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-primary);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: var(--liquid-text-primary);
}

/* 响应式 */
@media (max-width: 640px) {
  .goal-types-management {
    padding: 8px;
    gap: 8px;
  }

  .types-grid {
    grid-template-columns: 1fr;
  }

  .header {
    padding: 12px;
  }
}
</style>