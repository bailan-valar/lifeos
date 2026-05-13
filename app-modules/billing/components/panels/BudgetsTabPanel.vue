<template>
  <div class="tab-panel">
    <BudgetDashboard
      :year="budgetYear"
      @edit-cell="$emit('edit-budget-cell', $event)"
      @category-contextmenu="$emit('category-contextmenu', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  budgetYear: number
}>()

defineEmits<{
  (e: 'edit-budget-cell', data: any): void
  (e: 'category-contextmenu', data: any): void
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
</style>
