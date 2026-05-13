import { ref, computed } from 'vue'

export function useBillingFilters(noteId: string) {
  // 导入类型
  interface BudgetProgress {
    totalBudget: number
    actualExpense: number
    percentage: number
    rawPercentage: number
    isOver: boolean
    hasBudget: boolean
  }

  // 筛选状态
  const billYearFilter = ref<number | null>(null)
  const billMonthFilter = ref<number | null>(null)
  const budgetYear = ref(new Date().getFullYear())
  const budgetMonth = ref(new Date().getMonth() + 1)

  // 筛选选项
  const billYearOptions = computed<number[]>(() => {
    const current = new Date().getFullYear()
    return [current - 2, current - 1, current, current + 1]
  })

  const billMonthOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  // 计算属性
  const isDateFiltered = computed(() => billYearFilter.value !== null || billMonthFilter.value !== null)

  const currentBudgetYear = computed(() => billYearFilter.value ?? new Date().getFullYear())
  const currentBudgetMonth = computed(() => billMonthFilter.value ?? new Date().getMonth() + 1)

  // 预算进度计算（需要外部数据，这里返回计算函数）
  const budgetProgress = computed<BudgetProgress>(() => {
    // 这个computed需要bills和categories数据
    // 实际使用时需要传入这些数据
    return {
      totalBudget: 0,
      actualExpense: 0,
      percentage: 0,
      rawPercentage: 0,
      isOver: false,
      hasBudget: false
    }
  })

  // 获取日期范围
  const getDateRange = () => {
    if (!isDateFiltered.value) return { start: undefined, end: undefined }
    const year = billYearFilter.value ?? new Date().getFullYear()
    const month = billMonthFilter.value ?? null

    if (month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`
      return { start, end }
    }

    const start = `${year}-01-01T00:00:00.000Z`
    const end = `${year + 1}-01-01T00:00:00.000Z`
    return { start, end }
  }

  // 刷新账单（需要外部调用loadBillsByDateRange或loadBillsPaginated）
  const refreshBills = async (
    loadBillsByDateRange: (noteId: string, start?: string, end?: string) => Promise<void>,
    loadBillsPaginated: (noteId: string, page: number) => Promise<void>
  ) => {
    if (isDateFiltered.value) {
      const { start, end } = getDateRange()
      await loadBillsByDateRange(noteId, start, end)
    } else {
      await loadBillsPaginated(noteId, 1)
    }
  }

  // 日历日期变化
  const onCalendarDateChange = (year: number, month: number) => {
    billYearFilter.value = year
    billMonthFilter.value = month
  }

  // 加载更多（需要外部调用）
  const handleLoadMore = async (loadMoreBills: (noteId: string) => Promise<void>) => {
    if (isDateFiltered.value) return
    await loadMoreBills(noteId)
  }

  return {
    // 筛选状态
    billYearFilter,
    billMonthFilter,
    budgetYear,
    budgetMonth,

    // 筛选选项
    billYearOptions,
    billMonthOptions,

    // 计算属性
    isDateFiltered,
    currentBudgetYear,
    currentBudgetMonth,
    budgetProgress,

    // 操作
    getDateRange,
    refreshBills,
    onCalendarDateChange,
    handleLoadMore
  }
}
