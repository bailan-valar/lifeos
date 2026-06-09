<template>
  <BaseDialog
    v-model:visible="internalVisible"
    :title="isEditMode ? '编辑状态' : '新建状态'"
    size="medium"
    @opened="onOpened"
  >
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">状态名称</label>
        <input
          v-model="formData.name"
          type="text"
          class="liquid-glass-input"
          placeholder="例如：待办、进行中、已完成"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">状态描述</label>
        <textarea
          v-model="formData.description"
          class="liquid-glass-input"
          placeholder="简单描述此状态的含义"
          rows="2"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">图标</label>
          <div class="icon-selector">
            <button
              v-for="icon in availableIcons"
              :key="icon"
              type="button"
              class="icon-option"
              :class="{ active: formData.icon === icon }"
              @click="formData.icon = icon"
            >
              <Icon :name="icon || 'solar:info-circle-linear'" size="20" />
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">颜色</label>
          <div class="color-selector">
            <button
              v-for="color in availableColors"
              :key="color"
              type="button"
              class="color-option"
              :class="{ active: formData.color === color }"
              :style="{ backgroundColor: color }"
              @click="formData.color = color"
            />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-checkbox">
          <input
            v-model="formData.isDefault"
            type="checkbox"
            class="checkbox-input"
          />
          <span>设为默认状态</span>
        </label>
        <p class="form-hint">
          默认状态将用于新建待办时的初始状态
        </p>
      </div>

      <div class="form-group">
        <label class="form-checkbox">
          <input
            v-model="formData.isCompleted"
            type="checkbox"
            class="checkbox-input"
          />
          <span>标记为完成状态</span>
        </label>
        <p class="form-hint">
          标记为完成状态的任务将计入完成统计
        </p>
      </div>

      <div class="preview-section">
        <label class="form-label">预览</label>
        <div
          class="status-preview"
          :style="{
            backgroundColor: `${formData.color}20`,
            color: formData.color
          }"
        >
          <Icon :name="formData.icon || 'solar:info-circle-linear'" size="16" />
          <span class="preview-text">{{ formData.name || '状态名称' }}</span>
        </div>
      </div>
    </form>

    <template #footer>
      <button class="liquid-glass-button" type="button" @click="close">
        取消
      </button>
      <button
        class="liquid-glass-button liquid-glass-button-primary"
        type="button"
        :disabled="!isValid"
        @click="handleSubmit"
      >
        {{ isEditMode ? '保存' : '创建' }}
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import { ICONS } from '~/composables/useIcons'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useToast } from '~/composables/useToast'
import type { TodoStatus, TodoStatusFormData } from '~/types/todo'

const { error: showError } = useToast()

interface Props {
  visible: boolean
  status?: TodoStatus | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'save', status: TodoStatus): void
  (e: 'create', status: TodoStatus): void
}>()

const { createStatus, updateStatus } = useTodoStatus()

// 内部 visible 状态，用于 v-model 绑定
const internalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formData = ref<TodoStatusFormData>({
  name: '',
  icon: ICONS.round,
  color: '#3b82f6',
  description: '',
  isDefault: false,
  isCompleted: false
})

const availableIcons = [
  ICONS.round,
  ICONS.clockCircle,
  ICONS.pauseCircle,
  ICONS.checkCircle,
  ICONS.playCircle,
  ICONS.dangerCircle,
  ICONS.infoCircle,
  ICONS.starCircle
]

const availableColors = [
  '#3b82f6', // 蓝色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#10b981', // 绿色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#84cc16'  // 黄绿色
]

const isEditMode = computed(() => !!props.status)

const isValid = computed(() => {
  return formData.value.name.trim().length > 0
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.status) {
    // 编辑模式：填充现有数据
    formData.value = {
      name: props.status.name,
      icon: props.status.icon,
      color: props.status.color,
      description: props.status.description || '',
      isDefault: props.status.isDefault,
      isCompleted: props.status.isCompleted || false
    }
  } else if (newVal && !props.status) {
    // 新建模式：重置为默认值
    formData.value = {
      name: '',
      icon: ICONS.round,
      color: '#3b82f6',
      description: '',
      isDefault: false,
      isCompleted: false
    }
  }
})

function close() {
  internalVisible.value = false
}

function onOpened() {
  // 弹框打开后的回调
}

async function handleSubmit() {
  if (!isValid.value) return

  try {
    if (isEditMode.value && props.status) {
      await updateStatus(props.status.id, formData.value)
      emit('save', { ...props.status, ...formData.value })
    } else {
      const newStatus = await createStatus(formData.value)
      emit('create', newStatus)
    }
    close()
  } catch (e) {
    showError(e instanceof Error ? e.message : '保存失败')
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
  margin-bottom: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.icon-selector,
.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: var(--liquid-bg-thin, rgba(255, 255, 255, 0.5));
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-option:hover {
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
  background: var(--liquid-bg, rgba(255, 255, 255, 0.7));
}

.icon-option.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.color-option {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: rgba(60, 60, 67, 0.3);
  box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(60, 60, 67, 0.3);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: rgb(0, 122, 255);
}

.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  margin: 6px 0 0 24px;
}

.preview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.status-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.preview-text {
  line-height: 1;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .form-label {
    color: rgba(255, 255, 255, 0.8);
  }

  .icon-option {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.6);
  }

  .icon-option:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgb(0, 122, 255);
  }

  .icon-option.active {
    background: rgba(0, 122, 255, 0.15);
    color: rgb(0, 122, 255);
  }

  .color-option.active {
    box-shadow: 0 0 0 2px rgba(30, 30, 30, 1), 0 0 0 4px rgba(255, 255, 255, 0.3);
  }

  .form-hint {
    color: rgba(255, 255, 255, 0.5);
  }

  .preview-section {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
