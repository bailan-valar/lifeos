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

    <div class="form-cell">
      <select
        class="form-select"
        :value="row.categoryId"
        @change="updateField('categoryId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">未分类</option>
        <option v-for="c in relevantCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="form-cell">
      <select
        class="form-select"
        :value="primaryAccountValue"
        @change="onAccountChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ accountLabel }}</option>
        <optgroup v-if="personalAccounts.length" label="我的账户">
          <option v-for="a in personalAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
        <optgroup v-if="otherAccounts.length" label="外部账户">
          <option v-for="a in otherAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
        </optgroup>
      </select>
    </div>

    <div class="badge-cell">
      <span class="badge" :class="badgeClass">{{ badgeLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Account, BillCategory, ImportPreviewRow as IPRow } from '~/types/bill'

const props = defineProps<{
  row: IPRow
  accounts: Account[]
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'update:row', value: IPRow): void
}>()

const personalAccounts = computed(() => props.accounts.filter(a => a.type === 'personal'))
const otherAccounts = computed(() => props.accounts.filter(a => a.type === 'other'))

const relevantCategories = computed(() =>
  props.categories.filter(c => c.type === props.row.type)
)

const amountClass = computed(() => (props.row.direction === 'in' ? 'income' : 'expense'))
const amountSign = computed(() => (props.row.direction === 'in' ? '+' : '-'))

const primaryAccountValue = computed(() =>
  props.row.direction === 'in' ? props.row.toAccountId : props.row.fromAccountId
)

const accountLabel = computed(() =>
  props.row.direction === 'in' ? '入账账户' : '出账账户'
)

const badgeLabel = computed(() => {
  if (props.row.duplicate) return '重复'
  if (props.row.matchedRuleId) return '已匹配规则'
  return '无规则'
})

const badgeClass = computed(() => {
  if (props.row.duplicate) return 'duplicate'
  if (props.row.matchedRuleId) return 'matched'
  return 'unmatched'
})

function updateField<K extends keyof IPRow>(key: K, value: IPRow[K]) {
  emit('update:row', { ...props.row, [key]: value })
}

function onAccountChange(value: string) {
  if (props.row.direction === 'in') {
    updateField('toAccountId', value)
  } else {
    updateField('fromAccountId', value)
  }
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
  grid-template-columns: 32px minmax(140px, 1fr) 100px 140px 140px 90px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
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
.form-cell {
  display: flex;
  align-items: center;
}
.form-select {
  width: 100%;
  padding: 6px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.form-select:focus {
  border-color: rgb(0, 122, 255);
}
.badge-cell {
  display: flex;
  justify-content: center;
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
.badge.unmatched {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
}
.badge.duplicate {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
</style>
