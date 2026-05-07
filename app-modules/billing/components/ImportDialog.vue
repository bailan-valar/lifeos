<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog dialog-wide" @click.stop>
        <div class="dialog-header">
          <h3>导入账单</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <BillImportDialog
            ref="importRef"
            :note-id="noteId"
            :accounts="accounts"
            :categories="categories"
            :existing-fingerprints="existingFingerprints"
            @record-created="emit('record-created', $event)"
            @view-record="emit('view-record', $event)"
            @create-category="emit('create-category', $event)"
            @open-category-form="emit('open-category-form', $event)"
            @create-account="emit('create-account', $event)"
            @open-rule-dialog="emit('open-rule-dialog', $event)"
            @tab-change="emit('tab-change', $event)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Account, BillCategory, ImportRecord, CategoryType, AccountCreatePayload, ImportRuleFormData } from '~/types/bill'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import BillImportDialog from './BillImportDialog.vue'

const props = defineProps<{
  visible: boolean
  noteId: string
  accounts: Account[]
  categories: BillCategory[]
  existingFingerprints: Set<string>
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  cancel: []
  'record-created': [record: ImportRecord]
  'view-record': [recordId: string]
  'create-category': [data: { name: string; type: CategoryType; parentId?: string }]
  'open-category-form': [data: { type: CategoryType; defaultParentId?: string; defaultName?: string }]
  'create-account': [payload: AccountCreatePayload]
  'open-rule-dialog': [form: ImportRuleFormData]
  'tab-change': [tab: 'import' | 'history']
}>()

const importRef = ref<InstanceType<typeof BillImportDialog> | null>(null)

function onCancel() {
  emit('cancel')
}

function reset() {
  importRef.value?.reset()
}

defineExpose({ reset })
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
.dialog.dialog-wide {
  max-width: 760px;
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
</style>
