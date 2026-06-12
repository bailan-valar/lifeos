<script setup lang="ts">
import type { ReimbursementGroupFormData } from '~/types/reimbursement'

const props = defineProps<{
  visible: boolean
  initialData?: Partial<ReimbursementGroupFormData>
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', data: ReimbursementGroupFormData): void
}>()

const formData = ref<ReimbursementGroupFormData>({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
})

const isValid = computed(() => formData.value.title.trim().length > 0)

watch(() => props.visible, (val) => {
  if (val) {
    formData.value = {
      title: props.initialData?.title || '',
      description: props.initialData?.description || '',
    }
  }
})

function onConfirm() {
  if (!isValid.value) return
  emit('confirm', { ...formData.value })
  emit('update:visible', false)
}

function onClose() {
  emit('update:visible', false)
}
</script>

<template>
  <BaseDialog
    :visible="visible"
    :title="title || '创建报销单'"
    size="small"
    @update:visible="onClose"
  >
    <div class="reimburse-form">
      <div class="form-section">
        <label class="section-label">标题</label>
        <input
          v-model="formData.title"
          type="text"
          class="liquid-glass-input"
          placeholder="如：6月差旅报销"
          @keydown.enter="onConfirm"
        />
      </div>

      <div class="form-section">
        <label class="section-label">备注（选填）</label>
        <textarea
          v-model="formData.description"
          class="liquid-glass-input"
          rows="2"
          placeholder="可选备注信息"
        />
      </div>
    </div>

    <template #footer>
      <button class="liquid-glass-button" @click="onClose">取消</button>
      <button
        class="liquid-glass-button liquid-glass-button-primary"
        :disabled="!isValid"
        @click="onConfirm"
      >
        确认
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.reimburse-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 13px;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  font-weight: 500;
}
</style>
