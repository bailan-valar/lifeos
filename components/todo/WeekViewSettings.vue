<template>
  <BaseDialog
    v-model:visible="localVisible"
    title="周视图设置"
    size="small"
  >
    <div class="settings-content">
      <!-- 时间范围设置 -->
      <div class="setting-group">
        <h4 class="setting-title">时间范围</h4>
        <div class="time-range-inputs">
          <div class="time-input-group">
            <label>开始</label>
            <select v-model.number="localTimeStart" class="time-select">
              <option v-for="h in 24" :key="h" :value="h - 1">
                {{ h - 1 }}:00
              </option>
            </select>
          </div>
          <div class="time-input-group">
            <label>结束</label>
            <select v-model.number="localTimeEnd" class="time-select">
              <option v-for="h in 24" :key="h" :value="h">
                {{ h }}:00
              </option>
            </select>
          </div>
        </div>
        <p class="setting-hint">
          显示时间：{{ localTimeStart }}:00 - {{ localTimeEnd }}:00
        </p>
      </div>

      <!-- 颜色模式设置 -->
      <div class="setting-group">
        <h4 class="setting-title">任务颜色</h4>
        <div class="color-mode-options">
          <button
            v-for="mode in colorModes"
            :key="mode.value"
            class="color-mode-btn"
            :class="{ active: localColorMode === mode.value }"
            @click="localColorMode = mode.value"
          >
            <span class="mode-icon" :style="{ backgroundColor: mode.color }" />
            <span class="mode-label">{{ mode.label }}</span>
          </button>
        </div>
      </div>

      <!-- 颜色预览 -->
      <div class="setting-group">
        <h4 class="setting-title">颜色预览</h4>
        <div class="color-preview">
          <div
            v-for="item in colorPreview"
            :key="item.name"
            class="preview-item"
          >
            <span
              class="preview-color"
              :style="{ backgroundColor: item.color }"
            />
            <span class="preview-label">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn-secondary" @click="localVisible = false">
        取消
      </button>
      <button class="btn-primary" @click="handleSave">
        确定
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from '~/components/ui/BaseDialog.vue'

// 周视图颜色模式
type TodoColorMode = 'priority' | 'type' | 'status'

interface Props {
  visible?: boolean
  timeStart?: number
  timeEnd?: number
  colorMode?: TodoColorMode
}

const props = withDefaults(defineProps<Props>(), {
  timeStart: 8,
  timeEnd: 23,
  colorMode: 'priority'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'updateTimeRange': [start: number, end: number]
  'updateColorMode': [mode: TodoColorMode]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const localTimeStart = ref(props.timeStart)
const localTimeEnd = ref(props.timeEnd)
const localColorMode = ref<TodoColorMode>(props.colorMode)

// 颜色模式选项
const colorModes = computed(() => [
  { value: 'priority' as TodoColorMode, label: '按优先级', color: '#ef4444' },
  { value: 'type' as TodoColorMode, label: '按类型', color: '#3b82f6' },
  { value: 'status' as TodoColorMode, label: '按状态', color: '#8b5cf6' }
])

// 颜色预览
const colorPreview = computed(() => {
  switch (localColorMode.value) {
    case 'priority':
      return [
        { name: '高优先级', color: '#ef4444' },
        { name: '中优先级', color: '#f59e0b' },
        { name: '低优先级', color: '#22c55e' },
        { name: '无优先级', color: '#6b7280' }
      ]
    case 'type':
      return [
        { name: '类型 A', color: '#3b82f6' },
        { name: '类型 B', color: '#8b5cf6' },
        { name: '类型 C', color: '#ec4899' },
        { name: '无类型', color: '#6b7280' }
      ]
    case 'status':
      return [
        { name: '状态 A', color: '#8b5cf6' },
        { name: '状态 B', color: '#06b6d4' },
        { name: '状态 C', color: '#10b981' },
        { name: '无状态', color: '#6b7280' }
      ]
    default:
      return []
  }
})

function handleSave() {
  // 验证时间范围
  if (localTimeEnd.value <= localTimeStart.value) {
    localTimeEnd.value = localTimeStart.value + 1
  }

  emit('updateTimeRange', localTimeStart.value, localTimeEnd.value)
  emit('updateColorMode', localColorMode.value)
  localVisible.value = false
}

// 重置当对话框关闭时
watch(() => props.visible, (val) => {
  if (val) {
    localTimeStart.value = props.timeStart
    localTimeEnd.value = props.timeEnd
    localColorMode.value = props.colorMode
  }
})
</script>

<style scoped>
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.time-range-inputs {
  display: flex;
  gap: 16px;
}

.time-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-input-group label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.7);
}

.time-select {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button, 14px);
  background: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
}

.time-select:focus {
  outline: none;
  border-color: rgb(0, 122, 255);
}

.setting-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}

.color-mode-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.color-mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button, 14px);
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-mode-btn:hover {
  background: rgba(60, 60, 67, 0.05);
}

.color-mode-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
}

.mode-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.mode-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.75);
}

.color-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.preview-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.7);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: var(--liquid-radius-button, 14px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary {
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  background: rgba(255, 255, 255, 0.8);
  color: rgba(60, 60, 67, 0.8);
}

.btn-secondary:hover {
  background: rgba(60, 60, 67, 0.08);
}

.btn-primary {
  border: none;
  background: rgb(0, 122, 255);
  color: white;
}

.btn-primary:hover {
  background: rgb(0, 110, 250);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .setting-title {
    color: rgba(255, 255, 255, 0.85);
  }

  .time-select,
  .color-mode-btn,
  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .mode-label {
    color: rgba(255, 255, 255, 0.75);
  }
}
</style>
