<template>
  <div class="tab-panel">
    <div class="panel-header bills-header">
      <!-- 第一行：视图切换 | 日期 -->
      <div class="header-row row-1">
        <div class="view-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'card' }"
            @click="$emit('view-mode-change', 'card')"
          >
            <Icon name="solar:widget-2-linear" size="16" />
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'table' }"
            @click="$emit('view-mode-change', 'table')"
          >
            <Icon name="solar:clipboard-list-linear" size="16" />
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: viewMode === 'calendar' }"
            @click="$emit('view-mode-change', 'calendar')"
          >
            <Icon name="solar:calendar-linear" size="16" />
          </button>
        </div>

        <div class="date-filter">
          <select :value="billYearFilter" class="filter-select" @change="$emit('year-change', $event.target.value ? Number($event.target.value) : null)">
            <option :value="null">全部年份</option>
            <option v-for="y in billYearOptions" :key="y" :value="y">{{ y }}年</option>
          </select>
          <select :value="billMonthFilter" class="filter-select" @change="$emit('month-change', $event.target.value ? Number($event.target.value) : null)">
            <option :value="null">全部月份</option>
            <option v-for="m in billMonthOptions" :key="m" :value="m">{{ m }}月</option>
          </select>
        </div>
      </div>

      <!-- 第二行：统计 / 批量工具栏 -->
      <div v-if="!batchMode" class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">收入</span>
          <span class="stat-value positive">+{{ totalIncome.toFixed(2) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">支出</span>
          <span class="stat-value negative">-{{ totalExpense.toFixed(2) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">结余</span>
          <span class="stat-value" :class="netBalance >= 0 ? 'positive' : 'negative'">
            {{ netBalance >= 0 ? '+' : '' }}{{ netBalance.toFixed(2) }}
          </span>
        </div>
      </div>
      <BillBatchToolbar
        v-else
        :selected-count="selectedIds.length"
        :total-count="bills.length"
        @toggle-select-all="$emit('toggle-select-all', $event)"
        @batch-delete="$emit('batch-delete')"
        @batch-edit="$emit('batch-edit')"
        @exit="$emit('exit-batch-mode')"
      />

      <!-- 第三行：预算执行进度条 -->
      <div v-if="!batchMode && budgetProgress.hasBudget" class="budget-progress">
        <div class="budget-progress-header">
          <span class="budget-progress-label">预算执行</span>
          <span class="budget-progress-value" :class="{ over: budgetProgress.isOver }">
            {{ budgetProgress.actualExpense.toFixed(0) }} / {{ budgetProgress.totalBudget.toFixed(0) }}
            <template v-if="budgetProgress.isOver">
              (超支 {{ (budgetProgress.rawPercentage * 100 - 100).toFixed(0) }}%)
            </template>
            <template v-else>
              ({{ (budgetProgress.rawPercentage * 100).toFixed(0) }}%)
            </template>
          </span>
        </div>
        <div class="budget-progress-track">
          <div
            class="budget-progress-fill"
            :class="{ over: budgetProgress.isOver }"
            :style="{ width: `${budgetProgress.percentage * 100}%` }"
          />
        </div>
      </div>
    </div>

    <div class="list-container">
      <div v-if="loading && bills.length === 0" class="skeleton-wrap">
        <div v-for="i in 5" :key="i" class="skeleton-row" />
      </div>
      <BillCalendar
        v-else-if="viewMode === 'calendar'"
        :bills="bills"
        :year="billYearFilter ?? undefined"
        :month="billMonthFilter ?? undefined"
        @edit="$emit('edit-bill', $event)"
        @date-change="(year, month) => $emit('calendar-date-change', { year, month })"
      />
      <BillList
        v-else-if="viewMode === 'card'"
        :bills="bills"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="$emit('edit-bill', $event)"
        @delete="$emit('delete-bill', $event)"
        @select="$emit('select-bill', $event)"
        @select-all="$emit('select-all-bills')"
        @unselect-all="$emit('unselect-all-bills')"
      />
      <BillTable
        v-else
        :bills="bills"
        :accounts="accounts"
        :categories="categories"
        :selectable="batchMode"
        :selected-ids="selectedIds"
        @edit="$emit('edit-bill', $event)"
        @delete="$emit('delete-bill', $event)"
        @select="$emit('select-bill', $event)"
        @select-all="$emit('select-all-bills')"
        @unselect-all="$emit('unselect-all-bills')"
      />
    </div>

    <div v-if="hasMore && !isDateFiltered && !batchMode" class="load-more-wrap">
      <button
        type="button"
        class="load-more-btn"
        :disabled="loading"
        @click="$emit('load-more')"
      >
        <span v-if="loading">加载中...</span>
        <span v-else>加载更多</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bill, Account, BillCategory } from '~/types/bill'
import BillBatchToolbar from '../BillBatchToolbar.vue'
import BillCalendar from '../BillCalendar.vue'
import BillList from '../BillList.vue'
import BillTable from '../BillTable.vue'

interface BudgetProgress {
  totalBudget: number
  actualExpense: number
  percentage: number
  rawPercentage: number
  isOver: boolean
  hasBudget: boolean
}

defineProps<{
  bills: Bill[]
  accounts: Account[]
  categories: BillCategory[]
  viewMode: 'card' | 'table' | 'calendar'
  batchMode: boolean
  selectedIds: string[]
  loading: boolean
  hasMore: boolean
  billYearFilter: number | null
  billMonthFilter: number | null
  billYearOptions: number[]
  billMonthOptions: number[]
  totalIncome: number
  totalExpense: number
  netBalance: number
  budgetProgress: BudgetProgress
  isDateFiltered: boolean
  selectedBills: Bill[]
}>()

defineEmits<{
  (e: 'view-mode-change', mode: 'card' | 'table' | 'calendar'): void
  (e: 'year-change', year: number | null): void
  (e: 'month-change', month: number | null): void
  (e: 'toggle-select-all', select: boolean): void
  (e: 'batch-delete'): void
  (e: 'batch-edit'): void
  (e: 'exit-batch-mode'): void
  (e: 'edit-bill', bill: Bill): void
  (e: 'delete-bill', id: string): void
  (e: 'select-bill', id: string): void
  (e: 'select-all-bills'): void
  (e: 'unselect-all-bills'): void
  (e: 'calendar-date-change', data: { year: number; month: number }): void
  (e: 'load-more'): void
}>()
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 账单头部三行布局 */
.panel-header.bills-header {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-row.row-1 {
  justify-content: space-between;
}

.header-row.row-2 {
  justify-content: center;
}

.header-row.row-3 {
  justify-content: center;
}

/* Helper components styles */
.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn.active {
  background: white;
  color: rgba(0, 0, 0, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.date-filter {
  display: flex;
  gap: 6px;
  align-items: center;
}

.filter-select {
  padding: 6px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  cursor: pointer;
}

.stats-bar {
  display: flex;
  gap: 16px;
}

.stat-item {
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
}

.stat-value.positive {
  color: rgb(52, 199, 89);
}

.stat-value.negative {
  color: rgb(255, 59, 48);
}

.budget-progress {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.budget-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.budget-progress-label {
  color: rgba(60, 60, 67, 0.5);
}

.budget-progress-value {
  color: rgba(0, 0, 0, 0.78);
  font-weight: 500;
}

.budget-progress-value.over {
  color: rgb(255, 59, 48);
}

.budget-progress-track {
  height: 6px;
  background: rgba(60, 60, 67, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.budget-progress-fill {
  height: 100%;
  background: rgb(0, 122, 255);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.budget-progress-fill.over {
  background: rgb(255, 59, 48);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.skeleton-row {
  height: 56px;
  background: linear-gradient(90deg, rgba(60, 60, 67, 0.06) 25%, rgba(60, 60, 67, 0.1) 50%, rgba(60, 60, 67, 0.06) 75%);
  background-size: 200% 100%;
  border-radius: 10px;
  animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.load-more-btn {
  padding: 8px 24px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
