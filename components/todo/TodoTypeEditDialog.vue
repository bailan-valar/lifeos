<template>
  <BaseDialog
    v-model:visible="internalVisible"
    :title="isEditMode ? '编辑类型' : '创建新待办类型'"
    size="small"
  >
    <div class="edit-form">
      <div class="form-group">
        <label>名称</label>
        <input
          ref="nameInput"
          v-model="form.name"
          type="text"
          class="liquid-glass-input"
          placeholder="待办类型名称"
          @keydown.enter="onConfirm"
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
            :class="{ active: form.icon === icon }"
            @click="form.icon = icon"
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
            :class="{ active: form.color === color }"
            :style="{ background: color }"
            @click="form.color = color"
          />
        </div>
      </div>

      <div class="form-group">
        <label>描述</label>
        <input
          v-model="form.description"
          type="text"
          class="liquid-glass-input"
          placeholder="可选描述"
        />
      </div>
    </div>

    <template #footer>
      <button class="liquid-glass-button" @click="onCancel" type="button">
        取消
      </button>
      <button class="liquid-glass-button liquid-glass-button-primary" type="button" @click="onConfirm">
        <Icon :name="SOLAR_ICONS.action.save || 'solar:check-circle-linear'" :size="16" />
        <span>{{ isEditMode ? '保存' : '创建' }}</span>
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'

interface TodoType {
  id?: string
  name: string
  icon: string
  color: string
  description?: string
  order?: number
  createdAt?: string
  updatedAt?: string
}

interface Props {
  visible?: boolean
  editType?: TodoType | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', type: TodoType): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  editType: null
})

const emit = defineEmits<Emits>()

const nameInput = ref<HTMLInputElement | null>(null)

const internalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const form = reactive<{
  name: string
  icon: string
  color: string
  description: string
}>({
  name: '',
  icon: 'solar:check-circle-linear',
  color: '#3b82f6',
  description: ''
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

const isEditMode = computed(() => !!props.editType)

watch(() => props.visible, (visible) => {
  if (visible) {
    if (props.editType) {
      form.name = props.editType.name || ''
      form.icon = props.editType.icon || 'solar:check-circle-linear'
      form.color = props.editType.color || '#3b82f6'
      form.description = props.editType.description || ''
    } else {
      form.name = ''
      form.icon = 'solar:check-circle-linear'
      form.color = presetColors[Math.floor(Math.random() * presetColors.length)]
      form.description = ''
    }
    nextTick(() => {
      nameInput.value?.focus()
    })
  }
})

const onConfirm = () => {
  if (!form.name.trim()) {
    nameInput.value?.focus()
    return
  }

  const typeData: TodoType = {
    id: props.editType?.id,
    name: form.name.trim(),
    icon: form.icon,
    color: form.color,
    description: form.description.trim(),
    order: props.editType?.order,
    createdAt: props.editType?.createdAt,
    updatedAt: props.editType?.updatedAt
  }

  emit('save', typeData)
  internalVisible.value = false
}

const onCancel = () => {
  internalVisible.value = false
}
</script>

<style scoped>
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
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

@media (prefers-color-scheme: dark) {
  .form-group label {
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
