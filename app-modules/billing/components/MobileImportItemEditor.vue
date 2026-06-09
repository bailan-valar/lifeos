<template>
  <BaseDialog
    :visible="visible"
    size="medium"
    :show-close="true"
    :close-on-overlay="true"
    :close-on-esc="true"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="editor-header">
        <div class="header-drag-bar" />
        <div class="header-content">
          <h4>编辑账单</h4>
        </div>
      </div>
    </template>

    <div class="editor-body">
            <!-- 基本信息卡片 -->
            <div class="info-card">
              <div class="info-row amount-row">
                <span class="amount" :class="amountClass">
                  {{ amountSign }}¥{{ formatAmount(editableItem.amount) }}
                </span>
                <span class="badge" :class="badgeClass">{{ badgeLabel }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">日期</span>
                <span class="info-value">{{ formatDate(editableItem.date) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">交易对方</span>
                <button
                  type="button"
                  class="info-value clickable"
                  :class="{ matched: editableItem.matchedAccountId }"
                  :disabled="editableItem.skipped"
                  @click="emit('save-counterparty-rule', editableItem)"
                >
                  {{ editableItem.counterparty || '(无对方)' }}
                  <Icon name="solar:bookmark-linear" size="12" />
                </button>
              </div>
              <div v-if="editableItem.description" class="info-row">
                <span class="info-label">描述</span>
                <button
                  type="button"
                  class="info-value clickable"
                  :class="{ matched: editableItem.descriptionRuleId }"
                  :disabled="editableItem.skipped"
                  @click="emit('save-description-rule', editableItem)"
                >
                  {{ editableItem.description }}
                  <Icon name="solar:bookmark-linear" size="12" />
                </button>
              </div>
              <div v-if="editableItem.paymentMethod" class="info-row">
                <span class="info-label">账户</span>
                <button
                  type="button"
                  class="info-value clickable"
                  :class="{ matched: editableItem.myAccountId }"
                  :disabled="editableItem.skipped"
                  @click="emit('save-payment-method-rule', editableItem)"
                >
                  {{ editableItem.paymentMethod }}
                  <Icon name="solar:bookmark-linear" size="12" />
                </button>
              </div>
              <div v-if="editableItem.rawType" class="info-row">
                <span class="info-label">原始类型</span>
                <button
                  type="button"
                  class="info-value clickable"
                  :class="{ matched: editableItem.rawTypeRuleId }"
                  :disabled="editableItem.skipped"
                  @click="emit('save-raw-type-rule', editableItem)"
                >
                  {{ editableItem.rawType }}
                  <Icon name="solar:bookmark-linear" size="12" />
                </button>
              </div>
            </div>

            <!-- 编辑区 -->
            <div class="edit-section">
              <div class="edit-row-group">
                <div class="edit-row">
                  <span class="edit-label">类型</span>
                  <BillTypePicker
                    :model-value="editableItem.type"
                    class="edit-picker"
                    @update:model-value="onTypeChange"
                  />
                </div>

                <div v-if="showCategory" class="edit-row">
                  <span class="edit-label">分类</span>
                  <CategoryPicker
                    :model-value="editableItem.categoryId || ''"
                    :categories="categories"
                    :type="editableItem.type === 'income' ? 'income' : 'expense'"
                    placeholder="未分类"
                    clearable
                    class="edit-picker"
                    @update:model-value="updateField('categoryId', $event)"
                  />
                </div>

                <div v-if="showDebtSubtype" class="edit-row">
                  <span class="edit-label">借贷类型</span>
                  <SelectPicker
                    :model-value="editableItem.debtSubtype ?? null"
                    :options="debtSubtypeOptions"
                    placeholder="借贷类型"
                    class="edit-picker"
                    @update:model-value="updateField('debtSubtype', $event as DebtSubtype)"
                  />
                </div>
              </div>

              <div class="edit-row-group account-group">
                <div class="edit-row">
                  <span class="edit-label">出账账户</span>
                  <AccountPicker
                    :model-value="editableItem.fromAccountId || ''"
                    :accounts="accounts"
                    placeholder="请选择"
                    clearable
                    class="edit-picker"
                    @update:model-value="updateField('fromAccountId', $event)"
                  />
                </div>

                <button type="button" class="swap-btn" @click="swapAccounts" title="交换账户">
                  <Icon :name="ICONS.callSplit" size="18" />
                </button>

                <div class="edit-row">
                  <span class="edit-label">入账账户</span>
                  <AccountPicker
                    :model-value="editableItem.toAccountId || ''"
                    :accounts="accounts"
                    placeholder="请选择"
                    clearable
                    class="edit-picker"
                    @update:model-value="updateField('toAccountId', $event)"
                  />
                </div>
              </div>

              <div class="edit-row">
                <span class="edit-label">绑定笔记</span>
                <NotePicker
                  :model-value="editableItem.noteId || ''"
                  :options="noteOptions"
                  placeholder="未选择"
                  clearable
                  class="edit-picker"
                  @update:model-value="updateField('noteId', $event)"
                />
              </div>
              <div class="edit-row">
                <span class="edit-label">备注</span>
                <textarea
                  v-model="remarkText"
                  class="edit-textarea"
                  rows="2"
                  placeholder="输入备注..."
                  @blur="updateField('remark', remarkText.trim() || undefined)"
                />
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-section">
              <button
                type="button"
                class="action-btn"
                :class="{ active: editableItem.remark }"
                @click="emit('edit-remark', editableItem)"
              >
                <Icon name="solar:pen-new-square-linear" size="16" />
                编辑备注
              </button>
              <button
                v-if="!editableItem.duplicate && !editableItem.skipped"
                type="button"
                class="action-btn save-rule"
                @click="emit('save-as-rule', editableItem)"
              >
                <Icon name="solar:bookmark-linear" size="16" />
                保存为规则
              </button>
            </div>
    </div>

    <template #footer>
      <div class="editor-footer">
        <button
          type="button"
          class="nav-btn"
          :disabled="!canPrev"
          @click="emit('navigate', 'prev')"
        >
          <Icon name="solar:alt-arrow-left-linear" size="16" />
          上一个
        </button>
        <button
          type="button"
          class="nav-btn primary"
          :disabled="!canNextIncomplete"
          @click="emit('navigate', 'next-incomplete')"
        >
          下一个未完善
        </button>
        <button
          type="button"
          class="nav-btn"
          :disabled="!canNext"
          @click="emit('navigate', 'next')"
        >
          下一个
          <Icon name="solar:alt-arrow-right-linear" size="16" />
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  BillType,
  DebtSubtype,
  ImportRecordItem
} from '~/types/bill'
import { computed, ref, watch } from 'vue'
import { suggestAccountIds } from '~/composables/useAccountMatcher'
import { useNotes } from '~/composables/useNotes'
import { ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import BillTypePicker from './BillTypePicker.vue'
import SelectPicker from '~/components/SelectPicker.vue'
import NotePicker from './NotePicker.vue'

const props = defineProps<{
  visible: boolean
  item: ImportRecordItem
  accounts: Account[]
  categories: BillCategory[]
  currentIndex: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  hasNextIncomplete: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:item', value: ImportRecordItem): void
  (e: 'navigate', direction: 'prev' | 'next' | 'next-incomplete'): void
  (e: 'save-as-rule', item: ImportRecordItem): void
  (e: 'save-counterparty-rule', item: ImportRecordItem): void
  (e: 'save-payment-method-rule', item: ImportRecordItem): void
  (e: 'save-description-rule', item: ImportRecordItem): void
  (e: 'save-raw-type-rule', item: ImportRecordItem): void
  (e: 'edit-remark', item: ImportRecordItem): void
}>()

const editableItem = ref<ImportRecordItem>({ ...props.item })
const remarkText = ref('')
const { noteOptions } = useNotes()

watch(() => props.item, (newItem) => {
  editableItem.value = { ...newItem }
  remarkText.value = newItem.remark || ''
}, { immediate: true })

function updateField<K extends keyof ImportRecordItem>(key: K, value: ImportRecordItem[K]) {
  editableItem.value = { ...editableItem.value, [key]: value }
  emit('update:item', { ...editableItem.value })
}

function onTypeChange(t: BillType | null) {
  if (!t) return
  const counterpartyAccount = props.accounts.find(a => a.id === editableItem.value.matchedAccountId) || null
  const myAccount = props.accounts.find(a => a.id === editableItem.value.myAccountId) || null
  const suggestion = suggestAccountIds(counterpartyAccount, myAccount, editableItem.value.direction, t)
  const next: ImportRecordItem = { ...editableItem.value, type: t }

  if (t === 'income') {
    next.fromAccountId = ''
    if (!props.categories.some(c => c.id === next.categoryId && c.type === 'income')) {
      next.categoryId = ''
    }
  } else if (t === 'expense') {
    next.toAccountId = ''
    if (!props.categories.some(c => c.id === next.categoryId && c.type === 'expense')) {
      next.categoryId = ''
    }
  } else {
    next.categoryId = ''
  }

  if (counterpartyAccount || myAccount) {
    if (!next.fromAccountId && suggestion.fromAccountId) next.fromAccountId = suggestion.fromAccountId
    if (!next.toAccountId && suggestion.toAccountId) next.toAccountId = suggestion.toAccountId
  }

  editableItem.value = next
  emit('update:item', next)
}

function swapAccounts() {
  const from = editableItem.value.fromAccountId
  const to = editableItem.value.toAccountId
  const next = { ...editableItem.value, fromAccountId: to, toAccountId: from }
  editableItem.value = next
  emit('update:item', next)
}

const amountClass = computed(() => (editableItem.value.direction === 'in' ? 'income' : 'expense'))
const amountSign = computed(() => (editableItem.value.direction === 'in' ? '+' : '-'))
const showCategory = computed(() => editableItem.value.type === 'income' || editableItem.value.type === 'expense')
const showDebtSubtype = computed(() => editableItem.value.type === 'debt')

const debtSubtypeOptions = [
  { value: 'lend' as const, label: '借出' },
  { value: 'borrow' as const, label: '借入' }
]

function formatAmount(n: number): string {
  return n.toFixed(2)
}

function formatDate(date: string): string {
  return date.length >= 16 ? date.slice(0, 16).replace('T', ' ') : date
}

const badgeLabel = computed(() => {
  if (editableItem.value.skipped) return editableItem.value.skipReason || '跳过'
  if (editableItem.value.duplicate) return '重复'
  if (isIncomplete(editableItem.value)) return '未完善'
  return '已完善'
})

const badgeClass = computed(() => {
  if (editableItem.value.skipped) return 'skipped'
  if (editableItem.value.duplicate) return 'duplicate'
  if (isIncomplete(editableItem.value)) return 'incomplete'
  return 'completed'
})

function isIncomplete(row: ImportRecordItem): boolean {
  if ((row.type === 'income' || row.type === 'expense') && !row.categoryId) return true
  if (row.type === 'expense' && !row.fromAccountId) return true
  if (row.type === 'income' && !row.toAccountId) return true
  if ((row.type === 'transfer' || row.type === 'debt') && (!row.fromAccountId || !row.toAccountId)) return true
  return false
}

function onClose() {
  emit('update:visible', false)
}

const canPrev = computed(() => props.hasPrev)
const canNext = computed(() => props.hasNext)
const canNextIncomplete = computed(() => props.hasNextIncomplete)
</script>

<style scoped>
:deep(.dialog-header) {
  padding: 8px 20px 0;
}

:deep(.dialog-body) {
  padding: 16px;
}

:deep(.dialog-footer) {
  padding: 0;
  border: none;
}

.editor-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.header-drag-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(60, 60, 67, 0.2);
  margin-bottom: 8px;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
}

.header-content h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.editor-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.amount-row {
  padding-bottom: 8px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
}

.amount {
  font-size: 22px;
  font-weight: 700;
}

.amount.income {
  color: rgb(52, 199, 89);
}

.amount.expense {
  color: rgb(255, 59, 48);
}

.info-label {
  color: rgba(60, 60, 67, 0.6);
  font-size: 13px;
  flex-shrink: 0;
}

.info-value {
  color: rgba(0, 0, 0, 0.86);
  font-size: 13px;
  text-align: right;
  word-break: break-all;
}

.info-value.clickable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.86);
  font-size: 13px;
  transition: all 0.15s ease;
}

.info-value.clickable:not(:disabled):active {
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
}

.info-value.clickable.matched {
  color: rgb(0, 122, 255);
}

.info-value.clickable:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}

.badge.skipped {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.6);
}

.badge.duplicate {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.badge.incomplete {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.badge.completed {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.edit-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-row-group {
  display: flex;
  gap: 12px;
}

.edit-row-group.account-group {
  align-items: flex-end;
}

.edit-row-group.account-group .swap-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-bottom: 1px;
}

.edit-row-group.account-group .swap-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.edit-row-group.account-group .swap-btn:active {
  background: rgba(0, 122, 255, 0.12);
  transform: scale(0.95);
}

.edit-row-group > .edit-row {
  flex: 1;
  min-width: 0;
}

.edit-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.72);
}

.edit-picker {
  width: 100%;
}

:deep(.edit-picker .picker-trigger) {
  padding: 10px 12px;
  font-size: 14px;
}

.edit-textarea {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  resize: vertical;
  font-family: inherit;
  min-height: 60px;
}

.edit-textarea:focus {
  border-color: rgb(0, 122, 255);
}

.action-section {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(60, 60, 67, 0.78);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:active {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.action-btn.active {
  background: rgba(255, 149, 0, 0.08);
  border-color: rgba(255, 149, 0, 0.3);
  color: rgb(255, 149, 0);
}

.action-btn.save-rule {
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.2);
  background: rgba(0, 122, 255, 0.04);
}

.editor-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.nav-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.78);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-btn:active:not(:disabled) {
  background: rgba(60, 60, 67, 0.14);
}

.nav-btn.primary {
  background: rgb(0, 122, 255);
  color: white;
  flex: 1.2;
}

.nav-btn.primary:active:not(:disabled) {
  background: rgb(0, 100, 220);
}

/* Transition handled by BaseDialog */
</style>
