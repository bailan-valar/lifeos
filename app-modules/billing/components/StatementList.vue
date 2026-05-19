<template>
  <div class="statement-list">
    <div class="header">
      <div class="account-summary">
        <div class="account-name">{{ account.name }}</div>
        <div class="account-meta">
          <span class="meta-chip">额度 {{ formatAmount(account.creditLimit ?? 0) }}</span>
          <span class="meta-chip">账单日 {{ account.billingDay ?? 1 }}</span>
          <span class="meta-chip">还款日 {{ account.repaymentDay ?? 1 }}</span>
        </div>
      </div>
      <div class="generate-controls">
        <select v-model.number="genYear" class="liquid-glass-select">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select v-model.number="genMonth" class="liquid-glass-select">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
        <button type="button" class="generate-btn" @click="$emit('generate', genYear, genMonth)">
          <Icon name="solar:refresh-linear" size="14" />
          生成账单
        </button>
      </div>
    </div>

    <table v-if="statements.length > 0" class="statement-table">
      <thead>
        <tr>
          <th>周期</th>
          <th>账单区间</th>
          <th>还款日</th>
          <th class="num">应还</th>
          <th class="num">已还</th>
          <th>状态</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="stmt in statements" :key="stmt.id">
          <td>{{ stmt.year }}-{{ pad(stmt.month) }}</td>
          <td class="date-range">{{ stmt.billingStartDate }} ~ {{ stmt.billingEndDate }}</td>
          <td>{{ stmt.repaymentDate }}</td>
          <td class="num">{{ formatAmount(stmt.statementAmount) }}</td>
          <td class="num">{{ formatAmount(stmt.paidAmount) }}</td>
          <td>
            <span class="status-badge" :class="`status-${stmt.status}`">{{ statusLabel(stmt.status) }}</span>
          </td>
          <td class="actions">
            <button type="button" class="action-btn" @click="$emit('edit', stmt)">
              <Icon name="solar:pen-linear" size="14" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      <Icon name="solar:document-text-linear" size="32" />
      <span>暂无账单周期</span>
      <span class="empty-hint">点击"生成账单"按当前账单日/还款日规则计算周期</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Account, Statement, StatementStatus } from '~/types/bill'

defineProps<{
  account: Account
  statements: Statement[]
}>()

defineEmits<{
  (e: 'edit', stmt: Statement): void
  (e: 'generate', year: number, month: number): void
}>()

const now = new Date()
const genYear = ref(now.getFullYear())
const genMonth = ref(now.getMonth() + 1)

const yearOptions = computed(() => {
  const current = now.getFullYear()
  return [current - 1, current, current + 1]
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatAmount(n: number): string {
  return n.toFixed(2)
}

function statusLabel(s: StatementStatus): string {
  if (s === 'pending') return '待还款'
  if (s === 'partial') return '部分已还'
  if (s === 'paid') return '已结清'
  return '已逾期'
}
</script>

<style scoped>
.statement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
}
.account-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.account-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}
.account-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.meta-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.78);
}
.generate-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.generate-btn:hover {
  background: rgb(0, 110, 250);
}
.statement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.statement-table th,
.statement-table td {
  padding: 8px 6px;
  text-align: left;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
}
.statement-table th {
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.statement-table td.num,
.statement-table th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.date-range {
  font-variant-numeric: tabular-nums;
  color: rgba(60, 60, 67, 0.7);
}
.status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.status-pending {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.status-partial {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.status-paid {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.status-overdue {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
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
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 16px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 13px;
  text-align: center;
}
.empty-hint {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.4);
}
</style>
