<template>
  <div class="bill-list">
    <div
      v-for="bill in bills"
      :key="bill.id"
      class="bill-row"
      :class="[`type-${bill.type}`, { selected: selectable && selectedIds?.includes(bill.id) }]"
    >
      <div v-if="selectable" class="bill-checkbox">
        <input
          type="checkbox"
          :checked="selectedIds?.includes(bill.id)"
          @change="toggleSelect(bill.id)"
        />
      </div>
      <div class="bill-left">
        <div class="bill-primary-row">
          <span class="bill-type-badge" :class="bill.type">{{ typeLabel(bill.type) }}</span>
          <span v-if="bill.categoryId && getCategoryName(bill.categoryId)" class="bill-category-primary">
            {{ getCategoryName(bill.categoryId) }}
          </span>
          <span v-else class="bill-category-empty">未分类</span>
        </div>
        <div class="bill-secondary-row">
          <span class="bill-datetime">{{ formatDateTime(bill.date) }}</span>
          <span class="bill-sep">·</span>
          <span class="bill-account">{{ getAccountName(bill) }}</span>
          <span class="bill-sep">·</span>
          <span class="bill-description">{{ bill.description || '-' }}</span>
        </div>
      </div>
      <div class="bill-right">
        <div class="bill-amount-row">
          <span class="bill-amount" :class="amountClass(bill)">
            {{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}
          </span>
          <span class="bill-currency">{{ bill.currency }}</span>
        </div>
        <div v-if="!selectable" class="bill-actions">
          <button type="button" class="action-btn" @click="$emit('edit', bill)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button type="button" class="action-btn danger" @click="$emit('delete', bill.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="bills.length === 0" class="empty">
      <Icon name="solar:wallet-money-linear" size="32" />
      <span>暂无账单记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillType } from '~/types/bill'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'

const props = defineProps<{
  bills: Bill[]
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

const { categories } = useBillCategories()
const { accounts } = useAccounts()

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c]))
)

const accountMap = computed(() =>
  Object.fromEntries(accounts.value.map(a => [a.id, a]))
)

function getCategoryName(categoryId: string) {
  return categoryMap.value[categoryId]?.name || ''
}

function getAccountName(bill: Bill) {
  const accountId = bill.type === 'income' || (bill.type === 'debt' && bill.debtSubtype === 'borrow')
    ? bill.toAccountId
    : bill.fromAccountId
  return accountMap.value[accountId]?.name || ''
}

function toggleSelect(id: string) {
  emit('select', id)
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

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.bill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 12px;
  transition: all 0.15s ease;
  content-visibility: auto;
  contain-intrinsic-size: auto 64px;
}
.bill-row:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(60, 60, 67, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.bill-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.bill-primary-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bill-type-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.bill-type-badge.income {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(34, 197, 94);
}
.bill-type-badge.expense {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(239, 68, 68);
}
.bill-type-badge.transfer {
  background: rgba(59, 130, 246, 0.12);
  color: rgb(59, 130, 246);
}
.bill-type-badge.debt {
  background: rgba(168, 85, 247, 0.12);
  color: rgb(168, 85, 247);
}
.bill-category-primary {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bill-category-empty {
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.4);
  font-style: italic;
}
.bill-secondary-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  overflow: hidden;
}
.bill-datetime {
  flex-shrink: 0;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}
.bill-sep {
  flex-shrink: 0;
  color: rgba(60, 60, 67, 0.2);
}
.bill-account {
  flex-shrink: 0;
  color: rgba(60, 60, 67, 0.6);
}
.bill-description {
  color: rgba(60, 60, 67, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 12px;
  min-width: 100px;
}
.bill-amount-row {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.bill-amount {
  font-size: 17px;
  font-weight: 600;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}
.bill-amount.positive {
  color: rgb(34, 197, 94);
}
.bill-amount.negative {
  color: rgb(239, 68, 68);
}
.bill-amount.neutral {
  color: rgb(59, 130, 246);
}
.bill-currency {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.4);
  font-weight: 500;
}
.bill-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.bill-row:hover .bill-actions {
  opacity: 1;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
}
.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.7);
}
.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
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
.bill-checkbox {
  display: flex;
  align-items: center;
  padding-right: 4px;
}
.bill-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}
.bill-row.selected {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.25);
}
</style>
