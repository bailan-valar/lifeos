<template>
  <div class="todo-type-picker">
    <SelectPicker
      :model-value="modelValue"
      :options="typeOptions"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      searchable
      creatable
      quick-create-text="创建新类型"
      @update:model-value="emit('update:modelValue', $event)"
      @create="onQuickCreate"
    >
      <template #default="{ option }">
        <div class="type-option">
          <div class="type-option-icon" :style="{ background: `${option.color}20`, color: option.color }">
            <Icon :name="option.icon || 'solar:folder-linear'" :size="16" />
          </div>
          <span>{{ option.label }}</span>
        </div>
      </template>
    </SelectPicker>

    <!-- 快捷创建弹窗 -->
    <Teleport to="body">
      <Transition name="quick-create-fade">
        <div v-if="quickCreateForm.visible" class="quick-create-overlay" @click.self="onCancelQuickCreate">
          <div class="quick-create-dialog liquid-glass">
            <h4>创建新待办类型</h4>

            <div class="form-group">
              <label>类型名称</label>
              <input
                v-model="quickCreateForm.name"
                ref="quickCreateInput"
                type="text"
                class="liquid-glass-input"
                placeholder="输入类型名称"
                @keydown.enter="onConfirmQuickCreate"
              />
            </div>

            <div class="form-group">
              <label>图标</label>
              <div class="icon-grid">
                <button
                  v-for="icon in presetIcons"
                  :key="icon"
                  type="button"
                  class="icon-option liquid-glass"
                  :class="{ active: quickCreateForm.icon === icon }"
                  @click="quickCreateForm.icon = icon"
                >
                  <Icon :name="icon" :size="20" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>颜色</label>
              <div class="color-grid">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="color-option"
                  :class="{ active: quickCreateForm.color === color }"
                  :style="{ background: color }"
                  @click="quickCreateForm.color = color"
                />
              </div>
            </div>

            <div class="quick-create-actions">
              <button class="liquid-glass-button" @click="onCancelQuickCreate" type="button">
                取消
              </button>
              <button
                class="liquid-glass-button liquid-glass-button-primary"
                @click="onConfirmQuickCreate"
                type="button"
              >
                <Icon :name="SOLAR_ICONS.action.save || 'solar:check-circle-linear'" :size="16" />
                <span>创建并选择</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import SelectPicker from '~/components/SelectPicker.vue'

interface TodoType {
  id: string
  name: string
  icon: string
  color: string
  order: number
}

interface Props {
  modelValue: string | null
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择类型（可选）',
  clearable: true,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'created': [type: TodoType]
}>()

const todoTypes = ref<TodoType[]>([])
const quickCreateInput = ref<HTMLInputElement | null>(null)

const quickCreateForm = reactive<{
  visible: boolean
  name: string
  icon: string
  color: string
}>({
  visible: false,
  name: '',
  icon: 'solar:check-circle-linear',
  color: '#3b82f6'
})

const presetIcons = [
  'solar:check-circle-linear',
  'solar:star-linear',
  'solar:heart-linear',
  'solar:flag-linear',
  'solar:bookmark-linear',
  'solar:tag-linear',
  'solar:briefcase-linear',
  'solar:home-linear'
]

const presetColors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
]

const typeOptions = computed(() => {
  return todoTypes.value.map(type => ({
    value: type.id,
    label: type.name,
    icon: type.icon,
    color: type.color
  }))
})

const loadTodoTypes = async () => {
  try {
    const { getDB } = await import('~/services/db')
    const db = await getDB()
    const docs = await db.todo_types.find().exec()
    todoTypes.value = docs.map(doc => doc.toJSON()) as TodoType[]
  } catch (error) {
    console.error('加载待办类型失败:', error)
  }
}

const onQuickCreate = (typeName: string) => {
  quickCreateForm.visible = true
  quickCreateForm.name = typeName
  quickCreateForm.icon = 'solar:check-circle-linear'
  quickCreateForm.color = presetColors[Math.floor(Math.random() * presetColors.length)]
}

const onConfirmQuickCreate = async () => {
  if (!quickCreateForm.name.trim()) return

  try {
    const { getDB, generateId, now } = await import('~/services/db')
    const db = await getDB()

    const maxOrder = Math.max(0, ...todoTypes.value.map(t => t.order || 0))
    const newType: TodoType = {
      id: generateId(),
      name: quickCreateForm.name.trim(),
      icon: quickCreateForm.icon,
      color: quickCreateForm.color,
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now()
    } as TodoType

    await db.todo_types.insert(newType)
    await loadTodoTypes()

    emit('update:modelValue', newType.id)
    emit('created', newType)
    quickCreateForm.visible = false
  } catch (error) {
    console.error('创建待办类型失败:', error)
  }
}

const onCancelQuickCreate = () => {
  quickCreateForm.visible = false
}

watch(() => quickCreateForm.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      quickCreateInput.value?.focus()
      quickCreateInput.value?.select()
    })
  }
})

onMounted(() => {
  loadTodoTypes()
})
</script>

<style scoped>
.todo-type-picker {
  width: 100%;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-option-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 快捷创建弹窗样式 */
.quick-create-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.quick-create-dialog {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border-radius: var(--liquid-radius);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
}

.quick-create-dialog h4 {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.quick-create-dialog .form-group {
  margin-bottom: 16px;
}

.quick-create-dialog .form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.7);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.icon-option {
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: var(--liquid-radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgba(0, 0, 0, 0.5);
}

.icon-option:hover {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
}

.icon-option.active {
  background: rgba(0, 122, 255, 0.15);
  border-color: rgb(0, 122, 255);
  color: rgb(0, 122, 255);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-option {
  aspect-ratio: 1;
  border: 2px solid transparent;
  border-radius: var(--liquid-radius-button);
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}

.quick-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.quick-create-fade-enter-active,
.quick-create-fade-leave-active {
  transition: opacity 0.2s ease;
}

.quick-create-fade-enter-from,
.quick-create-fade-leave-to {
  opacity: 0;
}

.quick-create-fade-enter-active .quick-create-dialog,
.quick-create-fade-leave-active .quick-create-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.quick-create-fade-enter-from .quick-create-dialog,
.quick-create-fade-leave-to .quick-create-dialog {
  transform: scale(0.95);
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  .quick-create-overlay {
    background: rgba(0, 0, 0, 0.6);
  }

  .quick-create-dialog h4 {
    color: rgba(255, 255, 255, 0.92);
  }

  .quick-create-dialog .form-group label {
    color: rgba(255, 255, 255, 0.7);
  }

  .icon-option {
    color: rgba(255, 255, 255, 0.5);
  }

  .icon-option:hover {
    background: rgba(0, 122, 255, 0.2);
  }

  .color-option.active {
    border-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
