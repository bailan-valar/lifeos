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
          <Icon :name="SOLAR_ICONS.nav.back" size="16" />
        </button>
        <span class="year-label">{{ currentYear }}年</span>
        <button class="nav-btn" @click="currentYear++">
          <Icon :name="SOLAR_ICONS.nav.forward" size="16" />
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="budget-table">
        <div class="table-header">
          <div class="col-note">项目</div>
          <div class="col-year-budget">年预算/实际</div>
          <div
            v-for="m in 12"
            :key="m"
            class="col-month-header"
            :class="{ current: m === currentMonth && currentYear === thisYear }"
          >
            {{ m }}月
          </div>
          <div class="col-year-income">年结余/收入</div>
        </div>

        <!-- 固定顶部合计行 -->
        <div v-if="totalsRow" class="table-footer">
          <div class="col-note">
            <span class="total-label">合计</span>
          </div>
          <div class="col-year-budget">
            <div class="year-budget-cell">
              <div v-if="totalsRow.yearBudget > 0 || totalsRow.yearActual > 0" class="cell-content">
                <div class="cell-budget">{{ totalsRow.yearBudget.toFixed(0) }}</div>
                <div class="cell-divider"></div>
                <div class="cell-actual" :class="{ over: totalsRow.yearPercentage > 1 }">
                  {{ totalsRow.yearActual.toFixed(0) }}
                </div>
              </div>
              <div
                v-if="totalsRow.yearBudget > 0"
                class="cell-percentage-badge"
                :class="{ over: totalsRow.yearPercentage > 1 }"
              >
                {{ (totalsRow.yearPercentage * 100).toFixed(0) }}%
              </div>
            </div>
          </div>
          <div
            v-for="(cell, idx) in totalsRow.monthly"
            :key="idx"
            class="col-month cell"
            :class="{ current: idx + 1 === currentMonth && currentYear === thisYear }"
            :style="{ backgroundColor: getCellBg(cell.percentage, cell.budget > 0) }"
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
          <div class="col-year-income">
            <div class="year-income-cell">
              <div v-if="totalsRow.yearIncome > 0 || totalsRow.yearBalance !== 0" class="cell-content">
                <div class="cell-balance" :class="{ negative: totalsRow.yearBalance < 0 }">
                  {{ totalsRow.yearBalance.toFixed(0) }}
                </div>
                <div class="cell-divider"></div>
                <div class="cell-income">
                  {{ totalsRow.yearIncome.toFixed(0) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="visibleRows.length === 0" class="empty-row">
          <span>暂无笔记数据</span>
        </div>

        <template v-for="row in visibleRows" :key="row.node.id">
          <div class="table-row" :class="{ 'yearly-row': row.cycleType === 'yearly', 'unlinked-row': row.isUnlinked }">
            <div
              class="col-note"
              :style="{ paddingLeft: `${row.isUnlinked ? 8 : row.level * 16 + 8}px` }"
              @contextmenu.prevent="onNoteContextMenu($event, row.node)"
            >
              <template v-if="!row.isUnlinked">
                <button
                  v-if="row.node.children.length > 0"
                  class="expand-btn"
                  @click.stop="toggleExpand(row.node.id)"
                >
                  <Icon
                    :name="expandedIds.has(row.node.id) ? SOLAR_ICONS.nav.down : SOLAR_ICONS.nav.right"
                    size="14"
                  />
                </button>
                <span v-else class="expand-placeholder"></span>
              </template>
              <span class="note-name" :class="{ 'unlinked-name': row.isUnlinked }" @click.stop="onNoteClick(row.node.id)">{{ row.node.title }}</span>
            </div>
            <div class="col-year-budget">
              <div v-if="row.hasOwnBudget" class="year-budget-cell">
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
              <div v-else class="year-budget-cell year-budget-cell-no-budget">
                <div class="cell-content">
                  <div class="cell-sub-sum">子: {{ row.childrenBudgetSum.toFixed(0) }}</div>
                  <div class="cell-divider"></div>
                  <div class="cell-actual">{{ row.yearActual.toFixed(0) }}</div>
                </div>
              </div>
            </div>
            <template v-if="row.cycleType === 'yearly'">
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
            </template>
            <template v-else>
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
            </template>
            <div class="col-year-income">
              <div v-if="row.yearIncome > 0 || row.yearBalance !== 0" class="year-income-cell">
                <div class="cell-content">
                  <div class="cell-balance" :class="{ negative: row.yearBalance < 0 }">
                    {{ row.yearBalance.toFixed(0) }}
                  </div>
                  <div class="cell-divider"></div>
                  <div class="cell-income">
                    {{ row.yearIncome.toFixed(0) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BudgetCycleType, NoteTreeNode } from '~/types/block'
import { div } from '~/utils/decimal'
import { SOLAR_ICONS } from '~/composables/useIcons'
import NotePicker from './NotePicker.vue'

const props = defineProps<{ year?: number }>()

const emit = defineEmits<{
  (e: 'edit-cell', payload: { noteId: string; year: number; month: number }): void
  (e: 'note-contextmenu', payload: { node: NoteTreeNode; x: number; y: number }): void
  (e: 'note-click', payload: { noteId: string; year: number; month: number }): void
}>()

const { loadBills } = useBills()
const { loadBudgets, resolveBudget, getMonthlyEquivalent } = useBudgets()
const { loadNotes, noteOptions, noteTree, getDescendantNoteIds } = useNotes()

const thisYear = new Date().getFullYear()
const currentYear = ref(props.year ?? thisYear)
const currentMonth = new Date().getMonth() + 1
const expandedIds = ref<Set<string>>(new Set())
const selectedNoteId = ref('')
const scopedBills = ref<Bill[]>([])

function onNoteContextMenu(event: MouseEvent, node: NoteTreeNode) {
  emit('note-contextmenu', { node, x: event.clientX, y: event.clientY })
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
  await Promise.all([loadNotes()])
  await refreshData()
})

watch(selectedNoteId, async () => {
  await refreshData()
})

watch(
  noteTree,
  (tree) => {
    if (expandedIds.value.size > 0 || tree.length === 0) return
    try {
      const saved = localStorage.getItem('lifeos:project-budget-dashboard:expanded')
      if (saved) {
        expandedIds.value = new Set(JSON.parse(saved))
        return
      }
    } catch { /* ignore */ }
    // 默认折叠所有节点
    expandedIds.value = new Set()
  },
  { immediate: true }
)

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
  try {
    localStorage.setItem('lifeos:project-budget-dashboard:expanded', JSON.stringify([...next]))
  } catch { /* ignore */ }
}

function getDirectActual(noteId: string, year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // 1. 统计该笔记的支出账单（排除有子账单的父账单）
  const expenses = scopedBills.value
    .filter(b => {
      // 只统计叶子节点账单（排除有子账单的父账单）
      if (b.hasChildren) return false
      // 只统计支出类型
      if (b.type !== 'expense') return false
      // 笔记匹配
      if (b.noteId !== noteId) return false

      // 如果有分摊月份，按分摊月份统计；否则按账单日期统计
      if (b.allocatedMonth) {
        return b.allocatedMonth === prefix
      }
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // 2. 统计该笔记的退款账单（需要从支出中扣除）
  const refunds = scopedBills.value
    .filter(b => {
      // 退款账单类型为收入
      if (b.type !== 'income') return false
      // 必须是退款标记
      if (!b.isRefund) return false
      // 笔记匹配（退款账单使用原账单的笔记）
      if (b.noteId !== noteId) return false

      // 按账单日期统计
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // 3. 实际支出 = 支出 - 退款
  return expenses - refunds
}

function getDirectIncome(noteId: string, year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // 统计该笔记的收入账单（排除退款）
  const income = scopedBills.value
    .filter(b => {
      // 只统计叶子节点账单
      if (b.hasChildren) return false
      // 只统计收入类型
      if (b.type !== 'income') return false
      // 排除退款（退款不算作正常收入）
      if (b.isRefund) return false
      // 笔记匹配
      if (b.noteId !== noteId) return false
      // 按账单日期统计
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  return income
}

// 获取无关联账单的实际支出
function getUnlinkedActual(year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // 1. 统计无关联的支出账单
  const expenses = scopedBills.value
    .filter(b => {
      // 只统计叶子节点账单
      if (b.hasChildren) return false
      // 只统计支出类型
      if (b.type !== 'expense') return false
      // 无关联：noteId 为空字符串
      if (b.noteId !== '') return false

      // 如果有分摊月份，按分摊月份统计；否则按账单日期统计
      if (b.allocatedMonth) {
        return b.allocatedMonth === prefix
      }
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // 2. 统计无关联的退款账单
  const refunds = scopedBills.value
    .filter(b => {
      // 退款账单类型为收入
      if (b.type !== 'income') return false
      // 必须是退款标记
      if (!b.isRefund) return false
      // 无关联：noteId 为空字符串
      if (b.noteId !== '') return false

      // 按账单日期统计
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  // 3. 实际支出 = 支出 - 退款
  return expenses - refunds
}

// 获取无关联账单的收入
function getUnlinkedIncome(year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // 统计无关联的收入账单（排除退款）
  const income = scopedBills.value
    .filter(b => {
      // 只统计叶子节点账单
      if (b.hasChildren) return false
      // 只统计收入类型
      if (b.type !== 'income') return false
      // 排除退款
      if (b.isRefund) return false
      // 无关联：noteId 为空字符串
      if (b.noteId !== '') return false
      // 按账单日期统计
      return b.date.startsWith(prefix)
    })
    .reduce((sum, b) => sum + b.amount, 0)

  return income
}

// 创建"无关联"行
function createUnlinkedRow(year: number): TableRow {
  const NONE_ID = '__none__'
  const ownMonthly: { budget: number; actual: number; income: number; config: ReturnType<typeof resolveBudget> }[] = []

  for (let month = 1; month <= 12; month++) {
    const config = resolveBudget(`note:${NONE_ID}`, year, month, selectedNoteId.value)
    const budget = config ? getMonthlyEquivalent(`note:${NONE_ID}`, year, month, selectedNoteId.value) : 0
    const actual = getUnlinkedActual(year, month)
    const income = getUnlinkedIncome(year, month)
    ownMonthly.push({ budget, actual, income, config })
  }

  const hasOwnBudget = ownMonthly.some(m => m.budget > 0)
  const yearActual = ownMonthly.reduce((sum, m) => sum + m.actual, 0)
  const yearBudget = ownMonthly.reduce((sum, m) => sum + m.budget, 0)
  const yearIncome = ownMonthly.reduce((sum, m) => sum + m.income, 0)
  const yearBalance = yearIncome - yearActual
  const yearPercentage = yearBudget > 0 ? yearActual / yearBudget : 0

  const janConfig = resolveBudget(`note:${NONE_ID}`, year, 1, selectedNoteId.value)
  const cycleType = janConfig?.cycleType || null

  const monthly: MonthlyCell[] = Array.from({ length: 12 }, (_, m) => {
    const income = ownMonthly[m].income
    const actual = ownMonthly[m].actual
    return {
      budget: ownMonthly[m].budget,
      actual,
      income,
      balance: income - actual,
      percentage: ownMonthly[m].budget > 0 ? actual / ownMonthly[m].budget : 0,
      cycleType: ownMonthly[m].config?.cycleType || null
    }
  })

  const unlinkedNode: UnlinkedNode = {
    id: NONE_ID,
    title: '无关联',
    children: [],
    isUnlinked: true
  }

  return {
    node: unlinkedNode,
    level: 0,
    yearBudget,
    yearActual,
    yearPercentage,
    monthly,
    hasOwnBudget,
    childrenBudgetSum: 0,
    cycleType,
    isUnlinked: true,
    yearIncome,
    yearBalance
  }
}

interface MonthlyCell {
  budget: number
  actual: number
  percentage: number
  cycleType: BudgetCycleType | null
  income: number
  balance: number
}

interface TableRow {
  node: NoteTreeNode | UnlinkedNode
  level: number
  yearBudget: number
  yearActual: number
  yearPercentage: number
  monthly: MonthlyCell[]
  hasOwnBudget: boolean
  childrenBudgetSum: number
  cycleType: BudgetCycleType | null
  isUnlinked?: boolean
  yearIncome: number
  yearBalance: number
}

interface UnlinkedNode {
  id: string
  title: string
  children: UnlinkedNode[]
  isUnlinked: true
}

interface TreeRow {
  data: TableRow
  children: TreeRow[]
}

/**
 * 子笔记周期类型统计
 */
interface ChildCycleStats {
  hasYearly: boolean      // 是否有年预算子笔记
  hasMonthly: boolean     // 是否有月预算子笔记
  hasMixed: boolean       // 是否混合周期
  dominantType: 'yearly' | 'monthly' | 'mixed' | null  // 主导周期类型
  yearlyCount: number     // 年预算子笔记数量
  monthlyCount: number    // 月预算子笔记数量
}

/**
 * 分析子笔记的周期类型分布
 */
function analyzeChildCycleType(
  childTree: TreeRow[],
  year: number
): ChildCycleStats {
  if (childTree.length === 0) {
    return {
      hasYearly: false,
      hasMonthly: false,
      hasMixed: false,
      dominantType: null,
      yearlyCount: 0,
      monthlyCount: 0
    }
  }

  let hasYearly = false
  let hasMonthly = false
  let yearlyCount = 0
  let monthlyCount = 0

  for (const child of childTree) {
    const childCycleType = child.data.cycleType
    if (childCycleType === 'yearly') {
      hasYearly = true
      yearlyCount++
    } else if (childCycleType === 'monthly') {
      hasMonthly = true
      monthlyCount++
    }

    // 递归检查深层子笔记
    if (child.children.length > 0) {
      const deepStats = analyzeChildCycleType(child.children, year)
      hasYearly = hasYearly || deepStats.hasYearly
      hasMonthly = hasMonthly || deepStats.hasMonthly
      yearlyCount += deepStats.yearlyCount
      monthlyCount += deepStats.monthlyCount
    }
  }

  const hasMixed = hasYearly && hasMonthly
  let dominantType: 'yearly' | 'monthly' | 'mixed' | null = null

  if (hasMixed) {
    dominantType = 'mixed'
  } else if (hasYearly) {
    dominantType = 'yearly'
  } else if (hasMonthly) {
    dominantType = 'monthly'
  }

  return {
    hasYearly,
    hasMonthly,
    hasMixed,
    dominantType,
    yearlyCount,
    monthlyCount
  }
}

/**
 * 智能确定父笔记的周期类型
 */
function determineParentCycleType(
  hasOwnBudget: boolean,
  ownCycleType: BudgetCycleType | null,
  childStats: ChildCycleStats
): BudgetCycleType | null {
  // 1. 父笔记有独立预算，使用自己的类型
  if (hasOwnBudget && ownCycleType) {
    return ownCycleType
  }

  // 2. 父笔记无独立预算，根据子笔记决定
  if (childStats.dominantType) {
    // 混合情况优先显示月预算（更详细）
    if (childStats.dominantType === 'mixed') {
      return 'monthly'
    }
    return childStats.dominantType
  }

  return null
}

function calcTree(nodes: NoteTreeNode[], year: number, level = 0): TreeRow[] {
  return nodes.map(node => {
    const childTree = calcTree(node.children, year, level + 1)

    const ownMonthly: { budget: number; actual: number; income: number; config: ReturnType<typeof resolveBudget> }[] = []
    for (let month = 1; month <= 12; month++) {
      // 项目预算使用 noteId 作为标识
      const config = resolveBudget(`note:${node.id}`, year, month, selectedNoteId.value)
      const budget = config ? getMonthlyEquivalent(`note:${node.id}`, year, month, selectedNoteId.value) : 0
      const actual = getDirectActual(node.id, year, month)
      const income = getDirectIncome(node.id, year, month)
      ownMonthly.push({ budget, actual, income, config })
    }

    const hasOwnBudget = ownMonthly.some(m => m.budget > 0)

    // 计算自己的年度实际支出总和
    const ownYearActual = ownMonthly.reduce((sum, m) => sum + m.actual, 0)

    // 计算自己的年度收入总和
    const ownYearIncome = ownMonthly.reduce((sum, m) => sum + m.income, 0)

    // 判断自己是否为年预算（查看1月的配置）
    const ownConfig = resolveBudget(`note:${node.id}`, year, 1, selectedNoteId.value)
    const isOwnYearly = ownConfig?.cycleType === 'yearly'

    // 计算子笔记的月度预算和实际支出总和（仅包含月预算子笔记）
    // 年预算子笔记在月度显示中忽略，只在年度预算中体现
    const childrenMonthlyBudget = Array.from({ length: 12 }, (_, m) =>
      childTree.reduce((sum, ct) => {
        if (ct.data.cycleType === 'yearly') {
          // 年预算子笔记：在月度预算中忽略
          return sum
        } else {
          // 月预算子笔记：使用原始月预算
          return sum + ct.data.monthly[m].budget
        }
      }, 0)
    )

    // 计算子笔记的月度实际支出（仅包含月预算子笔记）
    const childrenMonthlyActual = Array.from({ length: 12 }, (_, m) =>
      childTree.reduce((sum, ct) => {
        if (ct.data.cycleType === 'yearly') {
          // 年预算子笔记：在月度实际支出中忽略
          return sum
        } else {
          // 月预算子笔记：使用原始实际支出
          return sum + ct.data.monthly[m].actual
        }
      }, 0)
    )

    // 计算子笔记的月度收入（仅包含月预算子笔记）
    const childrenMonthlyIncome = Array.from({ length: 12 }, (_, m) =>
      childTree.reduce((sum, ct) => {
        if (ct.data.cycleType === 'yearly') {
          // 年预算子笔记：在月度收入中忽略
          return sum
        } else {
          // 月预算子笔记：使用原始收入
          return sum + ct.data.monthly[m].income
        }
      }, 0)
    )

    // 计算当前节点在父笔记中显示的月实际值
    // 如果是年预算，使用月等效实际（年度总和/12）；如果是月预算，使用原始月实际
    const ownMonthlyForParent = isOwnYearly && hasOwnBudget
      ? Array.from({ length: 12 }, () => div(ownYearActual, 12))
      : ownMonthly.map(m => m.actual)

    // 计算当前节点在父笔记中显示的月收入值
    const ownIncomeForParent = isOwnYearly && hasOwnBudget
      ? Array.from({ length: 12 }, () => div(ownYearIncome, 12))
      : ownMonthly.map(m => m.income)

    const monthly: MonthlyCell[] = Array.from({ length: 12 }, (_, m) => {
      const budget = hasOwnBudget ? ownMonthly[m].budget : childrenMonthlyBudget[m]
      // ownMonthlyForParent[m] 已经处理过年预算的分摊逻辑
      const actual = ownMonthlyForParent[m] + childrenMonthlyActual[m]
      const income = ownIncomeForParent[m] + childrenMonthlyIncome[m]
      const percentage = budget > 0 ? actual / budget : 0
      return {
        budget,
        actual,
        income,
        balance: income - actual,
        percentage,
        cycleType: ownMonthly[m].config?.cycleType || null
      }
    })

    // 计算年度预算：如果有自己的预算，使用自己的；否则累加子笔记的年度预算
    const yearBudget = hasOwnBudget
      ? monthly.reduce((sum, m) => sum + m.budget, 0)
      : childTree.reduce((sum, ct) => {
          // 累加子笔记的年度预算：年预算子笔记用年度总预算，月预算子笔记用月预算×12
          if (ct.data.cycleType === 'yearly') {
            return sum + ct.data.yearBudget
          } else {
            return sum + ct.data.monthly.reduce((s, m) => s + m.budget, 0)
          }
        }, 0)

    // 计算年度实际支出（包含所有子笔记，包括年预算子笔记）
    const yearActual = ownYearActual + childTree.reduce((sum, ct) => sum + ct.data.yearActual, 0)

    // 计算年度收入（包含所有子笔记，包括年预算子笔记）
    const yearIncome = ownYearIncome + childTree.reduce((sum, ct) => sum + ct.data.yearIncome, 0)

    // 计算年度结余
    const yearBalance = yearIncome - yearActual

    const yearPercentage = yearBudget > 0 ? yearActual / yearBudget : 0

    // 计算子笔记预算总和（用于显示"子: xxx"）
    const childrenBudgetSum = childTree.reduce((sum, ct) => {
      // 对于年预算子笔记，使用年度总预算；对于月预算子笔记，使用年度总和
      if (ct.data.cycleType === 'yearly') {
        return sum + ct.data.yearBudget
      } else {
        return sum + ct.data.monthly.reduce((s, m) => s + m.budget, 0)
      }
    }, 0)

    // 智能确定周期类型：分析子笔记分布，决定父笔记显示模式
    const janConfig = resolveBudget(`note:${node.id}`, year, 1, selectedNoteId.value)
    const ownCycleType = janConfig?.cycleType || null
    const childCycleStats = analyzeChildCycleType(childTree, year)
    const cycleType = determineParentCycleType(hasOwnBudget, ownCycleType, childCycleStats)

    const data: TableRow = {
      node,
      level,
      yearBudget,
      yearActual,
      yearPercentage,
      monthly,
      hasOwnBudget,
      childrenBudgetSum,
      cycleType,
      yearIncome,
      yearBalance
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

const treeData = computed(() => calcTree(noteTree.value, currentYear.value))
const visibleRows = computed(() => {
  const unlinkedRow = createUnlinkedRow(currentYear.value)
  const noteRows = flattenVisible(treeData.value, expandedIds.value)
  return [unlinkedRow, ...noteRows]
})

// 计算合计行
const totalsRow = computed(() => {
  if (visibleRows.value.length === 0) return null

  const yearBudget = visibleRows.value.reduce((sum, row) => sum + row.yearBudget, 0)
  const yearActual = visibleRows.value.reduce((sum, row) => sum + row.yearActual, 0)
  const yearIncome = visibleRows.value.reduce((sum, row) => sum + row.yearIncome, 0)
  const yearBalance = yearIncome - yearActual
  const yearPercentage = yearBudget > 0 ? yearActual / yearBudget : 0

  const monthly = Array.from({ length: 12 }, (_, m) => {
    const budget = visibleRows.value.reduce((sum, row) => sum + row.monthly[m].budget, 0)
    const actual = visibleRows.value.reduce((sum, row) => sum + row.monthly[m].actual, 0)
    const income = visibleRows.value.reduce((sum, row) => sum + row.monthly[m].income, 0)
    const percentage = budget > 0 ? actual / budget : 0
    return {
      budget,
      actual,
      income,
      balance: income - actual,
      percentage,
      cycleType: null as BudgetCycleType | null
    }
  })

  return { yearBudget, yearActual, yearPercentage, monthly, yearIncome, yearBalance }
})

function getCellBg(percentage: number, hasBudget: boolean): string {
  if (!hasBudget) return 'transparent'
  if (percentage > 1) return 'rgba(255, 59, 48, 0.15)'
  const alpha = Math.min(percentage, 1) * 0.35
  return `rgba(52, 199, 89, ${alpha})`
}

function onCellClick(noteId: string, month: number) {
  console.log('[ProjectBudgetDashboard] onCellClick 被调用:', { noteId, month, year: currentYear.value })
  emit('edit-cell', {
    noteId,
    year: currentYear.value,
    month
  })
}

function onNoteClick(noteId: string) {
  emit('note-click', {
    noteId,
    year: currentYear.value,
    month: new Date().getMonth() + 1
  })
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
  position: relative;
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
  position: relative;
}

.table-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.table-row:last-child {
  border-bottom: none;
}

.col-note {
  width: 160px;
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
  width: 82px;
  flex-shrink: 0;
  position: sticky;
  left: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
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

.note-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.15s ease;
}

.note-name:hover {
  color: rgb(0, 122, 255);
}

.note-name.unlinked-name {
  color: rgba(60, 60, 67, 0.6);
  font-style: italic;
}

.note-name.unlinked-name:hover {
  color: rgba(60, 60, 67, 0.85);
}

.unlinked-row {
  background: rgba(60, 60, 67, 0.02);
}

.budget-num {
  font-weight: 500;
}

.year-budget-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 2px;
  border-radius: 4px;
}

.year-budget-cell .cell-percentage-badge {
  top: 1px;
  right: 1px;
}

.sub-sum {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
  text-align: center;
}

.cell-sub-sum {
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.55);
}

.year-budget-cell-no-budget {
  justify-content: center;
}

.cell {
  position: relative;
  cursor: pointer;
  transition: background-color 0.15s;
  border-radius: 4px;
  margin: 2px 2px 2px 0;
  height: calc(100% - 4px);
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

.table-footer {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: stretch;
  min-height: 52px;
  background: rgba(248, 248, 248, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(60, 60, 67, 0.15);
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  z-index: 1;
}

.table-footer .col-note {
  background: rgba(248, 248, 248, 0.95);
}

.table-footer .col-year-budget {
  background: rgba(248, 248, 248, 0.95);
}

.total-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

/* 年结余/收入列 */
.col-year-income {
  width: 82px;
  flex-shrink: 0;
  position: sticky;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.95);
  border-left: 0.5px solid rgba(60, 60, 67, 0.08);
  z-index: 1;
  font-weight: 500;
}

.table-footer .col-year-income {
  background: rgba(248, 248, 248, 0.95);
}

.year-income-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 2px;
  border-radius: 4px;
}

.cell-balance {
  font-size: 12px;
  font-weight: 500;
  color: rgba(52, 199, 89, 0.9);
}

.cell-balance.negative {
  color: rgb(255, 59, 48);
}

.cell-income {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.6);
}
</style>
