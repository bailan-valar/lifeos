<template>
  <div class="budget-dashboard">
    <div v-if="rows.length === 0" class="empty">
      <Icon name="solar:chart-2-linear" size="32" />
      <span>暂无预算数据，请先设置预算</span>
    </div>

    <div v-else class="dashboard-table">
      <div class="table-header">
        <div class="col-category">分类</div>
        <div class="col-budget">预算</div>
        <div class="col-actual">实际</div>
        <div class="col-percentage">执行率</div>
      </div>
      <div
        v-for="row in rows"
        :key="row.category.id"
        class="table-row"
        :class="{ over: row.percentage > 100 }"
      >
        <div class="col-category">{{ row.category.name }}</div>
        <div class="col-budget">{{ row.budgetAmount > 0 ? row.budgetAmount.toFixed(2) : '-' }}</div>
        <div class="col-actual">{{ row.actualAmount.toFixed(2) }}</div>
        <div class="col-percentage">
          {{ row.budgetAmount > 0 ? row.percentage.toFixed(0) + '%' : '-' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, BudgetEntry, BillCategory } from '~/types/bill'

const props = defineProps<{
  bills: Bill[]
  budgets: BudgetEntry[]
  categories: BillCategory[]
  year: number
  month: number
}>()

const monthPrefix = computed(() =>
  `${props.year}-${String(props.month).padStart(2, '0')}`
)

function getBudgetAmount(categoryId: string, year: number, month: number): number {
  const monthly = props.budgets.find(b =>
    b.categoryId === categoryId && b.period === 'monthly' && b.year === year && b.month === month
  )
  if (monthly) return monthly.amount

  const yearly = props.budgets.find(b =>
    b.categoryId === categoryId && b.period === 'yearly' && b.year === year
  )
  if (yearly) return yearly.amount / 12

  return 0
}

const rows = computed(() => {
  const expenseCats = props.categories.filter(c => c.type === 'expense')
  const monthBills = props.bills.filter(b =>
    b.type === 'expense' && b.date.slice(0, 7) === monthPrefix.value
  )

  return expenseCats
    .map(cat => {
      const budgetAmount = getBudgetAmount(cat.id, props.year, props.month)
      const actualAmount = monthBills
        .filter(b => b.categoryId === cat.id)
        .reduce((sum, b) => sum + b.amount, 0)
      const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0
      return { category: cat, budgetAmount, actualAmount, percentage }
    })
    .filter(row => row.budgetAmount > 0 || row.actualAmount > 0)
})
</script>

<style scoped>
.budget-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
.dashboard-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 100px 100px 80px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
}
.table-header {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.table-row {
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
}
.table-row.over {
  color: rgb(255, 59, 48);
}
.col-category {
  font-weight: 500;
}
.col-budget,
.col-actual,
.col-percentage {
  text-align: right;
}
</style>
