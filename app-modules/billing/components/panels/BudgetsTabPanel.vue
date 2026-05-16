<template>
  <div class="tab-panel">
    <BudgetDashboard
      :year="budgetYear"
      @edit-cell="openBudgetDialog"
      @category-contextmenu="openCategoryContextMenu"
    />
  </div>
  <BudgetDialog
    v-if="budgetDialogVisible"
    :visible="budgetDialogVisible"
    :budget="editingBudget"
    :categories="categories"
    :note-options="noteOptions"
    @confirm="handleBudgetConfirm"
    @cancel="closeBudgetDialog"
  />
  <CategoryContextMenu
    :visible="categoryMenu.visible"
    :x="categoryMenu.x"
    :y="categoryMenu.y"
    :node="categoryMenu.node"
    @add-child="onMenuAction"
    @edit="onMenuAction"
    @delete="onMenuAction"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import { useBudgets } from '~/composables/useBudgets'
import { useToast } from '~/composables/useToast'
import type { BudgetFormData, BudgetEntry } from '~/types/bill'
import { useBillingStore } from '~/stores/billing'
import { useBillingCategoryMenu, type CategoryMenuState } from '../../composables/useBillingCategoryMenu'
import BudgetDashboard from '../BudgetDashboard.vue'
import BudgetDialog from '../BudgetDialog.vue'
import CategoryContextMenu from '../layout/CategoryContextMenu.vue'

const props = defineProps<{
  budgetYear: number
}>()

defineEmits<{
  (e: 'category-contextmenu', data: any): void
}>()

const store = useBillingStore()
const { success: showSuccess, error: showError } = useToast()
const { categories } = useBillCategories()
const { noteOptions } = useNotes()
const { upsertBudget } = useBudgets()

// 对话框状态
const budgetDialogVisible = ref(false)
const editingBudget = ref<BudgetEntry | undefined>(undefined)

// 分类上下文菜单
const categoryMenu = ref<CategoryMenuState>({
  visible: false, x: 0, y: 0, node: null
})

const { openCategoryContextMenu, closeCategoryMenu } = useBillingCategoryMenu({
  categoryMenu,
  openCategoryDialog: () => {
    store.activeTab = 'categories'
  },
  handleDeleteCategory: () => {
    store.activeTab = 'categories'
  }
})

function onMenuAction() {
  closeCategoryMenu()
  store.activeTab = 'categories'
}

function openBudgetDialog() {
  editingBudget.value = undefined
  budgetDialogVisible.value = true
}

function closeBudgetDialog() {
  budgetDialogVisible.value = false
  editingBudget.value = undefined
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
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
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
