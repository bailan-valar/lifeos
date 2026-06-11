<template>
  <div class="bill-calendar">
    <div class="calendar-header">
      <button type="button" class="nav-btn" @click="prevMonth">
        <Icon name="solar:alt-arrow-left-linear" size="18" />
      </button>
      <span class="month-label">{{ displayYear }}年 {{ displayMonth }}月</span>
      <button type="button" class="nav-btn" @click="nextMonth">
        <Icon name="solar:alt-arrow-right-linear" size="18" />
      </button>
    </div>

    <div class="calendar-weekdays">
      <span v-for="day in weekdays" :key="day" class="weekday-label">{{ day }}</span>
    </div>

    <div class="calendar-grid">
      <div
        v-for="(cell, idx) in displayedCells"
        :key="idx"
        class="calendar-cell"
        :class="{
          'other-month': !cell.isCurrentMonth,
          'today': cell.isToday,
          'selected': selectedDate === cell.dateStr,
          'has-data': cell.income > 0 || cell.expense > 0
        }"
        @click="onCellClick(cell)"
      >
        <div class="cell-date">{{ cell.day }}</div>
        <div v-show="cell.income > 0" class="cell-income">+{{ cell.income.toFixed(0) }}</div>
        <div v-show="cell.expense > 0" class="cell-expense">-{{ cell.expense.toFixed(0) }}</div>
      </div>
    </div>

    <div class="day-bills-section">
      <div class="day-bills-header">
        <span class="day-bills-title">
          {{ selectedDate ? formatSelectedDate(selectedDate) : '请选择日期' }}
        </span>
        <span v-if="selectedDate" class="day-bills-summary">
          <span v-if="dayIncome > 0" class="summary-income">收入 +{{ dayIncome.toFixed(2) }}</span>
          <span v-if="dayExpense > 0" class="summary-expense">支出 -{{ dayExpense.toFixed(2) }}</span>
        </span>
      </div>
      <div class="day-bills-list">
        <BillListItem
          v-for="bill in dayBills"
          :key="bill.id"
          :bill="bill"
          :category-name="getCategoryName(bill.categoryId)"
          :account-name="getAccountName(bill)"
          :show-actions="false"
          @click="$emit('edit', bill)"
          @contextmenu="$emit('contextmenu', $event)"
        />
        <div v-if="selectedDate && dayBills.length === 0" class="day-empty">
          <Icon name="solar:wallet-money-linear" size="24" />
          <span>当日暂无账单</span>
        </div>
        <div v-if="!selectedDate" class="day-empty">
          <Icon name="solar:calendar-linear" size="24" />
          <span>点击日历中的日期查看账单</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill } from '~/types/bill'
import { toLocalISO } from '~/services/db'
import { computed, ref, watch, nextTick } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { sum, add } from '~/utils/decimal'
import { storeToRefs } from 'pinia'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'
import BillListItem from './BillListItem.vue'

const props = defineProps<{
  bills: Bill[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', bill: Bill): void
  (e: 'contextmenu', payload: { bill: Bill; x: number; y: number }): void
}>()

const store = useBillingStore()
const { billYearFilter, billMonthFilter } = storeToRefs(store)

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

const fallbackDate = new Date()
const currentYear = computed(() => billYearFilter.value ?? fallbackDate.getFullYear())
const currentMonth = computed(() => billMonthFilter.value ?? fallbackDate.getMonth() + 1)

const selectedDate = ref<string | null>(null)

// 标记是否正在等待 props 更新完成
const pendingYearMonthUpdate = ref(false)

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

// 按日期聚合账单数据
const billsByDate = computed(() => {
  const map = new Map<string, { income: number; expense: number; bills: Bill[] }>()
  for (const bill of props.bills) {
    const dateStr = bill.date.slice(0, 10)
    if (!map.has(dateStr)) {
      map.set(dateStr, { income: 0, expense: 0, bills: [] })
    }
    const entry = map.get(dateStr)!
    entry.bills.push(bill)
    if (bill.type === 'income' && bill.status === 'completed') {
      entry.income = add(entry.income, bill.amount)
    } else if (bill.type === 'expense' && bill.status === 'completed') {
      entry.expense = add(entry.expense, bill.amount)
    }
  }
  return map
})

// 显示状态：用于用户界面显示
const displayYear = ref(billYearFilter.value ?? fallbackDate.getFullYear())
const displayMonth = ref(billMonthFilter.value ?? fallbackDate.getMonth() + 1)

function buildCells(): CalendarCell[] {
  const year = displayYear.value
  const month = displayMonth.value

  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)
  const daysInMonth = lastDayOfMonth.getDate()

  let startWeekday = firstDayOfMonth.getDay()
  if (startWeekday === 0) startWeekday = 7

  const cells: CalendarCell[] = []
  const todayStr = toLocalISO('date')

  // 上月补位
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startWeekday - 2; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const dateStr = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      dateStr,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0
    })
  }

  // 当月
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      dateStr,
      day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0
    })
  }

  // 下月补位，固定凑满6行42格
  const totalCells = 42 - cells.length
  for (let day = 1; day <= totalCells; day++) {
    const dateStr = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      dateStr,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0
    })
  }

  return cells
}

const displayedCells = computed(() => buildCells())

// 监听月份切换：更新显示状态 + 重置选中日期
// 注意：只在用户主动切换月份时触发，静默数据刷新（新增/编辑账单后）不会改变 filter，因此不会重置日期
watch([billYearFilter, billMonthFilter], async () => {
  const newYear = billYearFilter.value ?? fallbackDate.getFullYear()
  const newMonth = billMonthFilter.value ?? fallbackDate.getMonth() + 1

  // 标记正在等待更新
  pendingYearMonthUpdate.value = true

  // 等待所有 props 更新完成（包括 loading）
  await nextTick()

  // 更新显示状态
  displayYear.value = newYear
  displayMonth.value = newMonth

  // 月份切换时重置选中日期
  const now = new Date()
  if (newYear === now.getFullYear() && newMonth === now.getMonth() + 1) {
    selectedDate.value = toLocalISO('date')
  } else {
    selectedDate.value = null
  }

  pendingYearMonthUpdate.value = false
}, { immediate: true })

// loading 或等待更新期间禁用点击
function onCellClick(cell: CalendarCell) {
  if (props.loading || pendingYearMonthUpdate.value) return
  selectedDate.value = cell.dateStr
}

interface CalendarCell {
  dateStr: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  income: number
  expense: number
}



function prevMonth() {
  if (currentMonth.value === 1) {
    billYearFilter.value = currentYear.value - 1
    billMonthFilter.value = 12
  } else {
    billYearFilter.value = currentYear.value
    billMonthFilter.value = currentMonth.value - 1
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    billYearFilter.value = currentYear.value + 1
    billMonthFilter.value = 1
  } else {
    billYearFilter.value = currentYear.value
    billMonthFilter.value = currentMonth.value + 1
  }
}



const dayBills = computed(() => {
  if (!selectedDate.value) return []
  const entry = billsByDate.value.get(selectedDate.value)
  if (!entry) return []
  return entry.bills.sort((a, b) => b.date.localeCompare(a.date))
})

const dayIncome = computed(() => {
  return sum(dayBills.value
    .filter(b => b.type === 'income' && b.status === 'completed')
    .map(b => b.amount))
})

const dayExpense = computed(() => {
  return sum(dayBills.value
    .filter(b => b.type === 'expense' && b.status === 'completed')
    .map(b => b.amount))
})

function formatSelectedDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}
</script>

<style scoped>
.bill-calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 4px 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  color: rgba(60, 60, 67, 0.8);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}

.month-label {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  min-width: 120px;
  text-align: center;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekday-label {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  padding: 6px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 64px;
  padding: 4px 2px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.06);
  cursor: pointer;
  gap: 1px;
}

.calendar-cell:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 122, 255, 0.2);
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.calendar-cell.other-month {
  opacity: 0.45;
}

.calendar-cell.today {
  border-color: rgba(0, 122, 255, 0.35);
  background: rgba(0, 122, 255, 0.06);
}

.calendar-cell.selected {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.15);
}

.cell-date {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.calendar-cell.today .cell-date {
  background: rgb(0, 122, 255);
  color: white;
}

.cell-income {
  font-size: 10px;
  font-weight: 600;
  color: rgb(52, 199, 89);
  line-height: 1.2;
}

.cell-expense {
  font-size: 10px;
  font-weight: 600;
  color: rgb(255, 59, 48);
  line-height: 1.2;
}

.day-bills-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
  padding-top: 12px;
}

.day-bills-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.day-bills-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.day-bills-summary {
  display: flex;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
}

.summary-income {
  color: rgb(52, 199, 89);
}

.summary-expense {
  color: rgb(255, 59, 48);
}

.day-bills-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.day-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 13px;
}

@media (max-width: 640px) {
  .calendar-cell {
    min-height: 52px;
    padding: 2px 1px;
  }
  .cell-income,
  .cell-expense {
    font-size: 9px;
  }
  .cell-date {
    font-size: 12px;
    width: 20px;
    height: 20px;
  }
  .day-bills-list {
    max-height: 240px;
  }
}
</style>
