<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ isEditing ? '编辑分类' : '添加分类' }}</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <CategoryForm
            v-model="form"
            :categories="categories"
            :exclude-id="excludeId"
            @create-category="emit('create-category', $event)"
          />
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="onCancel">取消</button>
          <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BillCategory, CategoryFormData, CategoryType } from '~/types/bill'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import CategoryForm from './CategoryForm.vue'

const props = defineProps<{
  visible: boolean
  category?: BillCategory
  categories: BillCategory[]
  excludeId?: string
  defaultType?: CategoryType
  defaultParentId?: string
  defaultName?: string
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  confirm: [data: CategoryFormData, isEditing: boolean, id?: string]
  cancel: []
  'create-category': [data: { name: string; type: CategoryType; parentId?: string }]
}>()

const form = ref<CategoryFormData>({ name: '', type: 'expense', parentId: '', icon: '', color: '' })

const isEditing = computed(() => !!props.category)

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.category) {
    form.value = {
      name: props.category.name,
      type: props.category.type,
      parentId: props.category.parentId,
      icon: props.category.icon || '',
      color: props.category.color || ''
    }
  } else {
    form.value = {
      name: props.defaultName || '',
      type: props.defaultType || 'expense',
      parentId: props.defaultParentId || '',
      icon: '',
      color: ''
    }
  }
})

function onConfirm() {
  if (!form.value.name.trim()) return
  emit('confirm', form.value, isEditing.value, props.category?.id)
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
}
.dialog-body {
  padding: 20px;
}
.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}
.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
}
</style>
