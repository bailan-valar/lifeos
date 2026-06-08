<template>
  <div class="quick-add-bar">
    <div class="add-input-wrapper">
      <Icon name="solar:add-circle-linear" size="20" class="add-icon" />
      <input
        ref="inputRef"
        v-model="text"
        type="text"
        class="add-input"
        placeholder="添加新任务..."
        @keydown.enter="handleAdd"
        @keydown.esc="handleCancel"
      />
      <button
        v-if="text"
        class="send-btn"
        type="button"
        :disabled="loading"
        @click="handleAdd"
      >
        <Icon :name="loading ? ICONS.loading : ICONS.altArrowRight" size="18" />
      </button>
      <button
        v-if="showOptions"
        class="options-toggle"
        type="button"
        @click="showOptionPanel = !showOptionPanel"
      >
        <Icon name="solar:chart-square-linear" size="18" />
      </button>
    </div>

    <!-- 选项面板 -->
    <Transition name="slide-down">
      <div v-if="showOptionPanel" class="options-panel">
        <!-- 优先级 -->
        <div class="option-group">
          <span class="option-label">优先级</span>
          <div class="option-buttons">
            <button
              v-for="p in priorities"
              :key="p.value"
              class="option-btn priority-btn"
              :class="{ active: options.priority === p.value }"
              :style="{ borderColor: options.priority === p.value ? p.color : undefined }"
              type="button"
              @click="options.priority = p.value"
            >
              <Icon :name="p.icon" size="14" />
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- 截止日期 -->
        <div class="option-group">
          <span class="option-label">截止日期</span>
          <input
            :model-value="options.dueDate"
            type="date"
            class="date-input"
            @input="options.dueDate = ($event.target as HTMLInputElement).value || undefined"
          />
          <div class="quick-dates">
            <button
              v-for="d in quickDates"
              :key="d.value"
              class="quick-date-btn"
              :class="{ active: options.dueDate === d.value }"
              type="button"
              @click="options.dueDate = d.value"
            >
              {{ d.label }}
            </button>
          </div>
        </div>

        <!-- 类型 -->
        <div class="option-group">
          <span class="option-label">类型</span>
          <TodoTypePicker
            :model-value="options.typeId ?? null"
            @update:model-value="v => options.typeId = (v ?? undefined) as string | undefined"
          />
        </div>

        <!-- 状态 -->
        <div class="option-group">
          <span class="option-label">状态</span>
          <SelectPicker
            :model-value="options.statusId ?? null"
            :options="statusOptions"
            placeholder="选择状态"
            @update:model-value="v => options.statusId = (v ?? undefined) as string | undefined"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import { useTodoStatus } from '~/composables/useTodoStatus'
import TodoTypePicker from '~/components/todo/TodoTypePicker.vue'
import type { TodoItem } from '~/types/todo'

interface Props {
  showOptions?: boolean
}

interface Emits {
  (e: 'add', text: string, options: {
    dueDate?: string
    priority?: TodoItem['priority']
    typeId?: string
    statusId?: string
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  showOptions: true
})

const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement>()
const text = ref('')
const loading = ref(false)
const showOptionPanel = ref(false)

const options = reactive<{
  dueDate?: string
  priority?: TodoItem['priority']
  typeId?: string
  statusId?: string
}>({
  dueDate: undefined,
  priority: undefined,
  typeId: undefined,
  statusId: undefined
})

const { statuses } = useTodoStatus()

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const priorities = [
  { value: 'high' as const, label: '高', icon: 'solar:circle-bold', color: '#ef4444' },
  { value: 'medium' as const, label: '中', icon: 'solar:circle-bold', color: '#f59e0b' },
  { value: 'low' as const, label: '低', icon: 'solar:circle-bold', color: '#22c55e' },
  { value: 'none' as const, label: '无', icon: 'solar:circle-linear', color: 'rgba(60,60,67,0.3)' }
]

const quickDates = computed(() => {
  const today = new Date()

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  return [
    { value: formatDateLocal(today), label: '今天' },
    { value: formatDateLocal(tomorrow), label: '明天' },
    { value: formatDateLocal(nextWeek), label: '下周' }
  ]
})

const statusOptions = computed(() =>
  statuses.value.map((s: { id: string; name: string }) => ({ label: s.name, value: s.id }))
)

const handleAdd = () => {
  const trimmed = text.value.trim()
  if (!trimmed || loading.value) return

  loading.value = true
  emit('add', trimmed, {
    dueDate: options.dueDate,
    priority: options.priority,
    typeId: options.typeId,
    statusId: options.statusId
  })

  // 重置表单
  text.value = ''
  options.dueDate = undefined
  options.priority = undefined
  options.typeId = undefined
  options.statusId = undefined
  showOptionPanel.value = false

  nextTick(() => {
    loading.value = false
    inputRef.value?.focus()
  })
}

const handleCancel = () => {
  text.value = ''
  showOptionPanel.value = false
}

// 暴露 focus 方法
defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.quick-add-bar {
  background: var(--liquid-bg, rgba(255, 255, 255, 0.15));
  backdrop-filter: blur(var(--liquid-blur, 20px)) saturate(var(--liquid-saturate, 180%));
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: var(--liquid-radius, 20px);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.add-icon {
  color: rgba(60, 60, 67, 0.4);
  flex-shrink: 0;
}

.add-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.92);
  padding: 4px 0;
}

.add-input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.send-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0, 122, 255);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: rgb(0, 110, 250);
}

.send-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.options-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 60, 67, 0.08);
  border: none;
  border-radius: 8px;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.options-toggle:hover {
  background: rgba(60, 60, 67, 0.12);
  color: rgba(60, 60, 67, 0.8);
}

/* 选项面板 */
.options-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-btn:hover {
  background: rgba(60, 60, 67, 0.05);
}

.option-btn.active {
  background: currentColor;
  opacity: 0.15;
  font-weight: 500;
}

.date-input {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}

.date-input:focus {
  border-color: rgb(0, 122, 255);
}

.quick-dates {
  display: flex;
  gap: 8px;
}

.quick-date-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-date-btn:hover {
  background: rgba(60, 60, 67, 0.05);
}

.quick-date-btn.active {
  background: rgba(0, 122, 255, 0.15);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

/* SelectPicker 样式覆盖 */
:deep(.select-picker-trigger) {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
}

/* 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 300px;
  margin-top: 8px;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .add-input {
    color: rgba(255, 255, 255, 0.92);
  }

  .add-icon {
    color: rgba(255, 255, 255, 0.4);
  }

  .option-btn,
  .date-input,
  .quick-date-btn {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }

  .option-btn:hover,
  .quick-date-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .option-label {
    color: rgba(255, 255, 255, 0.6);
  }
}
</style>
