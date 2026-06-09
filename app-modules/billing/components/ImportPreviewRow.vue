<template>
  <div
    class="preview-row"
    :class="{ duplicate: row.duplicate, selected: row.selected, skipped: row.skipped, 'mobile-row': isMobile }"
    @click="onRowClick"
  >
    <label class="select-cell" @click.stop>
      <input
        type="checkbox"
        :checked="row.selected"
        :disabled="row.duplicate || row.skipped"
        @change="updateField('selected', ($event.target as HTMLInputElement).checked)"
      />
    </label>

    <!-- 桌面端布局 -->
    <template v-if="!isMobile">
      <div class="primary-cell">
        <div class="primary-line">
          <span
            class="counterparty"
            :class="{ matched: row.matchedAccountId, clickable: !row.skipped }"
            @click.stop="!row.skipped && emit('save-counterparty-rule', row)"
          >{{ row.counterparty || '(无对方)' }}</span>
          <span
            v-if="row.description"
            class="description"
            :class="{ matched: row.descriptionRuleId, clickable: !row.skipped }"
            @click.stop="!row.skipped && emit('save-description-rule', row)"
          >{{ row.description }}</span>
        </div>
        <div class="meta-line">
          <span class="date">{{ formatDate(row.date) }}</span>
          <span
            v-if="row.rawType"
            class="raw-type"
            :class="{ matched: row.rawTypeRuleId, clickable: !row.skipped }"
            @click.stop="!row.skipped && emit('save-raw-type-rule', row)"
          >{{ row.rawType }}</span>
          <span
            v-if="row.paymentMethod"
            class="payment-method"
            :class="{ matched: row.myAccountId, clickable: !row.skipped }"
            @click.stop="!row.skipped && emit('save-payment-method-rule', row)"
          >{{ row.paymentMethod }}</span>
        </div>
      </div>

      <div class="amount-cell" :class="amountClass">
        <template v-if="row.skipped">
          <span class="skip-label">跳过</span>
        </template>
        <template v-else>
          {{ amountSign }}¥{{ formatAmount(row.amount) }}
        </template>
      </div>

      <div class="actions-cell" @click.stop>
        <span class="badge" :class="badgeClass" :title="badgeTooltip">{{ badgeLabel }}</span>
        <button
          v-if="!row.duplicate && !row.skipped"
          type="button"
          class="action-btn save-rule-btn"
          title="逐一编辑"
          @click="$emit('open-mobile-editor', row)"
        >
          <Icon name="solar:pen-new-square-linear" size="14" />
          <span class="save-rule-text">编辑</span>
        </button>
      </div>

      <div class="controls-row controls-row-1">
        <BillTypePicker
          :model-value="row.type"
          class="type-picker"
          @update:model-value="onTypeChange($event as BillType)"
        />

        <CategoryPicker
          v-if="showCategory"
          :model-value="row.categoryId || ''"
          :categories="categories"
          :type="row.type === 'income' ? 'income' : 'expense'"
          placeholder="未分类"
          clearable
          class="compact-picker"
          @update:model-value="updateField('categoryId', $event)"
        />

        <NotePicker
          :model-value="row.noteId || ''"
          :options="noteOptions"
          placeholder="绑定笔记"
          clearable
          class="compact-picker"
          @update:model-value="updateField('noteId', $event)"
        />
      </div>

      <div class="controls-row controls-row-2">
        <AccountPicker
          v-if="showFrom"
          :model-value="row.fromAccountId || ''"
          :accounts="accounts"
          placeholder="出账账户"
          clearable
          class="compact-picker"
          @update:model-value="updateField('fromAccountId', $event)"
        />

        <AccountPicker
          v-if="showTo"
          :model-value="row.toAccountId || ''"
          :accounts="accounts"
          placeholder="入账账户"
          clearable
          class="compact-picker"
          @update:model-value="updateField('toAccountId', $event)"
        />

        <SelectPicker
          v-if="showDebtSubtype"
          :model-value="row.debtSubtype ?? null"
          :options="debtSubtypeOptions"
          placeholder="借贷类型"
          class="compact-picker"
          @update:model-value="updateField('debtSubtype', $event as DebtSubtype)"
        />
      </div>
    </template>

    <!-- 移动端布局 -->
    <template v-else>
      <div class="mobile-content">
        <div class="mobile-line mobile-line-main">
          <span class="mobile-counterparty">{{ row.counterparty || '(无对方)' }}</span>
          <span class="mobile-amount" :class="amountClass">
            <template v-if="row.skipped">跳过</template>
            <template v-else>{{ amountSign }}¥{{ formatAmount(row.amount) }}</template>
          </span>
        </div>

        <div class="mobile-line">
          <span v-if="row.description" class="mobile-description">{{ row.description }}</span>
          <span class="badge" :class="badgeClass">{{ badgeLabel }}</span>
        </div>

        <div class="mobile-line mobile-line-meta">
          <span class="mobile-date">{{ formatDate(row.date) }}</span>
          <span v-if="row.paymentMethod" class="mobile-payment">{{ row.paymentMethod }}</span>
        </div>

        <div class="mobile-line mobile-line-tags">
          <span class="mobile-type-tag" :class="row.type">{{ typeLabel }}</span>
          <span v-if="categoryName" class="mobile-category-tag">{{ categoryName }}</span>
          <span v-if="debtSubtypeLabel" class="mobile-subtype-tag">{{ debtSubtypeLabel }}</span>
        </div>

        <div v-if="fromAccountName || toAccountName" class="mobile-line mobile-line-accounts">
          <span v-if="fromAccountName" class="mobile-account from">{{ fromAccountName }}</span>
          <span class="mobile-arrow">→</span>
          <span v-if="toAccountName" class="mobile-account to">{{ toAccountName }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  BillType,
  DebtSubtype,
  ImportRecordItem,
  ImportRule
} from '~/types/bill'
import { suggestAccountIds } from '~/composables/useAccountMatcher'
import { useNotes } from '~/composables/useNotes'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import NotePicker from './NotePicker.vue'
import BillTypePicker from './BillTypePicker.vue'

const props = defineProps<{
  row: ImportRecordItem
  accounts: Account[]
  categories: BillCategory[]
  matchedRule?: ImportRule | null
}>()

const emit = defineEmits<{
  (e: 'update:row', value: ImportRecordItem): void
  (e: 'save-as-rule', row: ImportRecordItem): void
  (e: 'save-counterparty-rule', row: ImportRecordItem): void
  (e: 'save-payment-method-rule', row: ImportRecordItem): void
  (e: 'save-description-rule', row: ImportRecordItem): void
  (e: 'save-raw-type-rule', row: ImportRecordItem): void
  (e: 'edit-remark', row: ImportRecordItem): void
  (e: 'open-mobile-editor', row: ImportRecordItem): void
}>()

const { isMobile } = useDevice()
const { noteOptions } = useNotes()

function onRowClick() {
  if (isMobile.value) {
    emit('open-mobile-editor', props.row)
  }
}

const typeOptions: { value: BillType; label: string }[] = [
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'transfer', label: '转账' },
  { value: 'debt', label: '借贷' }
]

const debtSubtypeOptions = [
  { value: 'lend' as const, label: '借出' },
  { value: 'borrow' as const, label: '借入' }
]

const relevantCategories = computed(() => {
  const t = props.row.type === 'income' ? 'income' : 'expense'
  return props.categories.filter(c => c.type === t)
})

const amountClass = computed(() => (props.row.direction === 'in' ? 'income' : 'expense'))
const amountSign = computed(() => (props.row.direction === 'in' ? '+' : '-'))

const showCategory = computed(() => props.row.type === 'income' || props.row.type === 'expense')
const showDebtSubtype = computed(() => props.row.type === 'debt')
const showFrom = computed(() => true)
const showTo = computed(() => true)

// 移动端只读展示
const categoryName = computed(() => {
  if (!props.row.categoryId) return ''
  const cat = props.categories.find(c => c.id === props.row.categoryId)
  return cat?.name || ''
})

const fromAccountName = computed(() => {
  if (!props.row.fromAccountId) return ''
  const acc = props.accounts.find(a => a.id === props.row.fromAccountId)
  return acc?.name || ''
})

const toAccountName = computed(() => {
  if (!props.row.toAccountId) return ''
  const acc = props.accounts.find(a => a.id === props.row.toAccountId)
  return acc?.name || ''
})

const typeLabel = computed(() => {
  const map: Record<string, string> = { income: '收入', expense: '支出', transfer: '转账', debt: '借贷' }
  return map[props.row.type] || props.row.type
})

const debtSubtypeLabel = computed(() => {
  if (props.row.debtSubtype === 'lend') return '借出'
  if (props.row.debtSubtype === 'borrow') return '借入'
  return ''
})

const badgeLabel = computed(() => {
  if (props.row.skipped) return props.row.skipReason || '跳过'
  if (props.row.duplicate) return '重复'
  if (isIncomplete(props.row)) return '未完善'
  return '已完善'
})

const badgeClass = computed(() => {
  if (props.row.skipped) return 'skipped'
  if (props.row.duplicate) return 'duplicate'
  if (isIncomplete(props.row)) return 'incomplete'
  return 'completed'
})

const badgeTooltip = computed(() => {
  if (props.row.skipped) return `跳过原因:${props.row.skipReason || '未知'}`
  if (props.row.duplicate) return '与已存在账单指纹重复,默认不导入'
  const missing: string[] = []
  if ((props.row.type === 'income' || props.row.type === 'expense') && !props.row.categoryId) {
    missing.push('分类')
  }
  if (props.row.type === 'expense' && !props.row.fromAccountId) missing.push('出账账户')
  if (props.row.type === 'income' && !props.row.toAccountId) missing.push('入账账户')
  if ((props.row.type === 'transfer' || props.row.type === 'debt') && (!props.row.fromAccountId || !props.row.toAccountId)) {
    if (!props.row.fromAccountId) missing.push('出账账户')
    if (!props.row.toAccountId) missing.push('入账账户')
  }
  if (missing.length > 0) return `待完善:${missing.join('、')}`
  return '信息已完善，可导入'
})

function updateField<K extends keyof ImportRecordItem>(key: K, value: ImportRecordItem[K]) {
  emit('update:row', { ...props.row, [key]: value })
}

function onTypeChange(t: BillType) {
  const counterpartyAccount = props.accounts.find(a => a.id === props.row.matchedAccountId) || null
  const myAccount = props.accounts.find(a => a.id === props.row.myAccountId) || null
  const suggestion = suggestAccountIds(counterpartyAccount, myAccount, props.row.direction, t)
  const next: ImportRecordItem = { ...props.row, type: t }
  if (t === 'income') {
    next.fromAccountId = ''
    if (!relevantCategories.value.some(c => c.id === props.row.categoryId)) {
      next.categoryId = ''
    }
  } else if (t === 'expense') {
    next.toAccountId = ''
    if (!relevantCategories.value.some(c => c.id === props.row.categoryId)) {
      next.categoryId = ''
    }
  } else {
    next.categoryId = ''
  }
  if (counterpartyAccount || myAccount) {
    if (!next.fromAccountId && suggestion.fromAccountId) next.fromAccountId = suggestion.fromAccountId
    if (!next.toAccountId && suggestion.toAccountId) next.toAccountId = suggestion.toAccountId
  }
  emit('update:row', next)
}

function isIncomplete(row: ImportRecordItem): boolean {
  if ((row.type === 'income' || row.type === 'expense') && !row.categoryId) return true
  if (row.type === 'expense' && !row.fromAccountId) return true
  if (row.type === 'income' && !row.toAccountId) return true
  if ((row.type === 'transfer' || row.type === 'debt') && (!row.fromAccountId || !row.toAccountId)) return true
  return false
}

function formatDate(date: string): string {
  return date.length >= 16 ? date.slice(0, 16).replace('T', ' ') : date
}

function formatAmount(n: number): string {
  return n.toFixed(2)
}
</script>

<style scoped>
.preview-row {
  display: grid;
  grid-template-columns: 32px minmax(160px, 1fr) 100px auto;
  grid-template-rows: auto auto auto;
  align-items: center;
  gap: 6px 10px;
  padding: 10px 12px;
  min-height: 130px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 8px;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}
.preview-row.selected {
  background: rgba(0, 122, 255, 0.04);
  border-color: rgba(0, 122, 255, 0.24);
}
.preview-row.duplicate {
  opacity: 0.5;
}
.preview-row.skipped {
  opacity: 0.5;
  background: rgba(60, 60, 67, 0.04);
}
.skip-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  font-weight: 500;
}
.badge.skipped {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.6);
}
.select-cell {
  grid-column: 1;
  grid-row: 1 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.select-cell input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.select-cell input[disabled] {
  cursor: not-allowed;
}
.primary-cell {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.primary-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.counterparty {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.counterparty.clickable {
  cursor: pointer;
  transition: color 0.15s ease;
}
.counterparty.clickable:hover {
  color: rgb(0, 122, 255);
  text-decoration: underline;
}
.counterparty.matched {
  color: rgb(0, 122, 255);
}
.description {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.description.clickable {
  cursor: pointer;
  transition: color 0.15s ease;
}
.description.clickable:hover {
  color: rgb(0, 122, 255);
  text-decoration: underline;
}
.description.matched {
  color: rgb(0, 122, 255);
}
.meta-line {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}
.payment-method.clickable {
  cursor: pointer;
  transition: color 0.15s ease;
}
.payment-method.clickable:hover {
  color: rgb(0, 122, 255);
  text-decoration: underline;
}
.payment-method.matched {
  color: rgb(0, 122, 255);
}
.raw-type.clickable {
  cursor: pointer;
  transition: color 0.15s ease;
}
.raw-type.clickable:hover {
  color: rgb(0, 122, 255);
  text-decoration: underline;
}
.raw-type.matched {
  color: rgb(0, 122, 255);
}
.amount-cell {
  grid-column: 3;
  grid-row: 1;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}
.amount-cell.income {
  color: rgb(52, 199, 89);
}
.amount-cell.expense {
  color: rgb(255, 59, 48);
}
.actions-cell {
  grid-column: 4;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.controls-row {
  grid-column: 2 / 5;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px 12px;
  align-items: center;
}
.controls-row-1 {
  grid-row: 2;
}
.controls-row-2 {
  grid-row: 3;
}
.type-picker {
  min-width: 90px;
}
:deep(.type-picker .picker-trigger) {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
}
:deep(.type-picker .picker-panel) {
  width: 120px !important;
}
.compact-picker {
  min-width: 110px;
}
:deep(.compact-picker .picker-trigger) {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 6px;
}
:deep(.compact-picker .picker-panel) {
  width: 200px !important;
}
.badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.badge.matched {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.badge.account {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.badge.unmatched {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
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
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
}
.action-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.4);
}
.action-btn.active {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
  border-color: rgba(255, 149, 0, 0.4);
}
.action-btn.save-rule-btn {
  width: auto;
  gap: 4px;
  padding: 0 8px;
  font-size: 12px;
}
.save-rule-text {
  font-size: 11px;
  font-weight: 500;
}


/* ========== 移动端布局 ========== */
.preview-row.mobile-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: auto;
}

.preview-row.mobile-row .select-cell {
  grid-column: auto;
  grid-row: auto;
  flex-shrink: 0;
  padding-top: 2px;
}

.mobile-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mobile-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mobile-line-main {
  justify-content: space-between;
  gap: 8px;
}

.mobile-counterparty {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.mobile-amount {
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.mobile-amount.income {
  color: rgb(52, 199, 89);
}

.mobile-amount.expense {
  color: rgb(255, 59, 48);
}

.mobile-description {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.mobile-line-meta {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
  gap: 10px;
}

.mobile-line-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mobile-type-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
}

.mobile-type-tag.income {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.mobile-type-tag.expense {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.mobile-type-tag.transfer {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.mobile-type-tag.debt {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}

.mobile-category-tag,
.mobile-subtype-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
}

.mobile-line-accounts {
  gap: 6px;
  font-size: 11px;
}

.mobile-account {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 45%;
}

.mobile-arrow {
  color: rgba(60, 60, 67, 0.3);
  font-size: 11px;
}
</style>
