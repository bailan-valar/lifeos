<template>
  <div class="todo-types-page">
    <div class="page-header">
      <h1>待办类型管理</h1>
      <button class="primary-btn" @click="showManager = true">
        <Icon name="solar:add-circle-linear" />
        <span>管理类型</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <Icon name="solar:loading-linear" size="32" class="loading-icon" />
      <p>加载中...</p>
    </div>

    <div v-else class="types-grid">
      <div
        v-for="type in todoTypes"
        :key="type.id"
        class="type-card"
        :style="{ borderLeftColor: type.color }"
      >
        <div class="type-icon" :style="{ background: type.color + '18', color: type.color }">
          <Icon :name="type.icon" size="24" />
        </div>
        <div class="type-info">
          <h3>{{ type.name }}</h3>
          <p>{{ type.description || '暂无描述' }}</p>
        </div>
        <div class="type-meta">
          <span class="type-order">排序: {{ type.order }}</span>
          <span class="type-date">{{ formatDate(type.createdAt) }}</span>
        </div>
      </div>

      <div v-if="todoTypes.length === 0" class="empty-state">
        <Icon name="solar:folder-open-linear" size="48" />
        <p>还没有创建任何待办类型</p>
        <button class="primary-btn" @click="showManager = true">
          <Icon name="solar:add-circle-linear" />
          <span>创建第一个类型</span>
        </button>
      </div>
    </div>

    <TodoTypeManager v-model:visible="showManager" @created="onTypeCreated" @updated="onTypeUpdated" />
  </div>
</template>

<script setup lang="ts">
import TodoTypeManager from '~/components/todo/TodoTypeManager.vue'
import { useTodoTypes } from '~/composables/useTodoTypes'

const showManager = ref(false)
const { todoTypes, loading, loadTodoTypes } = useTodoTypes()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const onTypeCreated = () => {
  loadTodoTypes()
}

const onTypeUpdated = () => {
  loadTodoTypes()
}

onMounted(() => {
  loadTodoTypes()
})
</script>

<style scoped>
.todo-types-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.primary-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.primary-btn:hover {
  background: #2563eb;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #6b7280;
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.type-card {
  border: 1px solid #e5e7eb;
  border-left: 4px solid;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: all 0.2s;
}

.type-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.type-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.type-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.type-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  min-height: 20px;
}

.type-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  font-size: 12px;
  color: #9ca3af;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #6b7280;
  text-align: center;
}

.empty-state p {
  margin: 16px 0;
  font-size: 16px;
}
</style>