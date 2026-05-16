<template>
  <div class="tab-panel">
    <BudgetDashboard
      :year="budgetYear"
      @edit-cell="$emit('edit-budget-cell', $event)"
      @category-contextmenu="$emit('category-contextmenu', $event)"
    />
  </div>
  <BudgetDialog
    v-if="dialogs.budgetDialogVisible.value"
    :visible="dialogs.budgetDialogVisible.value"
    :budget="dialogs.editingBudget.value || undefined"
    :categories="categories"
    :note-options="noteOptions"
    @confirm="(data: any, isEditing: boolean, id?: string) => $emit('budget-confirm', data, isEditing, id)"
    @cancel="dialogs.closeBudgetDialog"
  />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import BudgetDashboard from '../BudgetDashboard.vue'
import BudgetDialog from '../BudgetDialog.vue'
const props = defineProps<{
  budgetYear: number
}>()

defineEmits<{
  (e: 'edit-budget-cell', data: any): void
  (e: 'category-contextmenu', data: any): void
  (e: 'budget-confirm', data: any, isEditing: boolean, id?: string): void
}>()

const dialogs = inject('budgetDialogs') as any
const categories = inject('categories') as any
const noteOptions = inject('noteOptions') as any
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
