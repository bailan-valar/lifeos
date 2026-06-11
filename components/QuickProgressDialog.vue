<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay liquid-glass-overlay" @click="onCancel">
      <div class="dialog-sheet liquid-glass-sheet" @click.stop>
        <!-- 拖拽手柄 -->
        <div class="sheet-handle"></div>

        <div class="sheet-content">
          <!-- 标题 -->
          <div class="sheet-header">
            <h3 class="title3">记录进度</h3>
          </div>

          <!-- 目标信息 -->
          <div v-if="goal" class="goal-info liquid-glass-card">
            <div class="goal-title headline">{{ goal.title }}</div>
            <ProgressBar
              :current="goal.currentProgress"
              :target="goal.target"
              :unit="goal.unit"
              :statistics="statistics"
              size="standard"
            />
          </div>

          <!-- 进度输入 -->
          <div class="input-section liquid-glass-card">
            <div class="input-row">
              <div class="input-field">
                <label class="caption1 liquid-text-secondary">完成数量</label>
                <input
                  ref="amountInput"
                  v-model="form.amount"
                  type="number"
                  class="liquid-glass-input"
                  :placeholder="`输入${goal?.unit || '数量'}`"
                  min="0"
                  @keydown.enter="onConfirm"
                />
              </div>
              <div class="unit-display subheadline">{{ goal?.unit || '' }}</div>
            </div>

            <div class="input-field">
              <label class="caption1 liquid-text-secondary">日期</label>
              <DateTimePicker v-model="form.date" placeholder="选择日期" clearable />
            </div>

            <div class="input-field">
              <label class="caption1 liquid-text-secondary">备注（可选）</label>
              <textarea
                v-model="form.notes"
                class="liquid-glass-input"
                rows="2"
                placeholder="添加备注..."
              />
            </div>
          </div>

          <!-- 预计进度 -->
          <div v-if="statistics && form.amount" class="preview-section liquid-glass-card">
            <div class="preview-label caption1 liquid-text-secondary">记录后进度</div>
            <div class="preview-stats">
              <div class="stat-item">
                <span class="stat-value headline">{{ newProgress }}</span>
                <span class="stat-unit caption1">/ {{ goal?.target }} {{ goal?.unit }}</span>
              </div>
              <div class="stat-percentage headline">
                {{ newPercentage.toFixed(0) }}%
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="sheet-footer">
          <button @click="onCancel" class="liquid-glass-button">
            取消
          </button>
          <button
            @click="onConfirm"
            class="liquid-glass-button liquid-glass-button-primary"
            :disabled="!form.amount || Number(form.amount) <= 0"
          >
            确认记录
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Goal } from '~/types/goal'
import { toLocalISO } from '~/services/db'
import { useGoalProgress } from '~/composables/useGoalProgress'
import DateTimePicker from '~/app-modules/billing/components/DateTimePicker.vue'

const props = defineProps<{
  visible: boolean
  goal?: Goal
}>()

const emit = defineEmits<{
  confirm: [amount: number, date: string, notes?: string]
  cancel: []
}>()

const { isMobile } = useDevice()
const { calculateProgressStatistics } = useGoalProgress()
const amountInput = ref<HTMLInputElement>()

const form = reactive({
  amount: '',
  date: toLocalISO(),
  notes: ''
})

const statistics = computed(() => {
  if (!props.goal) return undefined
  return calculateProgressStatistics(props.goal)
})

const newProgress = computed(() => {
  if (!props.goal) return 0
  const amount = parseFloat(form.amount) || 0
  return props.goal.currentProgress + amount
})

const newPercentage = computed(() => {
  if (!props.goal || props.goal.target === 0) return 0
  return (newProgress.value / props.goal.target) * 100
})

watch(() => props.visible, (visible) => {
  if (visible) {
    // 重置表单
    form.amount = ''
    form.date = toLocalISO()
    form.notes = ''

    // 自动聚焦输入框
    nextTick(() => {
      amountInput.value?.focus()
    })
  }
})

function onConfirm() {
  const amount = parseFloat(form.amount)
  if (!amount || amount <= 0) return

  emit('confirm', amount, form.date, form.notes || undefined)
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.dialog-sheet {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--liquid-radius-lg) var(--liquid-radius-lg) 0 0;
}

.sheet-handle {
  width: 36px;
  height: 5px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  margin: 8px auto 4px;
  flex-shrink: 0;
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sheet-header {
  text-align: center;
  padding: 8px 0;
}

.goal-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-title {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.input-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.input-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-field label {
  font-weight: 500;
}

.unit-display {
  padding-bottom: 10px;
  color: var(--liquid-text-secondary);
}

.preview-section {
  padding: 16px;
}

.preview-label {
  margin-bottom: 8px;
}

.preview-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  color: var(--liquid-text-primary);
  font-weight: 600;
}

.stat-unit {
  color: var(--liquid-text-secondary);
}

.stat-percentage {
  color: rgb(0, 122, 255);
  font-weight: 600;
}

.sheet-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.sheet-footer button {
  flex: 1;
}

/* 桌面端适配 */
@media (min-width: 641px) {
  .dialog-overlay {
    align-items: center;
  }

  .dialog-sheet {
    border-radius: var(--liquid-radius-lg);
    max-height: 80vh;
  }

  .sheet-handle {
    display: none;
  }
}

/* 滚动条样式 */
.sheet-content::-webkit-scrollbar {
  width: 5px;
}

.sheet-content::-webkit-scrollbar-track {
  background: transparent;
}

.sheet-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}

.sheet-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}
</style>
