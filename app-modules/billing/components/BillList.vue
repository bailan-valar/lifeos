<template>
  <div class="bill-list">
    <template v-for="bill in flatBills" :key="bill.id">
      <div
        class="bill-row"
        :class="[
          `type-${bill.type}`,
          { selected: selectable && selectedIds?.includes(bill.id) },
          { 'is-child': bill.parentId },
          { 'has-children': bill.hasChildren && !bill.parentId },
          { 'is-refund': bill.isRefund }
        ]"
        :style="{ paddingLeft: bill.parentId ? '32px' : '16px' }"
      >
        <div v-if="selectable" class="bill-checkbox">
          <input
            type="checkbox"
            :checked="selectedIds?.includes(bill.id)"
            @change="toggleSelect(bill.id)"
          />
        </div>

        <!-- 展开/收起按钮 -->
        <button
          v-if="bill.hasChildren && !bill.parentId && !bill.isRefund"
          type="button"
          class="expand-btn"
          @click="toggleExpand(bill.id)"
        >
          <Icon
            :name="expandedIds.has(bill.id) ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'"
            size="14"
          />
        </button>
        <div v-else-if="bill.parentId" class="child-placeholder"></div>
        <div v-else class="expand-placeholder"></div>

        <div class="bill-left">
          <div class="bill-title-row">
            <div class="bill-type-badge" :class="bill.type">
              {{ typeLabel(bill.type) }}
            </div>
            <div v-if="!bill.isRefund && refundBillsMap.has(bill.id)" class="refund-badge">已退款</div>
            <div v-if="bill.isRefund" class="refund-badge">退款</div>
            <div v-if="bill.allocatedMonth && bill.parentId" class="allocate-badge">
              {{ bill.allocatedMonth }}
            </div>
          </div>
          <div class="bill-title">{{ bill.description || '-' }}</div>
          <div class="bill-date">{{ formatDate(bill.date) }}</div>
        </div>
        <div class="bill-right">
          <div class="bill-amount-wrapper">
            <div class="bill-amount" :class="amountClass(bill)">
              {{ amountPrefix(bill) }}{{ displayAmount(bill).toFixed(2) }}
            </div>
            <div v-if="!bill.isRefund && refundTotalMap.has(bill.id)" class="bill-amount-sub">
              ({{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}-{{ refundTotalMap.get(bill.id)!.toFixed(2) }})
            </div>
          </div>
          <div class="bill-currency">{{ bill.currency }}</div>
          <div v-if="!selectable && !bill.parentId" class="bill-actions">
            <!-- 拆分按钮 -->
            <button
              type="button"
              class="action-btn"
              title="拆分账单"
              :disabled="bill.hasChildren"
              @click="$emit('split', bill)"
            >
              <Icon name="solar:call-split-linear" size="14" />
            </button>
            <!-- 分摊按钮 -->
            <button
              type="button"
              class="action-btn"
              title="分摊到月份"
              :disabled="bill.hasChildren"
              @click="$emit('allocate', bill)"
            >
              <Icon name="solar:calendar-linear" size="14" />
            </button>
            <!-- 退款按钮 -->
            <button
              type="button"
              class="action-btn refund"
              title="退款"
              @click="$emit('refund', bill)"
            >
              <Icon name="solar:refresh-circle-linear" size="14" />
            </button>
            <!-- 编辑按钮 -->
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click="$emit('edit', bill)"
            >
              <Icon name="solar:pen-linear" size="14" />
            </button>
            <!-- 删除按钮 -->
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click="$emit('delete', bill.id)"
            >
              <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
            </button>
          </div>
          <!-- 子账单只显示删除按钮 -->
          <div v-else-if="!selectable && bill.parentId" class="bill-actions">
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click="$emit('edit', bill)"
            >
              <Icon name="solar:pen-linear" size="14" />
            </button>
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click="$emit('delete', bill.id)"
            >
              <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="flatBills.length === 0" class="empty">
      <Icon name="solar:wallet-money-linear" size="32" />
      <span>暂无账单记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillType } from '~/types/bill'

const props = defineProps<{
  bills: Bill[]
  selectable?: boolean
  selectedIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'edit', bill: Bill): void
  (e: 'delete', id: string): void
  (e: 'select', id: string): void
  (e: 'split', bill: Bill): void
  (e: 'allocate', bill: Bill): void
  (e: 'refund', bill: Bill): void
}>()

// 展开的父账单 ID 集合
const expandedIds = ref<Set<string>>(new Set())

// 退款账单映射：源账单ID -> 退款账单列表
const refundBillsMap = computed(() => {
  const map = new Map<string, Bill[]>()
  for (const bill of props.bills) {
    if (bill.isRefund && bill.originalBillId) {
      if (!map.has(bill.originalBillId)) {
        map.set(bill.originalBillId, [])
      }
      map.get(bill.originalBillId)!.push(bill)
    }
  }
  return map
})

// 退款总额映射：源账单ID -> 退款总额
const refundTotalMap = computed(() => {
  const map = new Map<string, number>()
  for (const [billId, refunds] of refundBillsMap.value.entries()) {
    const total = refunds.reduce((sum, r) => sum + r.amount, 0)
    map.set(billId, total)
  }
  return map
})

// 构建扁平化账单列表（退款账单作为独立项显示，不折叠在源账单下）
const flatBills = computed(() => {
  const result: Bill[] = []
  const childrenMap = new Map<string, Bill[]>()

  // 先分组普通子账单
  for (const bill of props.bills) {
    if (bill.parentId && !bill.isRefund) {
      if (!childrenMap.has(bill.parentId)) {
        childrenMap.set(bill.parentId, [])
      }
      childrenMap.get(bill.parentId)!.push(bill)
    }
  }

  // 辅助函数：推入账单及其子账单
  function pushWithChildren(bill: Bill) {
    result.push(bill)
    if (!expandedIds.value.has(bill.id)) return

    // 推入普通子账单
    const children = childrenMap.get(bill.id) || []
    for (const child of children) {
      result.push(child)
    }
  }

  // 构建扁平列表（只跳过子账单，退款账单作为独立项显示）
  for (const bill of props.bills) {
    if (bill.parentId) continue
    pushWithChildren(bill)
  }

  return result
})

function toggleSelect(id: string) {
  emit('select', id)
}

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedIds.value = next
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

function displayAmount(bill: Bill): number {
  if (bill.isRefund) return bill.amount
  const refundTotal = refundTotalMap.value.get(bill.id)
  if (!refundTotal) return bill.amount
  return Math.max(0, bill.amount - refundTotal)
}
</script>

<style scoped>
.bill-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  transition: background-color 0.15s ease;
  gap: 8px;
}

.bill-row:hover {
  background: rgba(255, 255, 255, 0.7);
}

.bill-row.is-child {
  background: rgba(60, 60, 67, 0.03);
  border-radius: 8px;
}

.bill-row.is-child:hover {
  background: rgba(60, 60, 67, 0.06);
}

.bill-row.is-refund {
  background: rgba(255, 149, 0, 0.04);
  border-left: 3px solid rgba(255, 149, 0, 0.4);
  border-radius: 8px;
}

.bill-row.is-refund:hover {
  background: rgba(255, 149, 0, 0.08);
}

.expand-btn,
.child-placeholder,
.expand-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.expand-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}

.bill-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.bill-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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

.refund-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.allocate-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.bill-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-date {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.bill-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.bill-amount-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.bill-amount {
  font-size: 15px;
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

.bill-amount-sub {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
  font-weight: 500;
}

.bill-currency {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.bill-actions {
  display: flex;
  gap: 2px;
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
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.refund:hover {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
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
