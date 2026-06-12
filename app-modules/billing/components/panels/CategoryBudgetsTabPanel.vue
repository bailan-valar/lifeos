<template>
  <div class="tab-panel">
    <BudgetDashboard
      :year="budgetYear"
      @edit-cell="openMonthBillsDrawer"
      @category-contextmenu="openCategoryContextMenu"
      @category-click="onCategoryClick"
      @year-actual-click="onYearActualClick"
    />
  </div>
  <BudgetDialog
    ref="budgetDialogRef"
    v-if="budgetDialogVisible"
    :visible="budgetDialogVisible"
    :budget="editingBudget"
    :categories="categories"
    :note-options="noteOptions"
    :default-year="budgetYear"
    :default-month="new Date().getMonth() + 1"
    :default-note-id="currentNoteId"
    @confirm="handleBudgetConfirm"
    @cancel="closeBudgetDialog"
    @show-history="openBudgetHistory"
  />
  <BudgetHistory
    v-if="budgetHistoryVisible"
    :visible="budgetHistoryVisible"
    :category-id="historyDialogData.categoryId"
    :category-name="historyDialogData.categoryName"
    :note-id="historyDialogData.noteId"
    :note-options="noteOptions"
    :current-budget-id="historyDialogData.currentBudgetId"
    :history-entries="historyDialogData.historyEntries"
    @cancel="closeBudgetHistory"
  />
  <CategoryMonthBillsDrawer
    v-model:visible="billsDrawerVisible"
    :category-id="billsDrawerData.categoryId"
    :category-name="billsDrawerData.categoryName"
    :year="billsDrawerData.year"
    :month="billsDrawerData.month"
    :note-id="billsDrawerData.noteId"
  />
  <CategoryDialog
    v-if="categoryDialogVisible"
    :visible="categoryDialogVisible"
    :category="editingCategory || undefined"
    :categories="categories"
    :default-type="categoryDialogDefaults.type"
    :default-parent-id="categoryDialogDefaults.defaultParentId"
    :default-name="categoryDialogDefaults.defaultName"
    @confirm="handleCategoryDialogConfirm"
    @cancel="closeCategoryDialog"
  />
  <CategoryContextMenu
    :visible="categoryMenu.visible"
    :x="categoryMenu.x"
    :y="categoryMenu.y"
    :node="categoryMenu.node"
    @add-child="onMenuAddChild"
    @edit="onMenuEdit"
    @detail="onMenuDetail"
    @delete="onMenuDelete"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useBudgets } from '~/composables/useBudgets'
import { useToast } from '~/composables/useToast'
import type { BudgetFormData, BudgetEntry, BillCategory } from '~/types/bill'
import { useBillingStore } from '~/stores/billing'
import { useBillingCategoryMenu, type CategoryMenuState } from '../../composables/useBillingCategoryMenu'
import BudgetDashboard from '../BudgetDashboard.vue'
import BudgetDialog from '../BudgetDialog.vue'
import BudgetHistory from '../BudgetHistory.vue'
import CategoryContextMenu from '../layout/CategoryContextMenu.vue'
import CategoryMonthBillsDrawer from '../CategoryMonthBillsDrawer.vue'
import CategoryDialog from '../CategoryDialog.vue'

const props = defineProps<{
  budgetYear: number
}>()

defineEmits<{
  (e: 'category-contextmenu', data: any): void
}>()

const store = useBillingStore()
const { success: showSuccess, error: showError } = useToast()
const { categories, deleteCategory, createCategory, updateCategory } = useBillCategories()
const { noteOptions } = useNotes()
const { upsertBudget, budgets, getCategoryBudgetEntries } = useBudgets()

// 对话框状态
const budgetDialogVisible = ref(false)
const editingBudget = ref<BudgetEntry | undefined>(undefined)
const budgetDialogRef = ref<InstanceType<typeof BudgetDialog> | null>(null)
const currentNoteId = ref<string>('')

// 预算历史对话框状态
const budgetHistoryVisible = ref(false)
const historyDialogData = ref({
  categoryId: '',
  categoryName: '',
  noteId: '',
  currentBudgetId: '',
  historyEntries: [] as BudgetEntry[]
})

// 账单列表抽屉状态
const billsDrawerVisible = ref(false)
const billsDrawerData = ref({
  categoryId: '',
  categoryName: '',
  year: new Date().getFullYear(),
  month: undefined as number | undefined,
  noteId: ''
})

// 分类编辑对话框状态
const categoryDialogVisible = ref(false)
const editingCategory = ref<BillCategory | null>(null)
const categoryDialogDefaults = ref({
  type: undefined as ('income' | 'expense') | undefined,
  defaultParentId: '',
  defaultName: ''
})

// 分类上下文菜单
const categoryMenu = ref<CategoryMenuState>({
  visible: false, x: 0, y: 0, node: null
})

const {
  openCategoryContextMenu,
  closeCategoryMenu,
  onMenuAddChild,
  onMenuEdit,
  onMenuDetail,
  onMenuDelete
} = useBillingCategoryMenu({
  categoryMenu,
  openCategoryDialog: (category, defaults) => {
    editingCategory.value = category ?? null
    categoryDialogDefaults.value = {
      type: defaults?.type,
      defaultParentId: defaults?.defaultParentId || '',
      defaultName: defaults?.defaultName || ''
    }
    categoryDialogVisible.value = true
  },
  handleDeleteCategory: async (id) => {
    try {
      await deleteCategory(id)
      showSuccess('分类已删除')
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e))
    }
  }
})

function openMonthBillsDrawer(payload: { categoryId: string; year: number; month: number; noteId: string }) {
  // 查找分类名称
  const category = categories.value.find(c => c.id === payload.categoryId)
  if (!category) return

  billsDrawerData.value = {
    categoryId: payload.categoryId,
    categoryName: category.name,
    year: payload.year,
    month: payload.month,
    noteId: payload.noteId
  }
  billsDrawerVisible.value = true
}

function onYearActualClick(payload: { categoryId: string; year: number; noteId: string }) {
  const category = categories.value.find(c => c.id === payload.categoryId)
  if (!category) return

  billsDrawerData.value = {
    categoryId: payload.categoryId,
    categoryName: category.name,
    year: payload.year,
    month: undefined,
    noteId: payload.noteId
  }
  billsDrawerVisible.value = true
}

function closeCategoryDialog() {
  categoryDialogVisible.value = false
  editingCategory.value = null
  categoryDialogDefaults.value = {
    type: undefined,
    defaultParentId: '',
    defaultName: ''
  }
}

async function handleCategoryDialogConfirm(data: any, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateCategory(id, data)
      showSuccess('分类已更新')
    } else {
      await createCategory(data)
      showSuccess('分类已创建')
    }
    closeCategoryDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function onCategoryClick(payload: { categoryId: string; year: number; month: number; noteId: string }) {
  const { categoryId, year, month, noteId } = payload

  // 获取该分类的所有预算配置
  const categoryBudgets = getCategoryBudgetEntries(categoryId, noteId)

  // 找到在指定年月生效的最新配置
  const targetTime = year * 12 + month
  const matchedBudget = categoryBudgets
    .filter(b => {
      const budgetTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
      return budgetTime <= targetTime
    })
    .sort((a, b) => {
      const aTime = a.effectiveFromYear * 12 + a.effectiveFromMonth
      const bTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
      return bTime - aTime // 降序，取最新的
    })[0]

  // 打开预算对话框
  if (matchedBudget) {
    // 编辑现有预算
    editingBudget.value = matchedBudget
  } else {
    // 新增预算
    editingBudget.value = undefined
  }

  // 临时保存 noteId，稍后用于传递给 BudgetDialog
  currentNoteId.value = noteId

  // 设置默认值并打开对话框
  budgetDialogVisible.value = true

  // 等待对话框挂载后设置默认值
  nextTick(() => {
    if (budgetDialogRef.value) {
      budgetDialogRef.value.setCategoryId(categoryId)
    }
  })
}

function closeBudgetDialog() {
  budgetDialogVisible.value = false
  editingBudget.value = undefined
  currentNoteId.value = ''
}

function openBudgetHistory(categoryId: string, noteId: string) {
  if (!categoryId) return

  // 查找分类名称
  const category = categories.value.find(c => c.id === categoryId)
  if (!category) return

  // 如果 noteId 为空字符串，传递 undefined 以查询所有该分类的预算
  const queryNoteId = noteId || undefined

  // 获取该分类的所有预算历史
  const historyEntries = getCategoryBudgetEntries(categoryId, queryNoteId)

  // 如果正在编辑预算，使用当前预算的 ID 作为 currentBudgetId
  const currentBudgetId = editingBudget.value?.id || ''

  historyDialogData.value = {
    categoryId,
    categoryName: category.name,
    noteId,
    currentBudgetId,
    historyEntries
  }
  budgetHistoryVisible.value = true
}

function closeBudgetHistory() {
  budgetHistoryVisible.value = false
}

async function handleBudgetConfirm(data: BudgetFormData) {
  try {
    if (!data.categoryId) {
      showError('请选择分类')
      return
    }
    if (data.amount <= 0) {
      showError('预算金额必须大于 0')
      return
    }
    await upsertBudget(data)
    showSuccess('预算已保存')
    closeBudgetDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleClickOutside() {
  closeCategoryMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
</style>
