<template>
  <Teleport to="body">
    <div class="dialog-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="emit('cancel')">
      <div class="dialog" :class="{ mobile: isMobile }" @click.stop>
        <div class="dialog-header">
          <h3>{{ editing ? '编辑规则' : '保存为规则' }}</h3>
          <button type="button" class="close-btn" @click="emit('cancel')">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <ImportRuleForm
            v-model="form"
            :accounts="accounts"
            :categories="categories"
          />
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="emit('cancel')">取消</button>
          <button type="button" class="confirm-btn" @click="emit('confirm', form)">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ImportRuleFormData, Account, BillCategory } from '~/types/bill'
import { getNextZIndex } from '~/composables/useZIndex'
import ImportRuleForm from './ImportRuleForm.vue'

const { isMobile } = useDevice()

const overlayZIndex = ref<number | undefined>(undefined)
onMounted(() => {
  overlayZIndex.value = getNextZIndex()
})

const props = defineProps<{
  form: ImportRuleFormData
  accounts: Account[]
  categories: BillCategory[]
  editing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:form', value: ImportRuleFormData): void
  (e: 'confirm', value: ImportRuleFormData): void
  (e: 'cancel'): void
}>()

const form = computed({
  get: () => props.form,
  set: (v) => emit('update:form', v)
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}
.dialog-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}
.dialog {
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}
.dialog.mobile {
  overflow: hidden;
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
  border-bottom: none;
}
.dialog.mobile .dialog-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
  flex-shrink: 0;
.dialog-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}
.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}
.dialog-body {
  padding: 20px;
}
.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
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
