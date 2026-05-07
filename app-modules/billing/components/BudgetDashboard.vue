<template>
  <div class="budget-dashboard">
    <div class="dashboard-header">
      <div class="header-left">
        <NotePicker
          v-model="selectedNoteId"
          :options="noteOptions"
          placeholder="全局"
          clearable
        />
      </div>
      <div class="year-nav">
        <button class="nav-btn" @click="currentYear--">
          <Icon name="solar:alt-arrow-left-linear" size="16" />
        </button>
        <span class="year-label">{{ currentYear }}年</span>
        <button class="nav-btn" @click="currentYear++">
          <Icon name="solar:alt-arrow-right-linear" size="16" />
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="budget-table">
        <div class="table-header">
          <div class="col-category">分类</div>
          <div class="col-year-budget">年预算</div>
          <div
            v-for="m in 12"
            :key="m"
            class="col-month-header"
            :class="{ current: m === currentMonth && currentYear === thisYear }"
          >
            {{ m }}月
          </div>
        </div>

        <div v-if="visibleRows.length === 0" class="empty-row">
          <span>暂无支出分类数据</span>
        </div>

        <template v-for="row in visibleRows" :key="row.node.id">
          <div v-if="row.cycleType === 'yearly'" class="table-row">
            <div
              class="col-category"
              :style="{ paddingLeft: `${row.level * 16 + 8}px` }"
              @contextmenu.prevent="onCategoryContextMenu($event, row.node)"
            >
              <button
                v-if="row.node.children.length > 0"
                class="expand-btn"
                @click.stop="toggleExpand(row.node.id)"
              >
                <Icon
                  :name="expandedIds.has(row.node.id) ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'"
                  size="14"
                />
              </button>
              <span v-else class="expand-placeholder"></span>
              <span class="category-name">{{ row.node.name }}</span>
            </div>
            <div class="col-year-budget">
              <div v-if="row.hasOwnBudget" class="budget-num">{{ row.yearBudget.toFixed(0) }}</div>
              <div v-else class="sub-sum">子: {{ row.childrenBudgetSum.toFixed(0) }}</div>
            </div>
            <div
              class="col-month-yearly cell"
              :style="{ backgroundColor: getCellBg(row.yearPercentage, row.yearBudget > 0) }"
              @click="onCellClick(row.node.id, 1)"
            >
              <div v-if="row.yearBudget > 0 || row.yearActual > 0" class="cell-content">
                <div class="cell-budget">{{ row.yearBudget.toFixed(0) }}</div>
                <div class="cell-divider"></div>
                <div class="cell-actual" :class="{ over: row.yearPercentage > 1 }">
                  {{ row.yearActual.toFixed(0) }}
                </div>
              </div>
              <div
                v-if="row.yearBudget > 0"
                class="cell-percentage-badge"
                :class="{ over: row.yearPercentage > 1 }"
              >
                {{ (row.yearPercentage * 100).toFixed(0) }}%
              </div>
            </div>
          </div>

          <div v-else class="table-row">
            <div
              class="col-category"
              :style="{ paddingLeft: `${row.level * 16 + 8}px` }"
              @contextmenu.prevent="onCategoryContextMenu($event, row.node)"
            >
              <button
                v-if="row.node.children.length > 0"
                class="expand-btn"
                @click.stop="toggleExpand(row.node.id)"
              >
                <Icon
                  :name="expandedIds.has(row.node.id) ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'"
                  size="14"
                />
              </button>
              <span v-else class="expand-placeholder"></span>
              <span class="category-name">{{ row.node.name }}</span>
            </div>
            <div class="col-year-budget">
              <div v-if="row.hasOwnBudget" class="budget-num">{{ row.yearBudget.toFixed(0) }}</div>
              <div v-else class="sub-sum">子: {{ row.childrenBudgetSum.toFixed(0) }}</div>
            </div>
            <div
              v-for="(cell, idx) in row.monthly"
              :key="idx"
              class="col-month cell"
              :class="{ current: idx + 1 === currentMonth && currentYear === thisYear }"
              :style="{ backgroundColor: getCellBg(cell.percentage, cell.budget > 0) }"
              @click="onCellClick(row.node.id, idx + 1)"
            >
              <div v-if="cell.budget > 0 || cell.actual > 0" class="cell-content">
                <div class="cell-budget">{{ cell.budget.toFixed(0) }}</div>
                <div class="cell-divider"></div>
                <div class="cell-actual" :class="{ over: cell.percentage > 1 }">
                  {{ cell.actual.toFixed(0) }}
                </div>
              </div>
              <div
                v-if="cell.budget > 0"
                class="cell-percentage-badge"
                :class="{ over: cell.percentage > 1 }"
              >
                {{ (cell.percentage * 100).toFixed(0) }}%
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BudgetCycleType, CategoryTreeNode } from '~/types/bill'
import NotePicker from './NotePicker.vue'

const props = defineProps<{ year?: number }>()

const emit = defineEmits<{
  (e: 'edit-cell', categoryId: string, year: number, month: number, noteId: string): void
  (e: 'category-contextmenu', payload: { node: CategoryTreeNode; x: number; y: number }): void
}>()

const { loadBills } = useBills()
const { loadBudgets, resolveBudget, getMonthlyEquivalent } = useBudgets()
const { loadCategories, buildTree } = useBillCategories()
const { loadNotes, noteOptions, getDescendantNoteIds } = useNotes()

const thisYear = new Date().getFullYear()
const currentYear = ref(props.year ?? thisYear)
const currentMonth = new Date().getMonth() + 1
const expandedIds = ref<Set<string>>(new Set())
const selectedNoteId = ref('')
const scopedBills = ref<Bill[]>([])

function onCategoryContextMenu(event: MouseEvent, node: CategoryTreeNode) {
  emit('category-contextmenu', { node, x: event.clientX, y: event.clientY })
}

async function refreshData() {
  await loadBudgets(selectedNoteId.value)
  if (selectedNoteId.value) {
    const noteIds = getDescendantNoteIds(selectedNoteId.value)
    const db = await (async () => {
      const { getDB } = await import('~/services/db')
      return getDB()
    })()
    const selector: Record<string, unknown> = noteIds.length === 1
      ? { noteId: noteIds[0] }
      : { noteId: { $in: noteIds } }
    const result = await (await db).bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()
    scopedBills.value = result.map((doc: any) => doc.toJSON())
  } else {
    const db = await (async () => {
      const { getDB } = await import('~/services/db')
      return getDB()
    })()
    const result = await (await db).bills.find({
      sort: [{ date: 'desc' }]
    }).exec()
    scopedBills.value = result.map((doc: any) => doc.toJSON())
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadNotes()])
  await refreshData()
})

watch(selectedNoteId, async () => {
  await refreshData()
})

const expenseTree = computed(() => buildTree('expense'))

watch(
  expenseTree,
  (tree) => {
    if (expandedIds.value.size > 0 || tree.length === 0) return
    try {
      const saved = localStorage.getItem('lifeos:budget-dashboard:expanded')
      if (saved) {
        expandedIds.value = new Set(JSON.parse(saved))
        return
      }
    } catch { /* ignore */ }
    const defaults = new Set<string>()
    for (const root of tree) defaults.add(root.id)
    expandedIds.value = defaults
  },
  { immediate: true }
)

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
  try {
    localStorage.setItem('lifeos:budget-dashboard:expanded', JSON.stringify([...next]))
  } catch { /* ignore */ }
}

function getDirectActual(categoryId: string, year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return scopedBills.value
    .filter(b => b.type === 'expense' && b.categoryId === categoryId && b.date.startsWith(prefix))
    .reduce((sum, b) => sum + b.amount, 0)
}

interface MonthlyCell {
  budget: number
  actual: number
  percentage: number
  cycleType: BudgetCycleType | null
}

interface TableRow {
  node: CategoryTreeNode
  level: number
  yearBudget: number
  yearActual: number
  yearPercentage: number
  monthly: MonthlyCell[]
  hasOwnBudget: boolean
  childrenBudgetSum: number
  cycleType: BudgetCycleType | null
}

interface TreeRow {
  data: TableRow
  children: TreeRow[]
}

function calcTree(nodes: CategoryTreeNode[], year: number, level = 0): TreeRow[] {
  return nodes.map(node => {
    const childTree = calcTree(node.children, year, level + 1)

    const ownMonthly: { budget: number; actual: number; config: ReturnType<typeof resolveBudget> }[] = []
    for (let month = 1; month <= 12; month++) {
      const config = resolveBudget(node.id, year, month, selectedNoteId.value)
      const budget = config ? getMonthlyEquivalent(node.id, year, month, selectedNoteId.value) : 0
      const actual = getDirectActual(node.id, year, month)
      ownMonthly.push({ budget, actual, config })
    }

    const hasOwnBudget = ownMonthly.some(m => m.budget > 0)

    const childrenMonthlyBudget = Array.from({ length: 12 }, (_, m) =>
      childTree.reduce((sum, ct) => sum + ct.data.monthly[m].budget, 0)
    )
    const childrenMonthlyActual = Array.from({ length: 12 }, (_, m) =>
      childTree.reduce((sum, ct) => sum + ct.data.monthly[m].actual, 0)
    )

    const monthly: MonthlyCell[] = Array.from({ length: 12 }, (_, m) => {
      const budget = hasOwnBudget ? ownMonthly[m].budget : childrenMonthlyBudget[m]
      const actual = ownMonthly[m].actual + childrenMonthlyActual[m]
      const percentage = budget > 0 ? actual / budget : 0
      return { budget, actual, percentage, cycleType: ownMonthly[m].config?.cycleType || null }
    })

    const yearBudget = monthly.reduce((sum, m) => sum + m.budget, 0)
    const yearActual = monthly.reduce((sum, m) => sum + m.actual, 0)
    const yearPercentage = yearBudget > 0 ? yearActual / yearBudget : 0
    const childrenBudgetSum = childrenMonthlyBudget.reduce((a, b) => a + b, 0)

    const janConfig = resolveBudget(node.id, year, 1)
    const cycleType = janConfig?.cycleType || null

    const data: TableRow = {
      node, level, yearBudget, yearActual, yearPercentage,
      monthly, hasOwnBudget, childrenBudgetSum, cycleType
    }

    return { data, children: childTree }
  })
}

function flattenVisible(treeRows: TreeRow[], expandedIds: Set<string>): TableRow[] {
  const result: TableRow[] = []
  for (const tr of treeRows) {
    result.push(tr.data)
    if (expandedIds.has(tr.data.node.id) && tr.children.length > 0) {
      result.push(...flattenVisible(tr.children, expandedIds))
    }
  }
  return result
}

const treeData = computed(() => calcTree(expenseTree.value, currentYear.value))
const visibleRows = computed(() => flattenVisible(treeData.value, expandedIds.value))

function getCellBg(percentage: number, hasBudget: boolean): string {
  if (!hasBudget) return 'transparent'
  if (percentage > 1) return 'rgba(255, 59, 48, 0.15)'
  const alpha = Math.min(percentage, 1) * 0.35
  return `rgba(52, 199, 89, ${alpha})`
}

function onCellClick(categoryId: string, month: number) {
  emit('edit-cell', categoryId, currentYear.value, month, selectedNoteId.value)
}
</script>

<style scoped>
.budget-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.header-left {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  min-width: 140px;
  max-width: 200px;
}

.year-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 10px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.92);
}

.year-label {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  min-width: 64px;
  text-align: center;
}

.table-wrapper {
  flex: 1;
  overflow: auto;
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
}

.budget-table {
  display: flex;
  flex-direction: column;
  min-width: max-content;
}

.table-header,
.table-row {
  display: flex;
  align-items: stretch;
  min-height: 48px;
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(248, 248, 248, 0.9);
  backdrop-filter: blur(8px);
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.table-row {
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.06);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
}

.table-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.col-category {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  left: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-right: 0.5px solid rgba(60, 60, 67, 0.08);
  z-index: 1;
}

.col-year-budget {
  width: 90px;
  flex-shrink: 0;
  position: sticky;
  left: 200px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-right: 0.5px solid rgba(60, 60, 67, 0.08);
  z-index: 1;
  font-weight: 500;
}

.col-month-header,
.col-month {
  flex: 1;
  min-width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  text-align: center;
}

.col-month-header.current,
.col-month.current {
  background: rgba(0, 122, 255, 0.04);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.15);
}

.col-month-yearly {
  flex: 12;
  min-width: 864px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  text-align: center;
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
  flex-shrink: 0;
}

.expand-btn:hover {
  background: rgba(60, 60, 67, 0.08);
}

.expand-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.category-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.budget-num {
  font-weight: 500;
}

.sub-sum {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
}

.cell {
  position: relative;
  cursor: pointer;
  transition: background-color 0.15s;
  border-radius: 4px;
  margin: 2px;
}

.cell:hover {
  filter: brightness(0.95);
}

.cell-percentage-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.7);
  color: rgba(52, 199, 89, 0.9);
}

.cell-percentage-badge.over {
  color: rgb(255, 59, 48);
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 100%;
}

.cell-budget {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

.cell-divider {
  width: 60%;
  border-top: 1px dashed rgba(0, 0, 0, 0.12);
}

.cell-actual {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.6);
}

.cell-actual.over {
  color: rgb(255, 59, 48);
  font-weight: 600;
}

.empty-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: rgba(60, 60, 67, 0.4);
  font-size: 14px;
}
</style>
