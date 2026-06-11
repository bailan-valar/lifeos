<template>
  <div class="bill-wrapper">
    <div
      class="bill-item"
      :class="[
        `type-${bill.type}`,
        { 'is-child': bill.parentId },
        { 'is-refund': bill.isRefund },
        { 'has-children': bill.hasChildren && !bill.parentId },
        { 'is-selected': selected },
        { 'is-dragging': isDragging }
      ]"
      :draggable="draggable"
      @click="$emit('click', bill)"
      @contextmenu.prevent="onContextMenu"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
    >
      <!-- 选择框 -->
      <div v-if="selectable" class="bill-checkbox">
        <input
          type="checkbox"
          :checked="selected"
          @change.stop="$emit('select', bill.id)"
        />
      </div>

      <!-- 展开/收起按钮 -->
      <button
        v-if="bill.hasChildren && !bill.parentId && !bill.isRefund"
        type="button"
        class="expand-btn"
        :class="{ expanded: effectiveExpanded }"
        @click.stop="onToggleExpand"
      >
        <Icon :name="effectiveExpanded ? SOLAR_ICONS.nav.down : SOLAR_ICONS.nav.right" size="14" />
      </button>
      <div v-else-if="bill.parentId" class="child-placeholder"></div>
      <div v-else class="expand-placeholder"></div>

      <div class="bill-left">
        <div class="bill-primary-row">
          <span class="bill-type-badge" :class="bill.type">{{ typeLabel(bill.type) }}</span>
          <!-- 已拆分标记 -->
          <span v-if="bill.hasChildren && !bill.parentId" class="split-badge">已拆分</span>
          <!-- 子账单标记 -->
          <span v-if="bill.parentId" class="child-badge">子账单</span>
          <!-- 退款标记 -->
          <span v-if="refundBadge === 'refund' || (refundBadge === 'auto' && bill.isRefund)" class="refund-badge">退款</span>
          <span v-if="refundBadge === 'source' && !bill.isRefund" class="refund-badge">已退款</span>
          <!-- 可节省标记 -->
          <span v-if="bill.isSavable && bill.type === 'expense'" class="savable-badge">可节省</span>
          <!-- 分摊月份标记 -->
          <span v-if="bill.allocatedMonth" class="allocate-badge">
            {{ bill.allocatedMonth }}
          </span>
          <span v-if="categoryName" class="bill-category-primary">
            {{ categoryName }}
          </span>
          <span v-else class="bill-category-empty">未分类</span>
        </div>
        <!-- 二级信息行 -->
        <div class="bill-secondary-row">
          <span v-if="noteTag" class="bill-note-tag">{{ noteTag }}</span>
          <span class="bill-datetime">{{ formatDateTime(bill.date) }}</span>
          <span class="bill-sep">·</span>
          <span class="bill-account">{{ accountName }}</span>
          <span class="bill-sep">·</span>
          <span class="bill-description">{{ bill.description || '-' }}</span>
        </div>
      </div>
      <div class="bill-right">
        <div class="bill-amount-row">
          <span class="bill-amount" :class="amountClass(bill)">
            {{ amountPrefix(bill) }}{{ displayAmount.toFixed(2) }}
          </span>
          <span class="bill-currency">{{ bill.currency }}</span>
        </div>
        <!-- 退款小计 -->
        <div v-if="refundTotal != null && refundTotal > 0 && !bill.isRefund" class="bill-amount-sub">
          ({{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}-{{ refundTotal.toFixed(2) }})
        </div>
        <!-- 运行余额 -->
        <div v-if="runningBalance != null" class="bill-balance" :class="{ negative: runningBalance < 0 }">
          余额 {{ runningBalance.toFixed(2) }}
        </div>
        <!-- 操作按钮 -->
        <div v-if="showActions" class="bill-actions">
          <!-- 父账单操作 -->
          <template v-if="!bill.parentId && !bill.isRefund">
            <button
              type="button"
              class="action-btn"
              title="拆分账单"
              :disabled="bill.hasChildren"
              @click.stop="$emit('split', bill)"
            >
              <Icon :name="SOLAR_ICONS.action.split" size="14" />
            </button>
            <button
              type="button"
              class="action-btn"
              title="分摊到月份"
              :disabled="bill.hasChildren"
              @click.stop="$emit('allocate', bill)"
            >
              <Icon :name="SOLAR_ICONS.billing.calendar" size="14" />
            </button>
            <button
              type="button"
              class="action-btn refund"
              title="退款"
              @click.stop="$emit('refund', bill)"
            >
              <Icon :name="SOLAR_ICONS.action.refresh" size="14" />
            </button>
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click.stop="$emit('edit', bill)"
            >
              <Icon :name="SOLAR_ICONS.action.edit" size="14" />
            </button>
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click.stop="$emit('delete', bill.id)"
            >
              <Icon :name="SOLAR_ICONS.action.delete" size="14" />
            </button>
          </template>
          <!-- 子账单操作 -->
          <template v-else>
            <button
              type="button"
              class="action-btn"
              title="编辑"
              @click.stop="$emit('edit', bill)"
            >
              <Icon :name="SOLAR_ICONS.action.edit" size="14" />
            </button>
            <button
              type="button"
              class="action-btn danger"
              title="删除"
              @click.stop="$emit('delete', bill.id)"
            >
              <Icon :name="SOLAR_ICONS.action.delete" size="14" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 子账单列表 -->
    <div v-if="showChildren && bill.hasChildren && effectiveExpanded && childBills.length > 0" class="child-bills">
      <BillListItem
        v-for="child in childBills"
        :key="child.id"
        :bill="child"
        :category-name="getCategoryName(child.categoryId)"
        :account-name="getAccountName(child)"
        :show-actions="showActions"
        @click="$emit('click', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BillType } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { max } from '~/utils/decimal'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'

/**
 * 退款 badge 显示模式
 * - 'auto': 自动判断（bill.isRefund 时显示"退款"）— 向后兼容默认
 * - 'source': 对源账单显示"已退款"
 * - 'refund': 强制显示"退款"
 * - 'none': 不显示退款 badge
 */
type RefundBadgeMode = 'auto' | 'source' | 'refund' | 'none'

const props = withDefaults(defineProps<{
  bill: Bill
  categoryName?: string
  accountName?: string
  noteTag?: string
  refundDeduction?: number
  showActions?: boolean
  allBills?: Bill[]
  // 选择模式
  selectable?: boolean
  selected?: boolean
  // 运行余额
  runningBalance?: number
  // 退款 badge
  refundBadge?: RefundBadgeMode
  refundTotal?: number
  // 展开/收起（受控模式）
  expanded?: boolean
  showChildren?: boolean
  // 右键菜单
  contextMenuEnabled?: boolean
  // 紧凑模式（日历视图）
  compact?: boolean
  // 拖拽模式
  draggable?: boolean
}>(), {
  selectable: false,
  selected: false,
  showActions: true,
  showChildren: true,
  contextMenuEnabled: false,
  compact: false,
  refundBadge: 'auto',
  draggable: false
})

const emit = defineEmits<{
  (e: 'click', bill: Bill): void
  (e: 'edit', bill: Bill): void
  (e: 'delete', id: string): void
  (e: 'split', bill: Bill): void
  (e: 'allocate', bill: Bill): void
  (e: 'refund', bill: Bill): void
  (e: 'select', id: string): void
  (e: 'toggle-expand', bill: Bill): void
  (e: 'contextmenu', payload: { bill: Bill; x: number; y: number }): void
  (e: 'dragstart', bill: Bill, event: DragEvent): void
  (e: 'dragend'): void
}>()

const { categories } = useBillCategories()
const { accounts } = useAccounts()

// 展开状态：受控模式 vs 内部管理
const internalExpanded = ref(false)
const effectiveExpanded = computed(() =>
  props.expanded != null ? props.expanded : internalExpanded.value
)

function onToggleExpand() {
  if (props.expanded != null) {
    emit('toggle-expand', props.bill)
  } else {
    internalExpanded.value = !internalExpanded.value
  }
}

// 获取子账单
const childBills = computed(() => {
  if (!props.allBills || !props.bill.hasChildren) return []
  return props.allBills.filter(b => b.parentId === props.bill.id && !b.isRefund)
})

// 分类映射
const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map(c => [c.id, c]))
)

// 账户映射
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
  if (bill.type === 'income') return '+'
  if (bill.type === 'expense') return '-'
  if (bill.type === 'transfer') return ''
  if (bill.type === 'debt') return bill.debtSubtype === 'lend' ? '-' : '+'
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

function onContextMenu(event: MouseEvent) {
  if (!props.contextMenuEnabled) return
  emit('contextmenu', { bill: props.bill, x: event.clientX, y: event.clientY })
}

// 拖拽状态
const isDragging = ref(false)

function onDragStart(event: DragEvent) {
  if (!props.draggable) return
  isDragging.value = true
  emit('dragstart', props.bill, event)
}

function onDragEnd() {
  isDragging.value = false
  emit('dragend')
}

// 计算显示金额（减去退款）
const displayAmount = computed(() => {
  if (props.bill.isRefund) return props.bill.amount
  // 优先使用 refundTotal（BillList 提供的退款总额）
  if (props.refundTotal != null && props.refundTotal > 0) {
    return max(0, props.bill.amount - props.refundTotal)
  }
  // 兼容旧的 refundDeduction prop
  if (props.refundDeduction) return Math.max(0, props.bill.amount - props.refundDeduction)
  return props.bill.amount
})
</script>

<style scoped>
.bill-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bill-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--liquid-bg);
  border: var(--liquid-border);
  border-radius: 12px;
  transition: all 0.15s ease;
  gap: 8px;
  cursor: pointer;
}

.bill-item:hover {
  background: var(--liquid-bg-thick);
  border-color: rgba(60, 60, 67, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.bill-item.has-children {
  border-radius: 12px;
}

.bill-item.is-child {
  background: rgba(60, 60, 67, 0.03);
  border-radius: 8px;
  margin-left: 16px;
}

.bill-item.is-child:hover {
  background: rgba(60, 60, 67, 0.06);
}

.bill-item.is-refund {
  background: rgba(255, 149, 0, 0.04);
  border-left: 3px solid rgba(255, 149, 0, 0.4);
  border-radius: 8px;
}

.bill-item.is-refund:hover {
  background: rgba(255, 149, 0, 0.08);
}

.bill-item.is-selected {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.25);
}

.bill-item.is-dragging {
  opacity: 0.4;
}

/* 选择框 */
.bill-checkbox {
  display: flex;
  align-items: center;
  padding-right: 4px;
  flex-shrink: 0;
}

.bill-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
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

.expand-btn.expanded {
  transform: rotate(0deg);
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
  flex-wrap: wrap;
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

.split-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(147, 51, 234, 0.12);
  color: rgb(147, 51, 234);
  flex-shrink: 0;
}

.child-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(107, 114, 128, 0.12);
  color: rgb(107, 114, 128);
  flex-shrink: 0;
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

.savable-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
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

.bill-note-tag {
  display: inline-flex;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  white-space: nowrap;
  flex-shrink: 0;
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

.bill-item:hover .bill-actions {
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

.child-bills {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
  border-left: 2px solid rgba(60, 60, 67, 0.1);
  margin-left: 24px;
}
</style>
