<template>
  <div class="month-view">
    <!-- 月度统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card income">
        <div class="stat-icon">
          <Icon name="solar:graph-up-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">月度收入</span>
          <span class="stat-value">{{ stats.income.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card expense">
        <div class="stat-icon">
          <Icon name="solar:graph-down-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">月度支出</span>
          <span class="stat-value">{{ stats.expense.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card net">
        <div class="stat-icon">
          <Icon name="solar:wallet-money-linear" size="20" />
        </div>
        <div class="stat-info">
          <span class="stat-label">月度结余</span>
          <span class="stat-value">{{ stats.net.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- 月度预算执行 -->
    <div class="budget-section">
      <div class="section-title">月度预算执行情况</div>
      <div v-if="budgetRows.length === 0" class="empty-budget">
        <Icon name="solar:clipboard-list-linear" size="32" />
        <span>暂无预算数据</span>
      </div>
      <div v-else class="budget-list">
        <div
          v-for="row in budgetRows"
          :key="row.categoryId"
          class="budget-row"
        >
          <div class="budget-row-header">
            <span class="budget-name">{{ row.name }}</span>
            <span class="budget-num">
              {{ row.actual.toFixed(0) }} / {{ row.budget.toFixed(0) }}
            </span>
          </div>
          <div class="budget-progress-bg">
            <div
              class="budget-progress-bar"
              :class="{ over: row.percentage > 1 }"
              :style="{ width: `${Math.min(row.percentage * 100, 100)}%` }"
            />
          </div>
          <span class="budget-percentage">{{ (row.percentage * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, CategoryTreeNode } from '~/types/bill'
import { add, div } from '~/utils/decimal'

const props = defineProps<{
  year: number
  month: number
}>()

const { loadBillStats } = useBills()
const { loadBudgets, getMonthlyEquivalent } = useBudgets()
const { loadCategories, buildTree } = useBillCategories()

const stats = ref({ income: 0, expense: 0, transfer: 0, net: 0 })
const budgetRows = ref<Array<{
  categoryId: string
  name: string
  budget: number
  actual: number
  percentage: number
}>>([])

async function refresh() {
  const lastDay = new Date(props.year, props.month, 0).getDate()
  const start = `${props.year}-${String(props.month).padStart(2, '0')}-01`
  const end = `${props.year}-${String(props.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  stats.value = await loadBillStats(undefined, start, end)
  await loadBudgets()
  await loadCategories()

  // 加载月度支出账单
  const db = await import('~/services/db').then(m => m.getDB())
  const result = await db.bills.find({
    selector: {
      type: 'expense',
      status: 'completed',
      date: { $gte: start, $lte: end }
    }
  }).exec()
  const bills = result.map((doc: any) => doc.toJSON() as Bill)

  const byCategory = new Map<string, number>()
  for (const b of bills) {
    byCategory.set(b.categoryId, add(byCategory.get(b.categoryId) || 0, b.amount))
  }

  function calcActual(node: CategoryTreeNode): number {
    let s = byCategory.get(node.id) || 0
    for (const child of node.children) {
      s = add(s, calcActual(child))
    }
    return s
  }

  const tree = buildTree('expense')
  const rows: typeof budgetRows.value = []

  for (const node of tree) {
    const budget = getMonthlyEquivalent(node.id, props.year, props.month)
    const actual = calcActual(node)
    if (budget > 0 || actual > 0) {
      rows.push({
        categoryId: node.id,
        name: node.name,
        budget,
        actual,
        percentage: budget > 0 ? div(actual, budget) : 0
      })
    }
  }

  budgetRows.value = rows
}

onMounted(async () => {
  await refresh()
})

watch(() => [props.year, props.month], async () => {
  await refresh()
})
</script>

<style scoped>
.month-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  transition: background-color 0.15s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.75);
}

.stat-card.income .stat-icon {
  color: rgb(52, 199, 89);
  background: rgba(52, 199, 89, 0.12);
}

.stat-card.expense .stat-icon {
  color: rgb(255, 59, 48);
  background: rgba(255, 59, 48, 0.12);
}

.stat-card.net .stat-icon {
  color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.12);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.budget-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.empty-budget {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: rgba(60, 60, 67, 0.4);
  font-size: 14px;
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 10px;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.budget-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  cursor: default;
  transition: background-color 0.15s ease;
}

.budget-row:hover {
  background: rgba(255, 255, 255, 0.75);
}

.budget-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.budget-num {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
}

.budget-progress-bg {
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.budget-progress-bar {
  height: 100%;
  border-radius: 3px;
  background: rgb(52, 199, 89);
  transition: width 0.3s ease;
}

.budget-progress-bar.over {
  background: rgb(255, 59, 48);
}

.budget-percentage {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.45);
  align-self: flex-end;
}
</style>
