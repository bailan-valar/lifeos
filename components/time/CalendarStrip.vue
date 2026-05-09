<template>
  <div class="calendar-strip">
    <!-- 展开状态：完整月日历 -->
    <div v-if="expanded" class="month-calendar">
      <div class="calendar-weekdays">
        <span v-for="day in weekdays" :key="day" class="weekday-label">{{ day }}</span>
      </div>
      <div class="calendar-grid">
        <div
          v-for="cell in calendarCells"
          :key="cell.key"
          class="calendar-cell"
          :class="{
            'other-month': !cell.isCurrentMonth,
            'today': cell.isToday,
            'selected': selectedDate === cell.dateStr,
          }"
          @click="onSelect(cell.dateStr)"
        >
          <span class="cell-day">{{ cell.day }}</span>
          <span v-if="cell.income > 0" class="cell-income">+{{ cell.income.toFixed(0) }}</span>
          <span v-if="cell.expense > 0" class="cell-expense">-{{ cell.expense.toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- 收起状态：周条 -->
    <div v-else class="week-strip">
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        class="week-day"
        :class="{
          'today': day.isToday,
          'selected': selectedDate === day.dateStr,
        }"
        @click="onSelect(day.dateStr)"
      >
        <span class="week-day-name">{{ day.weekdayName }}</span>
        <span class="week-day-number">{{ day.day }}</span>
        <span v-if="day.income > 0" class="week-day-income">+{{ day.income.toFixed(0) }}</span>
        <span v-if="day.expense > 0" class="week-day-expense">-{{ day.expense.toFixed(0) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill } from '~/types/bill'

const props = defineProps<{
  year: number
  month: number
  selectedDate: string
  expanded: boolean
  bills?: Bill[]
}>()

const emit = defineEmits<{
  (e: 'select', dateStr: string): void
}>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

function onSelect(dateStr: string) {
  emit('select', dateStr)
}

// 按日期聚合账单数据
const billsByDate = computed(() => {
  const map = new Map<string, { income: number; expense: number }>()
  for (const bill of (props.bills || [])) {
    const dateStr = bill.date.slice(0, 10)
    if (!map.has(dateStr)) {
      map.set(dateStr, { income: 0, expense: 0 })
    }
    const entry = map.get(dateStr)!
    if (bill.type === 'income' && bill.status === 'completed') {
      entry.income += bill.amount
    } else if (bill.type === 'expense' && bill.status === 'completed') {
      entry.expense += bill.amount
    }
  }
  return map
})

// 月日历格子
interface CalendarCell {
  key: string
  dateStr: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  income: number
  expense: number
}

const calendarCells = computed(() => {
  const year = props.year
  const month = props.month
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()

  let startWeekday = firstDay.getDay()
  if (startWeekday === 0) startWeekday = 7

  const cells: CalendarCell[] = []
  const todayStr = new Date().toISOString().slice(0, 10)

  // 上月补位
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startWeekday - 2; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const dateStr = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      key: `prev-${day}`,
      dateStr,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0,
    })
  }

  // 当月
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      key: `curr-${day}`,
      dateStr,
      day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0,
    })
  }

  // 下月补位
  const remaining = (7 - (cells.length % 7)) % 7
  const totalCells = cells.length + remaining < 35 ? 35 - cells.length : remaining
  for (let day = 1; day <= totalCells; day++) {
    const dateStr = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = billsByDate.value.get(dateStr)
    cells.push({
      key: `next-${day}`,
      dateStr,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0,
    })
  }

  return cells
})

// 周条数据
const weekDays = computed(() => {
  const selected = new Date(props.selectedDate + 'T00:00:00')
  const day = selected.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(selected)
  monday.setDate(selected.getDate() - diff)

  const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const todayStr = new Date().toISOString().slice(0, 10)
  const result = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const data = billsByDate.value.get(dateStr)
    result.push({
      dateStr,
      day: d.getDate(),
      weekdayName: names[i],
      isToday: dateStr === todayStr,
      income: data?.income || 0,
      expense: data?.expense || 0,
    })
  }

  return result
})
</script>

<style scoped>
.calendar-strip {
  padding: 0 16px 12px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
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
  min-height: 56px;
  padding: 4px 2px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.06);
  transition: all 0.15s ease;
  gap: 1px;
}

.calendar-cell:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 122, 255, 0.2);
}

.calendar-cell.other-month {
  opacity: 0.45;
}

.calendar-cell.today {
  border-color: rgba(0, 122, 255, 0.35);
  background: rgba(0, 122, 255, 0.06);
}

.calendar-cell.today .cell-day {
  background: rgb(0, 122, 255);
  color: white;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.calendar-cell.selected {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.15);
}

.calendar-cell.selected .cell-day {
  color: rgb(0, 122, 255);
  font-weight: 700;
}

.cell-day {
  font-size: 13px;
  font-weight: 600;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.cell-income {
  font-size: 9px;
  font-weight: 600;
  color: rgb(52, 199, 89);
  line-height: 1.2;
}

.cell-expense {
  font-size: 9px;
  font-weight: 600;
  color: rgb(255, 59, 48);
  line-height: 1.2;
}

.week-strip {
  display: flex;
  gap: 4px;
}

.week-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 0;
  border-radius: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.06);
  transition: all 0.15s ease;
}

.week-day:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 122, 255, 0.2);
}

.week-day-name {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
  font-weight: 500;
}

.week-day-number {
  font-size: 15px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
}

.week-day-income {
  font-size: 9px;
  font-weight: 600;
  color: rgb(52, 199, 89);
  line-height: 1.2;
}

.week-day-expense {
  font-size: 9px;
  font-weight: 600;
  color: rgb(255, 59, 48);
  line-height: 1.2;
}

.week-day.today {
  border-color: rgba(0, 122, 255, 0.35);
  background: rgba(0, 122, 255, 0.06);
}

.week-day.today .week-day-number {
  color: rgb(0, 122, 255);
  font-weight: 700;
}

.week-day.selected {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.15);
}

.week-day.selected .week-day-name,
.week-day.selected .week-day-number {
  color: rgb(0, 122, 255);
  font-weight: 700;
}
</style>
