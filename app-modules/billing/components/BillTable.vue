<template>
  <div class="bill-table-wrap">
    <table v-if="bills.length > 0" class="bill-table">
      <thead>
        <tr>
          <th v-if="selectable" class="checkbox-cell">
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate.prop="isIndeterminate"
              @change="toggleSelectAll"
            />
          </th>
          <th>日期</th>
          <th>类型</th>
          <th>对方/描述</th>
          <th>分类</th>
          <th>出账账户</th>
          <th>入账账户</th>
          <th class="num">金额</th>
          <th v-if="!selectable"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="bill in bills"
          :key="bill.id"
          :class="{ selected: selectable && selectedIds?.includes(bill.id) }"
        >
          <td v-if="selectable" class="checkbox-cell">
            <input
              type="checkbox"
              :checked="selectedIds?.includes(bill.id)"
              @change="toggleSelect(bill.id)"
            />
          </td>
          <td class="date-cell">{{ formatDate(bill.date) }}</td>
          <td>
            <span class="type-badge" :class="bill.type">
              {{ typeLabel(bill.type) }}
            </span>
          </td>
          <td class="desc-cell">{{ bill.description || '-' }}</td>
          <td class="category-cell">{{ categoryName(bill.categoryId) }}</td>
          <td class="account-cell">{{ accountName(bill.fromAccountId) }}</td>
          <td class="account-cell">{{ accountName(bill.toAccountId) }}</td>
          <td class="num" :class="amountClass(bill)">
            {{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}
          </td>
          <td v-if="!selectable" class="actions">
            <button type="button" class="action-btn" @click="$emit('edit', bill)">
              <Icon name="solar:pen-linear" size="14" />
            </button>
            <button type="button" class="action-btn danger" @click="$emit('delete', bill.id)">
              <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      <Icon name="solar:wallet-money-linear" size="32" />
      <span>暂无账单记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillType, Account, BillCategory } from '~/types/bill'

const props = defineProps<{
  bills: Bill[]
  accounts: Account[]
  categories: BillCategory[]
  selectable?: boolean
  selectedIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'edit', bill: Bill): void
  (e: 'delete', id: string): void
  (e: 'select', id: string): void
  (e: 'select-all'): void
  (e: 'unselect-all'): void
}>()

const selectedSet = computed(() => new Set(props.selectedIds || []))
const isAllSelected = computed(() => props.bills.length > 0 && props.bills.every(b => selectedSet.value.has(b.id)))
const isIndeterminate = computed(() => props.bills.some(b => selectedSet.value.has(b.id)) && !isAllSelected.value)

function toggleSelect(id: string) {
  emit('select', id)
}

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) emit('select-all')
  else emit('unselect-all')
}

const typeLabels: Record<BillType, string> = {
  income: '收入',
  expense: '支出',
  transfer: '转账',
  debt: '债权债务'
}

function typeLabel(type: BillType) {
  return typeLabels[type]
}

function amountClass(bill: Bill) {
  if (bill.type === 'income') return 'positive'
  if (bill.type === 'expense') return 'negative'
  if (bill.type === 'transfer') return 'neutral'
  if (bill.type === 'debt') return bill.debtSubtype === 'lend' ? 'negative' : 'positive'
  return ''
}

function amountPrefix(bill: Bill) {
  if (bill.type === 'income') return '+';
  if (bill.type === 'expense') return '-';
  if (bill.type === 'transfer') return '';
  if (bill.type === 'debt') return bill.debtSubtype === 'lend' ? '-' : '+';
  return ''
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const accountMap = computed(() => {
  const map = new Map<string, string>()
  for (const a of props.accounts) {
    map.set(a.id, a.name)
  }
  return map
})

const categoryMap = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.categories) {
    map.set(c.id, c.name)
  }
  return map
})

function accountName(id: string) {
  if (!id) return '-'
  return accountMap.value.get(id) || '-'
}

function categoryName(id: string) {
  if (!id) return '-'
  return categoryMap.value.get(id) || '-'
}
</script>

<style scoped>
.bill-table-wrap {
  overflow-x: auto;
}
.bill-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.bill-table th,
.bill-table td {
  padding: 8px 6px;
  text-align: left;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
  white-space: nowrap;
}
.bill-table th {
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.bill-table tbody tr {
  content-visibility: auto;
  contain-intrinsic-size: auto 40px;
}
.bill-table td.num,
.bill-table th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.date-cell {
  font-variant-numeric: tabular-nums;
  color: rgba(60, 60, 67, 0.7);
}
.desc-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.category-cell,
.account-cell {
  color: rgba(60, 60, 67, 0.7);
}
.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.type-badge.income {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.type-badge.expense {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}
.type-badge.transfer {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.type-badge.debt {
  background: rgba(175, 82, 222, 0.12);
  color: rgb(175, 82, 222);
}
.positive {
  color: rgb(52, 199, 89);
}
.negative {
  color: rgb(255, 59, 48);
}
.neutral {
  color: rgb(0, 122, 255);
}
.actions {
  text-align: right;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}
.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}
.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 14px;
}
.checkbox-cell {
  width: 32px;
  text-align: center;
}
.checkbox-cell input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}
tr.selected {
  background: rgba(0, 122, 255, 0.06);
}
</style>
