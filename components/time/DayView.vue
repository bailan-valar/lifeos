<template>
  <div class="day-view">
    <CalendarStrip
      :year="year"
      :month="month"
      :selected-date="date"
      :expanded="calendarExpanded"
      :bills="monthBills"
      @select="onSelectDate"
    />

    <!-- 账单列表 -->
    <div class="day-section">
      <div class="section-header">
        <Icon name="solar:wallet-money-linear" size="16" />
        <span>账单</span>
        <span class="section-count">({{ bills.length }})</span>
      </div>
      <div v-if="bills.length === 0" class="empty-section">
        <span>当日暂无账单</span>
      </div>
      <div v-else class="bill-list">
        <div
          v-for="bill in bills"
          :key="bill.id"
          class="bill-row"
          :class="`type-${bill.type}`"
        >
          <div class="bill-left">
            <span class="bill-type-badge" :class="bill.type">{{ typeLabel(bill.type) }}</span>
            <span class="bill-desc">{{ bill.description || '-' }}</span>
          </div>
          <span class="bill-amount" :class="amountClass(bill)">
            {{ amountPrefix(bill) }}{{ bill.amount.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 笔记列表 -->
    <div class="day-section">
      <div class="section-header">
        <Icon name="solar:document-text-linear" size="16" />
        <span>笔记</span>
        <span class="section-count">({{ notes.length }})</span>
      </div>
      <div v-if="notes.length === 0" class="empty-section">
        <span>当日暂无笔记</span>
      </div>
      <div v-else class="note-list">
        <NuxtLink
          v-for="note in notes"
          :key="note.id"
          :to="`/notes?id=${note.id}`"
          class="note-row"
        >
          <span class="note-title">{{ note.title || '未命名笔记' }}</span>
          <span class="note-time">{{ formatTime(note.createdAt) }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="day-section">
      <div class="section-header">
        <Icon name="solar:check-read-linear" size="16" />
        <span>任务</span>
        <span class="section-count">({{ goals.length }})</span>
      </div>
      <div v-if="goals.length === 0" class="empty-section">
        <span>当日暂无任务</span>
      </div>
      <div v-else class="goal-list">
        <div
          v-for="goal in goals"
          :key="goal.id"
          class="goal-row"
        >
          <div class="goal-left">
            <span class="goal-status" :class="goal.status">{{ statusLabel(goal.status) }}</span>
            <span class="goal-title">{{ goal.title || '未命名任务' }}</span>
          </div>
          <span class="goal-priority" :class="goal.priority">{{ priorityLabel(goal.priority) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CalendarStrip from './CalendarStrip.vue'
import type { Bill, BillType } from '~/types/bill'
import type { Note } from '~/types/block'

interface GoalItem {
  id: string
  title: string
  status: string
  priority: string
}

const props = defineProps<{
  date: string
  calendarExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'select-date', dateStr: string): void
}>()

const bills = ref<Bill[]>([])
const monthBills = ref<Bill[]>([])
const notes = ref<Note[]>([])
const goals = ref<GoalItem[]>([])

const year = computed(() => new Date(props.date + 'T00:00:00').getFullYear())
const month = computed(() => new Date(props.date + 'T00:00:00').getMonth() + 1)

function onSelectDate(dateStr: string) {
  emit('select-date', dateStr)
}

function typeLabel(type: BillType) {
  const map: Record<string, string> = {
    income: '收入',
    expense: '支出',
    transfer: '转账',
    debt: '债务',
  }
  return map[type] || type
}

function amountClass(bill: Bill) {
  if (bill.type === 'income') return 'income'
  if (bill.type === 'expense') return 'expense'
  return ''
}

function amountPrefix(bill: Bill) {
  if (bill.type === 'income') return '+'
  if (bill.type === 'expense') return '-'
  return ''
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待办',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function priorityLabel(priority: string) {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }
  return map[priority] || priority
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function refresh() {
  const db = await import('~/services/db').then(m => m.getDB())

  // 当日账单
  const dayStartStr = props.date + 'T00:00:00'
  const dayEndStr = props.date + 'T23:59:59'
  const billResult = await db.bills.find({
    selector: { date: { $gte: dayStartStr, $lte: dayEndStr } },
    sort: [{ date: 'desc' }]
  }).exec()
  bills.value = billResult.map((doc: any) => doc.toJSON() as Bill)

  // 当月账单（用于日历统计）
  const lastDay = new Date(year.value, month.value, 0).getDate()
  const monthStart = `${year.value}-${String(month.value).padStart(2, '0')}-01`
  const monthEnd = `${year.value}-${String(month.value).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const monthResult = await db.bills.find({
    selector: { date: { $gte: monthStart, $lte: monthEnd } },
    sort: [{ date: 'desc' }]
  }).exec()
  monthBills.value = monthResult.map((doc: any) => doc.toJSON() as Bill)

  // 笔记（按 createdAt 范围）
  const dayStart = new Date(props.date + 'T00:00:00.000Z').toISOString()
  const dayEnd = new Date(props.date + 'T23:59:59.999Z').toISOString()
  const noteResult = await db.notes.find({
    selector: { createdAt: { $gte: dayStart, $lte: dayEnd } }
  }).exec()
  notes.value = noteResult.map((doc: any) => doc.toJSON() as Note)

  // 任务（goals，按 plannedStartAt / plannedEndAt 范围）
  const goalResult = await db.goals.find({
    selector: {
      plannedStartAt: { $lte: dayEnd },
      plannedEndAt: { $gte: dayStart }
    }
  }).exec()
  goals.value = goalResult.map((doc: any) => ({
    id: doc.id,
    title: doc.get('title'),
    status: doc.get('status'),
    priority: doc.get('priority'),
  }))
}

onMounted(async () => {
  await refresh()
})

watch(() => props.date, async () => {
  await refresh()
})
</script>

<style scoped>
.day-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.day-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.section-count {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.4);
  font-weight: 500;
}

.empty-section {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.4);
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 8px;
}

.bill-list,
.note-list,
.goal-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bill-row,
.note-row,
.goal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  cursor: default;
  transition: background-color 0.15s ease;
}

.note-row {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.note-row:hover,
.bill-row:hover,
.goal-row:hover {
  background: rgba(255, 255, 255, 0.75);
}

.bill-left,
.goal-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bill-type-badge {
  display: inline-flex;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.bill-type-badge.income {
  color: rgb(52, 199, 89);
  background: rgba(52, 199, 89, 0.12);
}

.bill-type-badge.expense {
  color: rgb(255, 59, 48);
  background: rgba(255, 59, 48, 0.12);
}

.bill-type-badge.transfer {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
}

.bill-type-badge.debt {
  color: rgb(175, 82, 222);
  background: rgba(175, 82, 222, 0.12);
}

.bill-desc,
.goal-title,
.note-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.note-time {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}

.bill-amount {
  font-size: 15px;
  font-weight: 700;
}

.bill-amount.income {
  color: rgb(52, 199, 89);
}

.bill-amount.expense {
  color: rgb(255, 59, 48);
}

.goal-status {
  display: inline-flex;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.goal-status.pending {
  color: rgb(255, 149, 0);
  background: rgba(255, 149, 0, 0.12);
}

.goal-status.in_progress {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
}

.goal-status.completed {
  color: rgb(52, 199, 89);
  background: rgba(52, 199, 89, 0.12);
}

.goal-status.cancelled {
  color: rgba(60, 60, 67, 0.4);
  background: rgba(0, 0, 0, 0.06);
}

.goal-priority {
  display: inline-flex;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.goal-priority.low {
  color: rgb(52, 199, 89);
  background: rgba(52, 199, 89, 0.12);
}

.goal-priority.medium {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
}

.goal-priority.high {
  color: rgb(255, 149, 0);
  background: rgba(255, 149, 0, 0.12);
}

.goal-priority.urgent {
  color: rgb(255, 59, 48);
  background: rgba(255, 59, 48, 0.12);
}
</style>
