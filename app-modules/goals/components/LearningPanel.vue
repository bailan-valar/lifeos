<template>
  <div class="learning-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <h2>学习板块</h2>
      <div class="header-actions">
        <button class="create-btn preset" @click="showPresetDialog = true">
          <Icon :name="SOLAR_ICONS.doc.bookmark" />
          <span>预设训练</span>
        </button>
        <button class="create-btn" @click="showCreateDialog = true">
          <Icon :name="SOLAR_ICONS.action.add" />
          <span>创建目标</span>
        </button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="filter-btn"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- 学习目标列表 -->
    <div class="goals-grid">
      <LearningGoalCard
        v-for="goal in filteredGoals"
        :key="goal.id"
        :goal="goal"
        @click="openGoalDetail"
      />

      <!-- 空状态 -->
      <div v-if="filteredGoals.length === 0" class="empty-state">
        <Icon :name="SOLAR_ICONS.doc.book" />
        <p>{{ activeFilter === 'all' ? '还没有学习目标，创建一个开始学习吧' : '该分类下暂无学习目标' }}</p>
        <button class="empty-action-btn" @click="showCreateDialog = true">
          <Icon :name="SOLAR_ICONS.action.add" />
          <span>创建学习目标</span>
        </button>
      </div>
    </div>

    <!-- 创建目标弹窗 -->
    <BaseDialog v-model:visible="showCreateDialog" title="创建学习目标" size="small">
      <LearningGoalForm
        ref="formRef"
        @submit="handleCreateGoal"
        @cancel="showCreateDialog = false"
        @show-api-key-settings="showApiKeyDialog = true"
      />
    </BaseDialog>

    <!-- API Key 设置弹窗 -->
    <BaseDialog v-model:visible="showApiKeyDialog" title="配置 API Key" size="small">
      <div class="api-key-settings">
        <p class="settings-desc">
          配置 Anthropic API Key 后，AI 将为你的学习目标生成个性化的阶段拆分方案。
          未配置时将使用预设模板。
        </p>
        <div class="form-group">
          <label>API Key</label>
          <input
            v-model="apiKeyInput"
            type="password"
            class="liquid-glass-input"
            placeholder="sk-ant-..."
            @keydown.enter="saveApiKey"
          />
        </div>
        <p class="settings-hint">
          在 <a href="https://console.anthropic.com" target="_blank">Anthropic Console</a> 获取 API Key
        </p>
      </div>
      <template #footer>
        <button class="liquid-glass-button" @click="showApiKeyDialog = false">取消</button>
        <button class="liquid-glass-button liquid-glass-button-primary" @click="saveApiKey">保存</button>
      </template>
    </BaseDialog>

    <!-- 预设训练弹窗 -->
    <BaseDialog v-model:visible="showPresetDialog" title="选择训练计划" size="large">
      <PresetTrainingSelector
        @select="handlePresetSelect"
        @close="showPresetDialog = false"
      />
    </BaseDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import type { LearningDimension } from '~/types/goal'
import { useLearningGoals, useAISplit, LEARNING_DIMENSIONS, useLearningApiKey } from '~/composables/useLearning'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useConfirm } from '~/composables/useConfirm'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import LearningGoalCard from './LearningGoalCard.vue'
import LearningGoalForm from './LearningGoalForm.vue'
import LearningDetailView from '~/app-modules/goals/LearningDetailView.vue'
import PresetTrainingSelector from './PresetTrainingSelector.vue'

const router = useRouter()
const { confirm } = useConfirm()

// Composables
const { goals, createGoal, deleteGoal } = useLearningGoals()
const { createLearningGoalFromSplit, splitting } = useAISplit()
const { setApiKey, configured } = useLearningApiKey()

// 状态
const activeFilter = ref<string>('all')
const showCreateDialog = ref(false)
const showPresetDialog = ref(false)
const showApiKeyDialog = ref(false)
const apiKeyInput = ref('')
const formRef = ref<{ setSplitting: (value: boolean) => void } | null>(null)

// 筛选器选项
const filters = computed(() => {
  const result = [{ label: '全部', value: 'all' }]
  Object.entries(LEARNING_DIMENSIONS).forEach(([key, value]) => {
    result.push({ label: value.name, value: key })
  })
  return result
})

// 筛选后的目标列表
const filteredGoals = computed(() => {
  if (activeFilter.value === 'all') {
    return goals.value
  }
  return goals.value.filter((g) => g.dimension === activeFilter.value)
})

// 打开目标详情
function openGoalDetail(goal: any) {
  router.push({
    path: '/goals',
    query: { tab: 'learning', learningId: goal.id }
  })
}

// 创建学习目标
async function handleCreateGoal(data: { title: string; dimension?: LearningDimension; weeks: number }) {
  if (formRef.value) {
    formRef.value.setSplitting(true)
  }

  try {
    await createLearningGoalFromSplit({
      title: data.title,
      dimension: data.dimension,
      weeks: data.weeks
    })
    showCreateDialog.value = false
  } catch (e: any) {
    const ok = await confirm({
      message: `创建失败: ${e.message}\n\n是否使用预设模板创建？`,
      confirmText: '使用预设',
      cancelText: '取消'
    })
    if (ok) {
      // 使用预设模板重试
      try {
        await createLearningGoalFromSplit({
          title: data.title,
          dimension: data.dimension,
          weeks: data.weeks
        })
        showCreateDialog.value = false
      } catch (e2: any) {
        console.error('Preset creation failed:', e2)
      }
    }
  } finally {
    if (formRef.value) {
      formRef.value.setSplitting(false)
    }
  }
}

// 保存 API Key
function saveApiKey() {
  if (apiKeyInput.value.trim()) {
    setApiKey(apiKeyInput.value.trim())
    showApiKeyDialog.value = false
    apiKeyInput.value = ''
  }
}

// 处理预设选择
function handlePresetSelect(goalId: string) {
  showPresetDialog.value = false
  // 打开目标详情
  router.push({
    path: '/goals',
    query: { tab: 'learning', learningId: goalId }
  })
}
</script>

<style scoped>
.learning-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn.preset {
  background: var(--liquid-bg-thick);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: var(--text-primary, #1a1a1a);
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.create-btn .icon {
  font-size: 16px;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-btn {
  padding: 6px 14px;
  background: var(--liquid-bg-thin);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background: var(--liquid-bg);
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-bottom: 16px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state .icon {
  font-size: 48px;
  color: var(--text-tertiary, #999);
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.empty-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
}

.api-key-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.settings-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.settings-hint a {
  color: #667eea;
}

@media (prefers-color-scheme: dark) {
  .panel-header h2 {
    color: var(--text-primary, #f5f5f5);
  }

  .filter-btn {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .create-btn.preset {
    color: var(--text-primary, #f5f5f5);
    border-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
