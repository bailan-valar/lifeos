<template>
  <BaseDialog
    :visible="visible"
    :title="isEditing ? '编辑账单' : '记一笔'"
    size="medium"
    @update:visible="onCancel"
  >
    <!-- 导入原数据卡片 -->
    <div v-if="importSourceItem" class="import-source-card">
      <div class="import-source-header">
        <Icon name="solar:file-import-linear" size="14" />
        <span class="import-source-title">导入原数据</span>
        <span class="import-source-tag">{{ importSourceLabel }}</span>
      </div>
      <div class="import-source-body">
        <div class="import-source-row">
          <span class="import-source-label">交易对方</span>
          <span class="import-source-value">{{ importSourceItem.counterparty || '-' }}</span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">商品说明</span>
          <span class="import-source-value">{{ importSourceItem.description || '-' }}</span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">金额</span>
          <span class="import-source-value" :class="importSourceItem.direction">
            {{ importSourceItem.direction === 'in' ? '+' : '-' }}{{ importSourceItem.amount.toFixed(2) }}
          </span>
        </div>
        <div class="import-source-row">
          <span class="import-source-label">时间</span>
          <span class="import-source-value">{{ importSourceItem.date }}</span>
        </div>
        <div v-if="importSourceItem.rawType" class="import-source-row">
          <span class="import-source-label">类型</span>
          <span class="import-source-value">{{ importSourceItem.rawType }}</span>
        </div>
        <div v-if="importSourceItem.paymentMethod" class="import-source-row">
          <span class="import-source-label">支付方式</span>
          <span class="import-source-value">{{ importSourceItem.paymentMethod }}</span>
        </div>
      </div>
    </div>

    <BillForm
      v-model="form"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      @keydown="onKeyDown"
    />

    <template #footer>
      <button type="button" class="cancel-btn" @click="onCancel">取消</button>
      <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Bill, BillFormData, Account, BillCategory, ImportRecordItem } from '~/types/bill'
import { useImportRecords } from '~/composables/useImportRecords'
import { useToast } from '~/composables/useToast'
import BillForm from './BillForm.vue'
import BaseDialog from '~/components/ui/BaseDialog.vue'

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
  defaultFormValues?: Partial<BillFormData>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [data: BillFormData, isEditing: boolean, id?: string]
  cancel: []
}>()

const { warning: showWarning } = useToast()

const form = ref<BillFormData>({
  noteId: '', type: 'expense', amount: 0, currency: 'CNY',
  fromAccountId: '', toAccountId: '', categoryId: '',
  description: '', date: new Date().toISOString().slice(0, 16),
  debtSubtype: 'lend', relatedPersonId: ''
})

const isEditing = computed(() => !!props.bill)

/* ---------- 导入原数据 ---------- */
const { getById } = useImportRecords()

const importSourceItem = computed<ImportRecordItem | null>(() => {
  const bill = props.bill
  if (!bill?.importBatchId || !bill.importFingerprint) return null
  const record = getById(bill.importBatchId)
  if (!record) return null
  return record.items.find(item => item.fingerprint === bill.importFingerprint) ?? null
})

const importSourceLabel = computed(() => {
  const bill = props.bill
  if (!bill?.importSource) return '导入'
  return bill.importSource === 'alipay' ? '支付宝' : bill.importSource === 'wechat' ? '微信' : '导入'
})

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
      date: props.bill.date?.slice(0, 16) || new Date().toISOString().slice(0, 16),
      debtSubtype: props.bill.debtSubtype || 'lend',
      relatedPersonId: props.bill.relatedPersonId
    }
  } else {
    const defaults = props.defaultFormValues || {}
    form.value = {
      noteId: props.defaultNoteId || '',
      type: defaults.type || 'expense',
      amount: 0,
      currency: defaults.currency || 'CNY',
      fromAccountId: defaults.fromAccountId || '',
      toAccountId: defaults.toAccountId || '',
      categoryId: defaults.categoryId || '',
      description: '',
      date: new Date().toISOString().slice(0, 16),
      debtSubtype: 'lend',
      relatedPersonId: ''
    }
  }
}, { immediate: true })

/* ---------- 类型切换时自动清空不匹配的分类 ---------- */
watch(() => form.value.type, (newType, oldType) => {
  if (!oldType || newType === oldType) return
  // 收入/支出切换时，检查当前分类是否匹配新类型
  if ((newType === 'income' || newType === 'expense') && form.value.categoryId) {
    const cat = props.categories.find(c => c.id === form.value.categoryId)
    if (!cat || cat.type !== newType) {
      form.value.categoryId = ''
    }
  }
  // 转账/借贷不需要分类
  if (newType === 'transfer' || newType === 'debt') {
    form.value.categoryId = ''
  }
})

function onConfirm() {
  if (form.value.amount <= 0) {
    showWarning('金额必须大于 0')
    return
  }
  const t = form.value.type
  if (t === 'expense' && !form.value.fromAccountId) {
    showWarning('支出需要选择出账账户')
    return
  }
  if (t === 'income' && !form.value.toAccountId) {
    showWarning('收入需要选择入账账户')
    return
  }
  if (t === 'transfer' && (!form.value.fromAccountId || !form.value.toAccountId)) {
    showWarning('转账需要同时选择出账和入账账户')
    return
  }
  if (form.value.fromAccountId && form.value.toAccountId &&
      form.value.fromAccountId === form.value.toAccountId) {
    showWarning('出账账户与入账账户不能相同')
    return
  }
  emit('confirm', form.value, isEditing.value, props.bill?.id)
}

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  }
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
.import-source-card {
  margin-bottom: 16px;
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(0, 122, 255, 0.02) 100%);
  overflow: hidden;
}

.import-source-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 122, 255, 0.06);
  border-bottom: 0.5px solid rgba(0, 122, 255, 0.12);
}

.import-source-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 122, 255, 0.9);
}

.import-source-tag {
  margin-left: auto;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.import-source-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.import-source-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.import-source-label {
  flex-shrink: 0;
  width: 60px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}

.import-source-value {
  color: rgba(0, 0, 0, 0.86);
  word-break: break-all;
}

.import-source-value.in {
  color: rgb(52, 199, 89);
  font-weight: 600;
}

.import-source-value.out {
  color: rgb(255, 59, 48);
  font-weight: 600;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--liquid-radius-button);
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
