<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="store.activeCategorySubTab"
        :options="store.categorySubTabOptions"
        :min-width="120"
        plain
        @change="store.activeCategorySubTab = $event"
      />
      <h4 v-else>{{ store.categorySubTabTitle }}</h4>
      <div v-if="!isMobile" class="header-actions">
        <button type="button" class="add-btn secondary" @click="handleExportCategories">
          <Icon name="solar:download-linear" size="18" />
          导出
        </button>
        <button type="button" class="add-btn secondary" @click="handleImportCategories">
          <Icon name="solar:upload-linear" size="18" />
          导入
        </button>
        <button type="button" class="add-btn secondary" @click="handleSyncDefaultCategories">
          <Icon name="solar:cloud-download-linear" size="18" />
          分类初始化
        </button>
        <button type="button" class="add-btn" @click="openCategoryDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          添加分类
        </button>
      </div>
      <button v-else type="button" class="add-btn" @click="openCategoryDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        添加分类
      </button>
    </div>
    <div class="category-list-container">
      <div v-if="store.activeCategorySubTab === 'all' || store.activeCategorySubTab === 'income'" class="category-section">
        <div class="category-subtitle">收入分类</div>
        <CategoryTree
          :nodes="incomeTree"
          @edit="openCategoryDialog"
          @delete="handleDeleteCategory"
          @add-child="openAddChildCategoryDialog"
          @view-detail="navigateTo('/billing/categories/' + $event.id)"
          @contextmenu="openCategoryContextMenu"
        />
      </div>
      <div v-if="store.activeCategorySubTab === 'all' || store.activeCategorySubTab === 'expense'" class="category-section">
        <div class="category-subtitle">支出分类</div>
        <CategoryTree
          :nodes="expenseTree"
          @edit="openCategoryDialog"
          @delete="handleDeleteCategory"
          @add-child="openAddChildCategoryDialog"
          @view-detail="navigateTo('/billing/categories/' + $event.id)"
          @contextmenu="openCategoryContextMenu"
        />
      </div>
    </div>
  </div>
  <CategoryDialog
    v-if="categoryDialogVisible"
    :visible="categoryDialogVisible"
    :category="editingCategory"
    :categories="categories"
    :exclude-id="editingCategory?.id"
    :default-type="categoryFormDefaults?.type"
    :default-parent-id="categoryFormDefaults?.defaultParentId"
    :default-name="categoryFormDefaults?.defaultName"
    @confirm="handleCategoryConfirm"
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useBillCategories } from '~/composables/useBillCategories'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import { useDevice } from '~/composables/useDevice'
import type { BillCategory, CategoryFormData, CategoryTreeNode, CategoryType } from '~/types/bill'
import SelectPicker from '../SelectPicker.vue'
import CategoryTree from '../CategoryTree.vue'
import CategoryDialog from '../CategoryDialog.vue'
import CategoryContextMenu from '../layout/CategoryContextMenu.vue'
import { useBillingCategoryMenu, type CategoryMenuState } from '../../composables/useBillingCategoryMenu'

const props = defineProps<{
  incomeTree: CategoryTreeNode[]
  expenseTree: CategoryTreeNode[]
}>()

defineEmits<{
  (e: 'category-contextmenu', data: any): void
}>()

const store = useBillingStore()
const { isMobile } = useDevice()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()

const { categories, createCategory, updateCategory, deleteCategory, syncDefaultCategories, exportCategories, importCategories } = useBillCategories()

// 对话框状态
const categoryDialogVisible = ref(false)
const editingCategory = ref<BillCategory | undefined>(undefined)
const categoryFormDefaults = ref<{ type?: CategoryType; defaultParentId?: string; defaultName?: string } | undefined>(undefined)

// 分类上下文菜单
const categoryMenu = ref<CategoryMenuState>({
  visible: false, x: 0, y: 0, node: null
})

const { openCategoryContextMenu, closeCategoryMenu, onMenuAddChild, onMenuEdit, onMenuDetail, onMenuDelete } = useBillingCategoryMenu({
  categoryMenu,
  openCategoryDialog: (category?: BillCategory, defaults?: { type?: CategoryType; defaultParentId?: string; defaultName?: string }) => {
    openCategoryDialog(category, defaults)
  },
  handleDeleteCategory: async (id: string) => {
    await handleDeleteCategory(id)
  }
})

function openCategoryDialog(category?: BillCategory, defaults?: { type?: CategoryType; defaultParentId?: string; defaultName?: string }) {
  editingCategory.value = category
  categoryFormDefaults.value = defaults
  categoryDialogVisible.value = true
}

function closeCategoryDialog() {
  categoryDialogVisible.value = false
  editingCategory.value = undefined
  categoryFormDefaults.value = undefined
}

function openAddChildCategoryDialog(parent: CategoryTreeNode) {
  openCategoryDialog(undefined, { type: parent.type, defaultParentId: parent.id })
}

// 事件处理
async function handleDeleteCategory(id: string) {
  const ok = await confirm({
    title: '删除分类',
    message: '确定要删除此分类吗？此操作不可恢复。',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return

  try {
    await deleteCategory(id)
    showSuccess('分类已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleCategoryConfirm(data: CategoryFormData, isEditing: boolean, id?: string) {
  try {
    if (isEditing && id) {
      await updateCategory(id, data)
      showSuccess('分类已更新')
    } else {
      await createCategory(data)
      showSuccess('分类已添加')
    }
    closeCategoryDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleSyncDefaultCategories() {
  if (!await confirm({
    message: '确定执行分类初始化？\n\n将保留您的自定义分类，仅添加默认分类中尚未存在的分类。',
  })) return
  try {
    const { created, skipped } = await syncDefaultCategories()
    showSuccess(`分类初始化完成：新增 ${created} 条分类，已存在 ${skipped} 条`)
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function handleExportCategories() {
  try {
    const data = exportCategories()
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showSuccess('分类已导出')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleImportCategories() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const items = payload?.categories ?? payload
      if (!Array.isArray(items)) {
        showError('文件格式错误：分类列表应为数组')
        return
      }
      const { created, skipped } = await importCategories(items)
      showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
    } catch (e) {
      showError(e instanceof Error ? e.message : '导入失败')
    }
  }
  input.click()
}

// 点击外部关闭菜单
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

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.add-btn:hover {
  opacity: 0.9;
}

.add-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(60, 60, 67, 0.7);
}

.add-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.category-list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  padding: 0 4px;
}
</style>
