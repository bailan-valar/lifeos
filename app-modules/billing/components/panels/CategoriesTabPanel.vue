<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="localActiveSubTab"
        :options="categorySubTabOptions"
        :min-width="120"
        plain
        @change="$emit('category-sub-tab-change', $event)"
      />
      <h4 v-else>{{ categorySubTabTitle }}</h4>
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
        <button type="button" class="add-btn" @click="$emit('add-category')">
          <Icon name="solar:add-circle-linear" size="18" />
          添加分类
        </button>
      </div>
      <button v-else type="button" class="add-btn" @click="$emit('add-category')">
        <Icon name="solar:add-circle-linear" size="18" />
        添加分类
      </button>
    </div>
    <div class="category-list-container">
      <div v-if="activeCategorySubTab === 'all' || activeCategorySubTab === 'income'" class="category-section">
        <div class="category-subtitle">收入分类</div>
        <CategoryTree
          :nodes="incomeTree"
          @edit="$emit('edit-category', $event)"
          @delete="$emit('delete-category', $event)"
          @add-child="$emit('add-child-category', $event)"
          @view-detail="$emit('view-category-detail', $event)"
          @contextmenu="$emit('category-contextmenu', $event)"
        />
      </div>
      <div v-if="activeCategorySubTab === 'all' || activeCategorySubTab === 'expense'" class="category-section">
        <div class="category-subtitle">支出分类</div>
        <CategoryTree
          :nodes="expenseTree"
          @edit="$emit('edit-category', $event)"
          @delete="$emit('delete-category', $event)"
          @add-child="$emit('add-child-category', $event)"
          @view-detail="$emit('view-category-detail', $event)"
          @contextmenu="$emit('category-contextmenu', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

type CategoryType = 'income' | 'expense'

const props = defineProps<{
  incomeTree: any[]
  expenseTree: any[]
  activeCategorySubTab: CategoryType | 'all'
  categorySubTabTitle: string
  categorySubTabOptions: { value: CategoryType; label: string }[]
  isMobile: boolean
}>()

defineEmits<{
  (e: 'category-sub-tab-change', type: CategoryType): void
  (e: 'export-categories'): void
  (e: 'import-categories'): void
  (e: 'sync-default-categories'): void
  (e: 'add-category'): void
  (e: 'edit-category', category: any): void
  (e: 'delete-category', id: string): void
  (e: 'add-child-category', parent: any): void
  (e: 'view-category-detail', node: any): void
  (e: 'category-contextmenu', data: any): void
}>()

const localActiveSubTab = ref(props.activeCategorySubTab)

watch(() => props.activeCategorySubTab, (val) => {
  localActiveSubTab.value = val
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
