<template>
  <div class="preview-row" :class="{ duplicate: row.duplicate, selected: row.selected }">
    <label class="select-cell">
      <input
        type="checkbox"
        :checked="row.selected"
        :disabled="row.duplicate"
        @change="updateField('selected', ($event.target as HTMLInputElement).checked)"
      />
    </label>

    <div class="primary-cell">
      <div class="primary-line">
        <span class="counterparty">{{ row.counterparty || '(无对方)' }}</span>
        <span v-if="row.description" class="description">{{ row.description }}</span>
      </div>
      <div class="meta-line">
        <span class="date">{{ formatDate(row.date) }}</span>
        <span v-if="row.rawType" class="raw-type">{{ row.rawType }}</span>
      </div>
    </div>

    <div class="amount-cell" :class="amountClass">
      {{ amountSign }}¥{{ formatAmount(row.amount) }}
    </div>

    <div class="actions-cell">
      <span class="badge" :class="badgeClass" :title="badgeTooltip">{{ badgeLabel }}</span>
      <button
        v-if="!row.duplicate"
        type="button"
        class="action-btn"
        title="保存为规则"
        @click="$emit('save-as-rule', row)"
      >
        <Icon name="solar:bookmark-linear" size="14" />
      </button>
    </div>

    <div class="controls-row">
      <select
        class="form-select type-select"
        :value="row.type"
        @change="onTypeChange(($event.target as HTMLSelectElement).value as BillType)"
      >
        <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>

      <select
        v-if="showCategory"
        class="form-select"
        :value="row.categoryId"
        @change="updateField('categoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">未分类</option>
        <option v-for="c in relevantCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <select
        v-if="showDebtSubtype"
        class="form-select"
        :value="row.debtSubtype"
        @change="updateField('debtSubtype', ($event.target as HTMLSelectElement).value as DebtSubtype)"
      >
        <option value="lend">借出</option>
        <option value="borrow">借入</option>
      </select>

      <select
        v-if="showFrom"
        class="form-select"
        :value="row.fromAccountId"
        title="出账账户"
        @change="updateField('fromAccountId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">出账账户</option>
        <optgroup v-if="personalAccounts.length" label="我的账户">
          <option v-for="a in personalAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="merchantAccounts.length" label="商户">
          <option v-for="a in merchantAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="contactAccounts.length" label="联系人">
          <option v-for="a in contactAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="otherAccounts.length" label="其他">
          <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
      </select>

      <select
        v-if="showTo"
        class="form-select"
        :value="row.toAccountId"
        title="入账账户"
        @change="updateField('toAccountId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">入账账户</option>
        <optgroup v-if="personalAccounts.length" label="我的账户">
          <option v-for="a in personalAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="merchantAccounts.length" label="商户">
          <option v-for="a in merchantAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="contactAccounts.length" label="联系人">
          <option v-for="a in contactAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="otherAccounts.length" label="其他">
          <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  BillType,
  DebtSubtype,
  ImportPreviewRow as IPRow,
  ImportRule
} from '~/types/bill'
import { suggestAccountIds } from '~/composables/useAccountMatcher'

const props = defineProps<{
  row: IPRow
  accounts: Account[]
  categories: BillCategory[]
  matchedRule?: ImportRule | null
}>()

const emit = defineEmits<{
  (e: 'update:row', value: IPRow): void
  (e: 'save-as-rule', row: IPRow): void
}>()

const typeOptions: { value: BillType; label: string }[] = [
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'transfer', label: '转账' },
  { value: 'debt', label: '借贷' }
]

const personalAccounts = computed(() => props.accounts.filter(a => a.type === 'personal'))
const merchantAccounts = computed(() => props.accounts.filter(a => a.type === 'merchant'))
const contactAccounts = computed(() => props.accounts.filter(a => a.type === 'contact'))
const otherAccounts = computed(() => props.accounts.filter(a => a.type === 'other'))

const relevantCategories = computed(() => {
  const t = props.row.type === 'income' ? 'income' : 'expense'
  return props.categories.filter(c => c.type === t)
})

const amountClass = computed(() => (props.row.direction === 'in' ? 'income' : 'expense'))
const amountSign = computed(() => (props.row.direction === 'in' ? '+' : '-'))

const showCategory = computed(() => props.row.type === 'income' || props.row.type === 'expense')
const showDebtSubtype = computed(() => props.row.type === 'debt')
const showFrom = computed(() => props.row.type !== 'income')
const showTo = computed(() => props.row.type !== 'expense')

const badgeLabel = computed(() => {
  if (props.row.duplicate) return '重复'
  if (props.row.matchedRuleId) return '已匹配规则'
  if (props.row.matchedAccountId) return '已匹配账户'
  return '无匹配'
})

const badgeClass = computed(() => {
  if (props.row.duplicate) return 'duplicate'
  if (props.row.matchedRuleId) return 'matched'
  if (props.row.matchedAccountId) return 'account'
  return 'unmatched'
})

const badgeTooltip = computed(() => {
  if (props.row.duplicate) return '与已存在账单指纹重复,默认不导入'
  if (props.matchedRule) return `命中规则:${props.matchedRule.name}`
  if (props.row.matchedRuleId) return '命中规则'
  if (props.row.matchedAccountId) {
    const acc = props.accounts.find(a => a.id === props.row.matchedAccountId)
    return acc ? `匹配账户:${acc.name}` : '已匹配账户'
  }
  return '未命中规则,也未匹配到账户别名'
})

function updateField<K extends keyof IPRow>(key: K, value: IPRow[K]) {
  emit('update:row', { ...props.row, [key]: value })
}

function onTypeChange(t: BillType) {
  const matchedAcc = props.accounts.find(a => a.id === props.row.matchedAccountId) || null
  const suggestion = suggestAccountIds(matchedAcc, props.row.direction, t)
  const next: IPRow = { ...props.row, type: t }
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
  if (matchedAcc) {
    if (!next.fromAccountId && suggestion.fromAccountId) next.fromAccountId = suggestion.fromAccountId
    if (!next.toAccountId && suggestion.toAccountId) next.toAccountId = suggestion.toAccountId
  }
  emit('update:row', next)
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
  grid-template-rows: auto auto;
  align-items: center;
  gap: 6px 10px;
  padding: 10px 12px;
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
.select-cell {
  grid-column: 1;
  grid-row: 1 / 3;
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
.description {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta-line {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
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
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.form-select {
  flex: 1;
  min-width: 110px;
  max-width: 180px;
  padding: 6px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-select.type-select {
  flex: 0 0 90px;
  min-width: 90px;
}
.form-select:focus {
  border-color: rgb(0, 122, 255);
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
</style>
