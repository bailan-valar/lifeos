<template>
  <div class="categories-page">
    <CategoriesTabPanel
      :income-tree="incomeTree"
      :expense-tree="expenseTree"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import CategoriesTabPanel from '../components/panels/CategoriesTabPanel.vue'

// 注入分类树数据
const incomeTree = inject<Ref<any>>('incomeTree')
const expenseTree = inject<Ref<any>>('expenseTree')
</script>

<style scoped>
.categories-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
