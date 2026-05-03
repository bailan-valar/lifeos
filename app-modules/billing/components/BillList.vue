<template>
  <div class="bill-list">
    <div
      v-for="bill in bills"
      :key="bill.id"
      class="bill-row"
      :class="`type-${bill.type}`"
    >
      <div class="bill-left">
        <div class="bill-type-badge" :class="bill.type">
          {{ typeLabel(bill.type) }}
        </div>
        <div class="bill-title">{{ bill.title }}</div>
        <div class="bill-date">{{ formatDate(bill.date) }}</div>
      </div>
      <div class="bill-right">
        <div class="bill-amount" :class="amountClass(bill)">
          {{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}
        </div>
        <div class="bill-currency">{{ bill.currency }}</div>
        <div class="bill-actions">
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

defineProps<{
  bills: Bill[]
}>()

defineEmits<{
  (e: 'edit', bill: Bill): void
  (e: 'delete', id: string): void
}>()

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
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  transition: background-color 0.15s ease;
}
.bill-row:hover {
  background: rgba(255, 255, 255, 0.7);
}
.bill-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bill-type-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.bill-type-badge.income {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.bill-type-badge.expense {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}
.bill-type-badge.transfer {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.bill-type-badge.debt {
  background: rgba(175, 82, 222, 0.12);
  color: rgb(175, 82, 222);
}
.bill-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.bill-date {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}
.bill-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bill-amount {
  font-size: 16px;
  font-weight: 700;
}
.bill-amount.positive {
  color: rgb(52, 199, 89);
}
.bill-amount.negative {
  color: rgb(255, 59, 48);
}
.bill-amount.neutral {
  color: rgb(0, 122, 255);
}
.bill-currency {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}
.bill-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.bill-row:hover .bill-actions {
  opacity: 1;
}
.action-btn {
  display: flex;
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
</style>
