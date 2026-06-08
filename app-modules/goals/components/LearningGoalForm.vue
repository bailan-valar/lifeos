<template>
  <div class="learning-goal-form">
    <div class="form-header">
      <h3>创建学习目标</h3>
      <p class="form-desc">AI 将自动拆分为可执行的学习阶段</p>
    </div>

    <div class="form-body">
      <!-- 目标标题 -->
      <div class="form-group">
        <label>学习目标</label>
        <input
          v-model="formData.title"
          type="text"
          class="liquid-glass-input"
          placeholder="例如：掌握沟通表达、提升心理洞察力"
          @keydown.enter="handleSubmit"
        />
      </div>

      <!-- 学习维度 -->
      <div class="form-group">
        <label>学习维度（可选）</label>
        <SelectPicker
          v-model="formData.dimension"
          :options="dimensionOptions"
          placeholder="AI 自动识别"
          clearable
        />
      </div>

      <!-- 预计周数 -->
      <div class="form-group">
        <label>预计周期</label>
        <div class="week-selector">
          <button
            v-for="weeks in [4, 8, 12]"
            :key="weeks"
            class="week-btn"
            :class="{ active: formData.weeks === weeks }"
            @click="formData.weeks = weeks"
          >
            {{ weeks }} 周
          </button>
        </div>
      </div>

      <!-- API Key 提示 -->
      <div v-if="!apiKeyConfigured" class="api-key-hint">
        <Icon :name="SOLAR_ICONS.info.info" />
        <span>未配置 API Key，将使用预设模板</span>
        <button class="text-link" @click="$emit('showApiKeySettings')">配置</button>
      </div>

      <!-- 加载状态 -->
      <div v-if="splitting" class="loading-state">
        <div class="spinner"></div>
        <p>AI 正在拆分学习目标...</p>
      </div>
    </div>

    <div class="form-footer">
      <button class="liquid-glass-button" @click="$emit('cancel')">取消</button>
      <button
        class="liquid-glass-button liquid-glass-button-primary"
        :disabled="!formData.title.trim() || splitting"
        @click="handleSubmit"
      >
        {{ splitting ? '拆分中...' : '创建目标' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LearningDimension } from '~/types/goal'
import { LEARNING_DIMENSIONS, useLearningApiKey } from '~/composables/useLearning'
import { SOLAR_ICONS } from '~/composables/useIcons'

const emit = defineEmits<{
  submit: [data: { title: string; dimension?: LearningDimension; weeks: number }]
  cancel: []
  showApiKeySettings: []
}>()

const { configured: apiKeyConfigured } = useLearningApiKey()

const formData = ref({
  title: '',
  dimension: undefined as LearningDimension | undefined,
  weeks: 8
})

const splitting = ref(false)

const dimensionOptions = computed(() => {
  return Object.entries(LEARNING_DIMENSIONS).map(([key, value]) => ({
    label: value.name,
    value: key as LearningDimension
  }))
})

function handleSubmit() {
  if (!formData.value.title.trim()) return
  emit('submit', {
    title: formData.value.title.trim(),
    dimension: formData.value.dimension,
    weeks: formData.value.weeks
  })
}

defineExpose({
  setSplitting: (value: boolean) => {
    splitting.value = value
  }
})
</script>

<style scoped>
.learning-goal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-header {
  text-align: center;
}

.form-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
}

.form-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.week-selector {
  display: flex;
  gap: 8px;
}

.week-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: var(--liquid-bg-thin);
  color: var(--text-primary, #1a1a1a);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.week-btn:hover {
  background: var(--liquid-bg);
}

.week-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.api-key-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 183, 0, 0.1);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.api-key-hint .icon {
  font-size: 16px;
  color: #e6a700;
}

.text-link {
  margin-left: auto;
  padding: 0;
  background: none;
  border: none;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
}

.text-link:hover {
  text-decoration: underline;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  text-align: center;
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

.loading-state p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.form-footer {
  display: flex;
  gap: 12px;
  padding-top: 8px;
}

.form-footer button {
  flex: 1;
}

@media (prefers-color-scheme: dark) {
  .form-header h3 {
    color: var(--text-primary, #f5f5f5);
  }

  .week-btn {
    color: var(--text-primary, #f5f5f5);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .api-key-hint {
    background: rgba(255, 183, 0, 0.15);
  }
}
</style>
