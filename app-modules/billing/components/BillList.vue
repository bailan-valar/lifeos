<template>
  <div class="bill-list">
    <template v-for="entry in timelineEntries" :key="entry.id">
      <!-- 余额调整行 -->
      <div
        v-if="entry.kind === 'adjustment'"
        class="adjustment-row"
      >
        <div class="bill-left">
          <div class="bill-primary-row">
            <span class="bill-type-badge adjustment">调整</span>
            <span class="adjustment-label">余额调整</span>
          </div>
          <div class="bill-secondary-row">
            <span class="bill-datetime">{{ formatDate(entry.adjustment.date) }}</span>
            <span class="bill-sep">·</span>
            <span class="adjustment-detail">
              调整前 {{ entry.adjustment.balanceBefore.toFixed(2) }} → 调整后 {{ entry.adjustment.balanceAfter.toFixed(2) }}
            </span>
            <template v-if="entry.adjustment.note">
              <span class="bill-sep">·</span>
              <span class="adjustment-note">{{ entry.adjustment.note }}</span>
            </template>
          </div>
        </div>
        <div class="bill-right">
          <div class="bill-amount-row">
            <span class="bill-amount neutral">{{ entry.adjustment.balanceAfter.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 账单行 -->
      <div
        v-else
        class="bill-row"
        :class="[
          `type-${entry.bill.type}`,
          { selected: selectable && selectedIds?.includes(entry.bill.id) },
          { 'is-child': entry.bill.parentId },
          { 'has-children': entry.bill.hasChildren && !entry.bill.parentId },
          { 'is-refund': entry.bill.isRefund }
        ]"
        :style="{ paddingLeft: entry.bill.parentId ? '32px' : '16px' }"
        @contextmenu.prevent="emit('contextmenu', { bill: entry.bill, x: $event.clientX, y: $event.clientY })"
      >
        <div v-if="selectable" class="bill-checkbox">
          <input
            type="checkbox"
            :checked="selectedIds?.includes(entry.bill.id)"
            @change="toggleSelect(entry.bill.id)"
          />
        </div>

        <!-- 展开/收起按钮 -->
        <button
          v-if="entry.bill.hasChildren && !entry.bill.parentId && !entry.bill.isRefund"
          type="button"
          class="expand-btn"
          @click="toggleExpand(entry.bill.id)"
        >
          <Icon
            :name="expandedIds.has(entry.bill.id) ? SOLAR_ICONS.nav.down : SOLAR_ICONS.nav.right"
            size="14"
          />
        </button>
        <div v-else-if="entry.bill.parentId" class="child-placeholder"></div>
        <div v-else class="expand-placeholder"></div>

        <div class="bill-left">
          <div class="bill-primary-row">
            <span class="bill-type-badge" :class="entry.bill.type">{{ typeLabel(entry.bill.type) }}</span>
            <span v-if="!entry.bill.isRefund && refundBillsMap.has(entry.bill.id)" class="refund-badge">已退款</span>
            <span v-if="entry.bill.isRefund" class="refund-badge">退款</span>
            <span v-if="entry.bill.allocatedMonth && entry.bill.parentId" class="allocate-badge">
              {{ entry.bill.allocatedMonth }}
            </span>
            <span v-if="entry.bill.categoryId && getCategoryName(entry.bill.categoryId)" class="bill-category-primary">
              {{ getCategoryName(entry.bill.categoryId) }}
            </span>
            <span v-else-if="!entry.bill.parentId" class="bill-category-empty">未分类</span>
          </div>
          <div class="bill-secondary-row">
            <span class="bill-datetime">{{ formatDateTime(entry.bill.date) }}</span>
            <span class="bill-sep">·</span>
            <span class="bill-account">{{ getAccountName(entry.bill) }}</span>
            <span class="bill-sep">·</span>
            <span class="bill-description">{{ entry.bill.description || '-' }}</span>
          </div>
        </div>
        <div class="bill-right">
          <div class="bill-amount-row">
            <span class="bill-amount" :class="amountClass(entry.bill)">
              {{ amountPrefix(entry.bill) }}{{ displayAmount(entry.bill).toFixed(2) }}
            </span>
            <span class="bill-currency">{{ entry.bill.currency }}</span>
          </div>
          <div v-if="!entry.bill.isRefund && refundTotalMap.has(entry.bill.id)" class="bill-amount-sub">
            ({{ amountPrefix(entry.bill) }}{{ entry.bill.amount.toFixed(2) }}-{{ refundTotalMap.get(entry.bill.id)!.toFixed(2) }})
          </div>
          <!-- 运行余额显示 -->
          <div v-if="showRunningBalance && entry.balance != null" class="bill-balance" :class="{ negative: entry.balance < 0 }">
            余额 {{ entry.balance.toFixed(2) }}
          </div>
          <div v-if="!selectable && !entry.bill.parentId" class="bill-actions">
            <button
              type="button"
              class="action-btn"
              title="拆分账单"
              :disabled="entry.bill.hasChildren"
              @click="$emit('split', entry.bill)"
            >
              <Icon :name="SOLAR_ICONS.action.split" size="14" />
            </button>
            <button
              type="button"
              class="action-btn"
              title="分摊到月份"
              :disabled="entry.bill.hasChildren"
              @click="$emit('allocate', entry.bill)"
            >
              <Icon :name="SOLAR_ICONS.billing.calendar" size="14" />
            </button>
            <button
              type="button"
              class="action-btn refund"
              title="退款"
              @click="$emit('refund', entry.bill)"
            >
              <Icon :name="SOLAR_ICONS.action.refresh" size="14" />
            </button>
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click="$emit('edit', entry.bill)"
            >
              <Icon :name="SOLAR_ICONS.action.edit" size="14" />
            </button>
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click="$emit('delete', entry.bill.id)"
            >
              <Icon :name="ICONS.trashBinMinimalistic" size="14" />
            </button>
          </div>
          <div v-else-if="!selectable && entry.bill.parentId" class="bill-actions">
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click="$emit('edit', entry.bill)"
            >
              <Icon :name="SOLAR_ICONS.action.edit" size="14" />
            </button>
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click="$emit('delete', entry.bill.id)"
            >
              <Icon :name="ICONS.trashBinMinimalistic" size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="flatBills.length === 0 && (!adjustments || adjustments.length === 0)" class="empty">
      <Icon :name="SOLAR_ICONS.billing.wallet" size="32" />
      <span>暂无账单记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillType, BalanceAdjustment } from '~/types/bill'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'
import { sum, sub, add, max } from '~/utils/decimal'
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'

type TimelineEntry =
  | { kind: 'bill'; id: string; bill: Bill; balance?: number }
  | { kind: 'adjustment'; id: string; adjustment: BalanceAdjustment }

const props = defineProps<{
  bills: Bill[]
  selectable?: boolean
  selectedIds?: string[]
  adjustments?: BalanceAdjustment[]
  accountId?: string
  currentBalance?: number
  showRunningBalance?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', bill: Bill): void
  (e: 'delete', id: string): void
  (e: 'select', id: string): void
  (e: 'select-all'): void
  (e: 'unselect-all'): void
  (e: 'split', bill: Bill): void
  (e: 'allocate', bill: Bill): void
  (e: 'refund', bill: Bill): void
  (e: 'contextmenu', payload: { bill: Bill; x: number; y: number }): void
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
    const total = sum(refunds.map(r => r.amount))
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

/**
 * 计算每笔账单对账户的余额变化量（正向：余额增加）
 */
function getBillDelta(bill: Bill, accountId: string): number {
  if (bill.type === 'debt') return 0
  let delta = 0
  if (bill.fromAccountId === accountId) delta = sub(delta, bill.amount)
  if (bill.toAccountId === accountId) delta = add(delta, bill.amount)
  return delta
}

/**
 * 运行余额 Map：billId → 该账单处理后的余额
 * 从 currentBalance 出发，按日期倒序撤销每笔账单的 delta
 */
const billBalanceMap = computed(() => {
  if (!props.showRunningBalance || !props.accountId || props.currentBalance == null) {
    return new Map<string, number>()
  }

  const balances = new Map<string, number>()
  let running = props.currentBalance

  // 所有账单按日期倒序（与显示顺序一致）
  const sorted = [...props.bills].sort((a, b) => b.date.localeCompare(a.date))

  // 调整按日期倒序索引，用于校准
  const adjMap = new Map<string, BalanceAdjustment>()
  if (props.adjustments) {
    const sortedAdj = [...props.adjustments].sort((a, b) => b.date.localeCompare(a.date))
    for (const adj of sortedAdj) {
      const dateKey = adj.date.slice(0, 10)
      if (!adjMap.has(dateKey)) {
        adjMap.set(dateKey, adj)
      }
    }
  }

  for (const bill of sorted) {
    // 如果当天有调整，使用调整的 balanceBefore 校准
    const dateKey = bill.date.slice(0, 10)
    const adj = adjMap.get(dateKey)
    if (adj) {
      running = adj.balanceBefore
      adjMap.delete(dateKey)
    }

    balances.set(bill.id, running)
    // 撤销该账单的 delta，得到之前的余额
    running = sub(running, getBillDelta(bill, props.accountId))
  }

  return balances
})

/**
 * 合并时间线：将 flatBills 和 adjustments 按日期倒序合并
 */
const timelineEntries = computed((): TimelineEntry[] => {
  if (!props.showRunningBalance || !props.adjustments || props.adjustments.length === 0) {
    // 不显示运行余额时，仅返回账单条目（兼容原有行为）
    return flatBills.value.map(bill => ({
      kind: 'bill' as const,
      id: bill.id,
      bill,
      balance: undefined
    }))
  }

  // 构建账单条目
  const billEntries: TimelineEntry[] = flatBills.value.map(bill => ({
    kind: 'bill' as const,
    id: bill.id,
    bill,
    balance: billBalanceMap.value.get(bill.id)
  }))

  // 构建调整条目
  const adjEntries: TimelineEntry[] = props.adjustments.map(adj => ({
    kind: 'adjustment' as const,
    id: adj.id,
    adjustment: adj
  }))

  // 合并并按日期倒序排列
  const merged = [...billEntries, ...adjEntries]
  merged.sort((a, b) => {
    const dateA = a.kind === 'bill' ? a.bill.date : a.adjustment.date
    const dateB = b.kind === 'bill' ? b.bill.date : b.adjustment.date
    const cmp = dateB.localeCompare(dateA)
    if (cmp !== 0) return cmp
    // 同日期：调整排在账单之后（倒序中调整更早出现）
    if (a.kind === 'adjustment' && b.kind === 'bill') return 1
    if (a.kind === 'bill' && b.kind === 'adjustment') return -1
    return 0
  })

  return merged
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

function displayAmount(bill: Bill): number {
  if (bill.isRefund) return bill.amount
  const refundTotal = refundTotalMap.value.get(bill.id)
  if (!refundTotal) return bill.amount
  return max(0, sub(bill.amount, refundTotal))
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
  gap: 8px;
}

.bill-row:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(60, 60, 67, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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

/* 余额调整行 */
.adjustment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(0, 122, 255, 0.04);
  border: 0.5px solid rgba(0, 122, 255, 0.1);
  border-left: 3px solid rgba(0, 122, 255, 0.3);
  border-radius: 8px;
  gap: 8px;
  transition: all 0.15s ease;
}

.adjustment-row:hover {
  background: rgba(0, 122, 255, 0.08);
}

.adjustment-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.75);
}

.adjustment-detail {
  color: rgba(60, 60, 67, 0.6);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.adjustment-note {
  color: rgba(60, 60, 67, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 调整 badge */
.bill-type-badge.adjustment {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
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

.refund-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
  flex-shrink: 0;
}

.allocate-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
  flex-shrink: 0;
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

.bill-amount-sub {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
  font-weight: 500;
}

.bill-currency {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.4);
  font-weight: 500;
}

/* 运行余额 */
.bill-balance {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
  font-weight: 500;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.bill-balance.negative {
  color: rgb(239, 68, 68);
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

.action-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.7);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.refund:hover:not(:disabled) {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}

.action-btn.danger:hover:not(:disabled) {
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
