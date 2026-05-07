<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ isEditing ? '编辑账单' : '记一笔' }}</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <BillForm
            v-model="form"
            :accounts="accounts"
            :categories="categories"
            :note-options="noteOptions"
            @create-category="emit('create-category', $event)"
            @open-category-form="emit('open-category-form', $event)"
            @create-account="emit('create-account', $event)"
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
import type { Bill, BillFormData, Account, BillCategory, CategoryType, AccountCreatePayload } from '~/types/bill'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import BillForm from './BillForm.vue'

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  visible: boolean
  bill?: Bill
  accounts: Account[]
  categories: BillCategory[]
  noteOptions: NoteOption[]
  defaultNoteId?: string
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  confirm: [data: BillFormData, isEditing: boolean, id?: string]
  cancel: []
  'create-category': [data: { name: string; type: CategoryType; parentId?: string }]
  'open-category-form': [data: { type: CategoryType; defaultParentId?: string; defaultName?: string }]
  'create-account': [payload: AccountCreatePayload]
}>()

const form = ref<BillFormData>({
  noteId: '', type: 'expense', amount: 0, currency: 'CNY',
  fromAccountId: '', toAccountId: '', categoryId: '',
  description: '', date: new Date().toISOString().slice(0, 16),
  debtSubtype: 'lend', relatedPersonId: ''
})

const isEditing = computed(() => !!props.bill)

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.bill) {
    form.value = {
      noteId: props.bill.noteId,
      type: props.bill.type,
      amount: props.bill.amount,
      currency: props.bill.currency,
      fromAccountId: props.bill.fromAccountId,
      toAccountId: props.bill.toAccountId,
      categoryId: props.bill.categoryId,
      description: props.bill.description,
      date: props.bill.date.slice(0, 16),
      debtSubtype: props.bill.debtSubtype || 'lend',
      relatedPersonId: props.bill.relatedPersonId
    }
  } else {
    form.value = {
      noteId: props.defaultNoteId || '',
      type: 'expense', amount: 0, currency: 'CNY',
      fromAccountId: '', toAccountId: '', categoryId: '',
      description: '', date: new Date().toISOString().slice(0, 16),
      debtSubtype: 'lend', relatedPersonId: ''
    }
  }
})

function onConfirm() {
  if (form.value.amount <= 0) return
  const t = form.value.type
  if (t === 'expense' && !form.value.fromAccountId) return
  if (t === 'income' && !form.value.toAccountId) return
  if (t === 'transfer' && (!form.value.fromAccountId || !form.value.toAccountId)) return
  if (form.value.fromAccountId && form.value.toAccountId &&
      form.value.fromAccountId === form.value.toAccountId) return
  emit('confirm', form.value, isEditing.value, props.bill?.id)
}

function onCancel() {
  emit('cancel')
}

/* ---------- 外部调用：设置选中值（跨弹框联动） ---------- */
function setCategoryId(id: string) {
  form.value = { ...form.value, categoryId: id }
}
function setFromAccountId(id: string) {
  form.value = { ...form.value, fromAccountId: id }
}
function setToAccountId(id: string) {
  form.value = { ...form.value, toAccountId: id }
}

defineExpose({ setCategoryId, setFromAccountId, setToAccountId })
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
