<template>
  <div class="page">
    <div class="page-header">
      <h1>待办状态管理功能演示</h1>
      <p>这是一个完整的待办状态管理功能演示页面</p>
    </div>

    <div class="page-content">
      <TodoStatusDemo />
    </div>
  </div>
</template>

<script setup lang="ts">
import TodoStatusDemo from '~/components/todo/TodoStatusDemo.vue'

definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.page-header p {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style>