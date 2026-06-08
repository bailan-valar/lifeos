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
        <IconPicker v-model="form.icon" :icons="PRESET_ICON_SETS.todo" label="图标" />
      </div>

      <div class="form-group">
        <label>颜色</label>
        <div class="color-grid">
          <button
            v-for="color in PRESET_COLORS"
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
        <Icon :name="SOLAR_ICONS.action.save" :size="16" />
        <span>{{ isEditMode ? '保存' : '创建' }}</span>
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { SOLAR_ICONS, PRESET_ICON_SETS, PRESET_COLORS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import IconPicker from '~/components/IconPicker.vue'

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
  initialName?: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', type: TodoType): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  editType: null,
  initialName: ''
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

const isEditMode = computed(() => !!props.editType)

watch(() => props.visible, (visible) => {
  if (visible) {
    if (props.editType) {
      form.name = props.editType.name || ''
      form.icon = props.editType.icon || 'solar:check-circle-linear'
      form.color = props.editType.color || '#3b82f6'
      form.description = props.editType.description || ''
    } else {
      form.name = props.initialName || ''
      form.icon = 'solar:check-circle-linear'
      form.color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
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
  color: var(--liquid-text-primary, rgba(0, 0, 0, 0.7));
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
    color: var(--liquid-text-primary, rgba(255, 255, 255, 0.7));
  }

  .color-option.active {
    border-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
