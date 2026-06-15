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

      <!-- 账单行 — 委托给 BillListItem -->
      <BillListItem
        v-else
        :bill="entry.bill"
        :category-name="getCategoryName(entry.bill.categoryId)"
        :account-name="getAccountName(entry.bill)"
        :note-tag="getNoteTitle(entry.bill.noteId)"
        :selectable="selectable"
        :selected="selectable && selectedIds?.includes(entry.bill.id)"
        :expanded="expandedIds.has(entry.bill.id)"
        :show-children="false"
        :show-actions="!selectable"
        :running-balance="showRunningBalance ? entry.balance : undefined"
        :refund-badge="getRefundBadgeMode(entry.bill)"
        :refund-total="getRefundTotal(entry.bill)"
        @click="$emit('edit', $event)"
        @select="onSelect"
        @toggle-expand="onToggleExpand"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @split="$emit('split', $event)"
        @allocate="$emit('allocate', $event)"
        @refund="$emit('refund', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
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
import { useNotes } from '~/composables/useNotes'
import { sum, sub, add } from '~/utils/decimal'
import { SOLAR_ICONS } from '~/composables/useIcons'
import BillListItem from './BillListItem.vue'

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
const { noteOptions } = useNotes()

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c]))
)

const accountMap = computed(() =>
  Object.fromEntries(accounts.value.map(a => [a.id, a]))
)

const noteMap = computed(() =>
  Object.fromEntries(noteOptions.value.map(n => [n.id, n.title]))
)

function getNoteTitle(noteId: string): string | undefined {
  if (!noteId) return undefined
  return noteMap.value[noteId] || undefined
}

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

// 报销单映射：reimbursementId -> 关联账单列表
const reimbursementBillsMap = computed(() => {
  const map = new Map<string, Bill[]>()
  for (const bill of props.bills) {
    if (bill.reimbursementId) {
      if (!map.has(bill.reimbursementId)) {
        map.set(bill.reimbursementId, [])
      }
      map.get(bill.reimbursementId)!.push(bill)
    }
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
  let delta = 0
  if (bill.fromAccountId === accountId) delta = sub(delta, bill.amount)
  if (bill.toAccountId === accountId) delta = add(delta, bill.amount)
  return delta
}

interface BalanceTraceStep {
  step: string           // 步骤描述
  date: string           // 发生时间
  detail: string         // 明细文案
  delta: number          // 对账户的余额变化量（正向增加）
  balance: number        // 该步骤结束后的余额
  calibratedBy?: string  // 若被调整校准，记录调整时间
}

/**
 * 余额计算核心：一次遍历同时产出
 * - balances: billId → 该账单处理后的余额（供 UI 使用）
 * - trace: 计算过程追踪（供调试输出）
 *
 * 从 currentBalance 出发，按日期倒序撤销每笔账单的 delta。
 * 调整作为时间线上的校准点：bill.date <= adj.date 时切换到 balanceBefore 基线。
 */
function computeBalances(): { balances: Map<string, number>; trace: BalanceTraceStep[] } {
  const balances = new Map<string, number>()
  const trace: BalanceTraceStep[] = []

  if (!props.showRunningBalance || !props.accountId || props.currentBalance == null) {
    return { balances, trace }
  }

  let running = props.currentBalance

  // 所有账单按日期倒序（与显示顺序一致）
  const sorted = [...props.bills].sort((a, b) => b.date.localeCompare(a.date))

  // 调整按日期倒序排列，用指针逐个消费
  const sortedAdj = props.adjustments
    ? [...props.adjustments].sort((a, b) => b.date.localeCompare(a.date))
    : []
  let adjIdx = 0

  trace.push({
    step: '起点',
    date: '-',
    detail: `当前余额 = ${props.currentBalance}`,
    delta: 0,
    balance: running
  })

  for (const bill of sorted) {
    let calibratedBy: string | undefined
    // 当账单日期 <= 调整日期时，说明账单在调整之前或同时
    // 需要校准：调整前的余额路径与调整后独立
    while (adjIdx < sortedAdj.length && bill.date <= sortedAdj[adjIdx].date) {
      running = sortedAdj[adjIdx].balanceBefore
      calibratedBy = sortedAdj[adjIdx].date
      trace.push({
        step: '调整校准',
        date: sortedAdj[adjIdx].date,
        detail: `切换基线 → balanceBefore = ${sortedAdj[adjIdx].balanceBefore}`,
        delta: 0,
        balance: running
      })
      adjIdx++
    }

    const delta = getBillDelta(bill, props.accountId)
    balances.set(bill.id, running)
    trace.push({
      step: '账单',
      date: bill.date,
      detail: `${bill.type} ¥${bill.amount}（${bill.description || '无描述'}）`,
      delta,
      balance: running,
      calibratedBy
    })
    // 撤销该账单的 delta，得到之前的余额
    running = sub(running, delta)
  }

  trace.push({
    step: '终点',
    date: '-',
    detail: `时间线最早端 running = ${running}`,
    delta: 0,
    balance: running
  })

  return { balances, trace }
}

const balanceResult = computed(() => computeBalances())

/**
 * 运行余额 Map：billId → 该账单处理后的余额
 */
const billBalanceMap = computed(() => balanceResult.value.balances)

/**
 * 调试输出：余额计算过程追踪。
 * 仅在账户详情页（showRunningBalance）启用，便于验证每笔账单余额的推导。
 */
watch(() => balanceResult.value.trace, (trace) => {
  if (!props.showRunningBalance || trace.length === 0) return
  console.groupCollapsed(
    `%c[余额计算追踪] accountId=${props.accountId} 当前余额=${props.currentBalance}`,
    'color:#0a7aff;font-weight:600'
  )
  console.table(trace)
  console.groupEnd()
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

function onSelect(id: string) {
  emit('select', id)
}

function onToggleExpand(bill: Bill) {
  const next = new Set(expandedIds.value)
  if (next.has(bill.id)) {
    next.delete(bill.id)
  } else {
    next.add(bill.id)
  }
  expandedIds.value = next
}

/**
 * 判断退款 badge 显示模式
 */
function getRefundBadgeMode(bill: Bill): 'source' | 'refund' | 'none' {
  if (bill.isRefund) return 'refund'
  if (refundBillsMap.value.has(bill.id)) return 'source'
  return 'none'
}

/**
 * 获取退款总额（仅对有退款的源账单返回）
 */
function getRefundTotal(bill: Bill): number | undefined {
  return refundTotalMap.value.get(bill.id)
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

/* 余额调整行 — 仍由 BillList 自行渲染 */
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

/* 调整行内共用样式 */
.adjustment-row .bill-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.adjustment-row .bill-primary-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.adjustment-row .bill-secondary-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  overflow: hidden;
}

.adjustment-row .bill-datetime {
  flex-shrink: 0;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.adjustment-row .bill-sep {
  flex-shrink: 0;
  color: rgba(60, 60, 67, 0.2);
}

.adjustment-row .bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  padding-left: 12px;
  min-width: 100px;
}

.adjustment-row .bill-amount-row {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

/* 调整 badge */
.bill-type-badge.adjustment {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.adjustment-row .bill-amount {
  font-size: 17px;
  font-weight: 600;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
}

.adjustment-row .bill-amount.neutral {
  color: rgb(59, 130, 246);
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
