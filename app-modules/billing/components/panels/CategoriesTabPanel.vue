<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="navigation.activeCategorySubTab.value"
        :options="navigation.categorySubTabOptions.value"
        :min-width="120"
        plain
        @change="navigation.activeCategorySubTab.value = $event"
      />
      <h4 v-else>{{ navigation.categorySubTabTitle.value }}</h4>
      <div v-if="!isMobile" class="header-actions">
        <button type="button" class="add-btn secondary" @click="$emit('export-categories')">
          <Icon name="solar:download-linear" size="18" />
          导出
        </button>
        <button type="button" class="add-btn secondary" @click="$emit('import-categories')">
          <Icon name="solar:upload-linear" size="18" />
          导入
        </button>
        <button type="button" class="add-btn secondary" @click="$emit('sync-default-categories')">
          <Icon name="solar:cloud-download-linear" size="18" />
          分类初始化
        </button>
        <button type="button" class="add-btn" @click="dialogs.openCategoryDialog()">
          <Icon name="solar:add-circle-linear" size="18" />
          添加分类
        </button>
      </div>
      <button v-else type="button" class="add-btn" @click="dialogs.openCategoryDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        添加分类
      </button>
    </div>
    <div class="category-list-container">
      <div v-if="navigation.activeCategorySubTab.value === 'all' || navigation.activeCategorySubTab.value === 'income'" class="category-section">
        <div class="category-subtitle">收入分类</div>
        <CategoryTree
          :nodes="incomeTree"
          @edit="dialogs.openCategoryDialog($event)"
          @delete="$emit('delete-category', $event)"
          @add-child="$emit('add-child-category', $event)"
          @view-detail="navigateTo('/billing/categories/' + $event.id)"
          @contextmenu="$emit('category-contextmenu', $event)"
        />
      </div>
      <div v-if="navigation.activeCategorySubTab.value === 'all' || navigation.activeCategorySubTab.value === 'expense'" class="category-section">
        <div class="category-subtitle">支出分类</div>
        <CategoryTree
          :nodes="expenseTree"
          @edit="dialogs.openCategoryDialog($event)"
          @delete="$emit('delete-category', $event)"
          @add-child="$emit('add-child-category', $event)"
          @view-detail="navigateTo('/billing/categories/' + $event.id)"
          @contextmenu="$emit('category-contextmenu', $event)"
        />
      </div>
    </div>
  </div>
  <CategoryDialog
    v-if="dialogs.categoryDialogVisible.value"
    :visible="dialogs.categoryDialogVisible.value"
    :category="dialogs.editingCategory.value || undefined"
    :categories="categories"
    :exclude-id="dialogs.editingCategory.value?.id"
    :default-type="dialogs.categoryFormDefaults.value?.type"
    :default-parent-id="dialogs.categoryFormDefaults.value?.defaultParentId"
    :default-name="dialogs.categoryFormDefaults.value?.defaultName"
    @confirm="(data: any, isEditing: boolean, id?: string) => $emit('category-confirm', data, isEditing, id)"
    @cancel="dialogs.closeCategoryDialog"
  />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import SelectPicker from '../SelectPicker.vue'
import CategoryTree from '../CategoryTree.vue'
import CategoryDialog from '../CategoryDialog.vue'

const props = defineProps<{
  incomeTree: any[]
  expenseTree: any[]
}>()

defineEmits<{
  (e: 'export-categories'): void
  (e: 'import-categories'): void
  (e: 'sync-default-categories'): void
  (e: 'delete-category', id: string): void
  (e: 'add-child-category', parent: any): void
  (e: 'category-contextmenu', data: any): void
  (e: 'category-confirm', data: any, isEditing: boolean, id?: string): void
}>()

const navigation = inject<any>('billingNavigation')
const { isMobile } = useDevice()

const dialogs = inject('categoryDialogs') as any
const categories = inject('categories') as any
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
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.add-btn:hover {
  background: rgb(0, 110, 250);
}

.add-btn.secondary {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.92);
}

.add-btn.secondary:hover {
  background: rgba(60, 60, 67, 0.18);
}

.category-list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
