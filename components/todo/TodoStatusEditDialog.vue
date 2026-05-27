<template>
  <div v-if="visible" class="todo-status-edit-dialog-overlay" @click.self="close">
    <div class="todo-status-edit-dialog">
      <div class="dialog-header">
        <h3>{{ isEditMode ? '编辑状态' : '新建状态' }}</h3>
        <button class="close-btn" type="button" @click="close">
          <Icon name="solar:close-circle-linear" size="24" />
        </button>
      </div>

      <div class="dialog-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label">状态名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="例如：待办、进行中、已完成"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">状态描述</label>
            <textarea
              v-model="formData.description"
              class="form-textarea"
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
                  <Icon :name="icon" size="20" />
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

          <div class="preview-section">
            <label class="form-label">预览</label>
            <div 
              class="status-preview"
              :style="{ 
                backgroundColor: `${formData.color}20`, 
                color: formData.color 
              }"
            >
              <Icon :name="formData.icon" size="16" />
              <span class="preview-text">{{ formData.name || '状态名称' }}</span>
            </div>
          </div>
        </form>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" type="button" @click="close">
          取消
        </button>
        <button class="save-btn" type="button" @click="handleSubmit" :disabled="!isValid">
          {{ isEditMode ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTodoStatus } from '~/composables/useTodoStatus'
import type { TodoStatus, TodoStatusFormData } from '~/types/todo'

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

const formData = ref<TodoStatusFormData>({
  name: '',
  icon: 'solar:round-circle-linear',
  color: '#3b82f6',
  description: '',
  isDefault: false
})

const availableIcons = [
  'solar:round-circle-linear',
  'solar:clock-circle-linear',
  'solar:pause-circle-linear',
  'solar:check-circle-linear',
  'solar:play-circle-linear',
  'solar:danger-circle-linear',
  'solar:info-circle-linear',
  'solar:star-circle-linear'
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
      isDefault: props.status.isDefault
    }
  } else if (newVal && !props.status) {
    // 新建模式：重置为默认值
    formData.value = {
      name: '',
      icon: 'solar:round-circle-linear',
      color: '#3b82f6',
      description: '',
      isDefault: false
    }
  }
})

function close() {
  emit('update:visible', false)
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
    alert(e instanceof Error ? e.message : '保存失败')
  }
}
</script>

<style scoped>
.todo-status-edit-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.todo-status-edit-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.12);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.dialog-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  transition: all 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
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
  border: 2px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: white;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-option:hover {
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
}

.icon-option.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.color-option {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: rgba(60, 60, 67, 0.4);
  box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(60, 60, 67, 0.4);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
  margin: 8px 0 0 0;
}

.preview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(60, 60, 67, 0.12);
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

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(60, 60, 67, 0.12);
}

.cancel-btn,
.save-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.cancel-btn:hover {
  background: rgba(60, 60, 67, 0.15);
}

.save-btn {
  background: #3b82f6;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.dialog-body::-webkit-scrollbar {
  width: 6px;
}

.dialog-body::-webkit-scrollbar-track {
  background: rgba(60, 60, 67, 0.05);
  border-radius: 3px;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}
</style>