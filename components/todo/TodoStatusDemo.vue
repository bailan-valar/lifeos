<template>
  <div class="todo-status-demo">
    <div class="demo-header">
      <h2>待办状态管理功能演示</h2>
      <p class="demo-description">
        这个组件展示了待办状态管理功能的使用方法
      </p>
    </div>

    <div class="demo-sections">
      <!-- 状态管理演示 -->
      <div class="demo-section">
        <h3>1. 状态管理</h3>
        <p>点击下面的按钮打开状态管理对话框，可以创建、编辑和删除状态。</p>
        <button class="demo-btn" @click="showStatusManage = true" type="button">
          <Icon name="solar:settings-linear" size="20" />
          管理待办状态
        </button>
      </div>

      <!-- 状态显示演示 -->
      <div class="demo-section">
        <h3>2. 状态显示</h3>
        <p>以下是不同状态的显示效果：</p>
        <div class="status-examples">
          <div v-for="status in statuses" :key="status.id" class="status-example">
            <TodoStatusBadge :status="status" />
            <span class="status-desc">{{ status.description || '无描述' }}</span>
          </div>
        </div>
      </div>

      <!-- 状态选择演示 -->
      <div class="demo-section">
        <h3>3. 状态选择</h3>
        <p>选择一个状态来查看选择效果：</p>
        <TodoStatusSelector v-model="selectedStatus" />
        <div v-if="selectedStatus" class="selection-result">
          <p>已选择状态：</p>
          <TodoStatusBadge :status="getSelectedStatus()" />
        </div>
      </div>

      <!-- 待办项示例 -->
      <div class="demo-section">
        <h3>4. 待办项状态应用</h3>
        <p>以下是在待办项中应用状态的示例：</p>
        <div class="todo-examples">
          <div 
            v-for="todo in demoTodos" 
            :key="todo.id"
            class="todo-example-item"
          >
            <div class="todo-content">
              <input 
                v-model="todo.completed"
                type="checkbox"
                class="todo-checkbox"
              />
              <span :class="{ completed: todo.completed }">{{ todo.text }}</span>
              <TodoStatusBadge v-if="todo.statusId" :status="getTodoStatus(todo.statusId)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 功能说明 -->
      <div class="demo-section">
        <h3>5. 功能说明</h3>
        <ul class="feature-list">
          <li>✅ 自定义状态创建和管理</li>
          <li>✅ 状态图标和颜色自定义</li>
          <li>✅ 默认状态设置</li>
          <li>✅ 状态与待办项关联</li>
          <li>✅ 直观的可视化显示</li>
          <li>✅ 实时状态更新</li>
          <li>✅ 数据持久化存储</li>
        </ul>
      </div>
    </div>

    <!-- 状态管理对话框 -->
    <TodoStatusManageDialog v-model:visible="showStatusManage" />
  </div>
</template>

<script setup lang="ts">
import { useTodoStatus } from '~/composables/useTodoStatus'
import TodoStatusBadge from '~/components/todo/TodoStatusBadge.vue'
import TodoStatusSelector from '~/components/todo/TodoStatusSelector.vue'
import TodoStatusManageDialog from '~/components/todo/TodoStatusManageDialog.vue'
import type { TodoStatus } from '~/types/todo'

const { statuses, ensureDefaultStatuses } = useTodoStatus()

const showStatusManage = ref(false)
const selectedStatus = ref<string>('')

// 示例待办数据
const demoTodos = ref([
  {
    id: '1',
    text: '完成项目报告',
    completed: false,
    statusId: ''
  },
  {
    id: '2', 
    text: '准备会议材料',
    completed: false,
    statusId: ''
  },
  {
    id: '3',
    text: '代码审查',
    completed: true,
    statusId: ''
  }
])

// 初始化
onMounted(async () => {
  await ensureDefaultStatuses()
  // 为示例待办项分配状态
  if (statuses.value.length > 0) {
    demoTodos.value[0].statusId = statuses.value[0].id // 待办
    if (statuses.value.length > 1) {
      demoTodos.value[1].statusId = statuses.value[1].id // 进行中
    }
    if (statuses.value.length > 3) {
      demoTodos.value[2].statusId = statuses.value[3].id // 已完成
    }
  }
})

// 获取选中的状态对象
function getSelectedStatus(): TodoStatus | null {
  return statuses.value.find(s => s.id === selectedStatus.value) || null
}

// 获取待办项的状态
function getTodoStatus(statusId: string): TodoStatus | null {
  return statuses.value.find(s => s.id === statusId) || null
}
</script>

<style scoped>
.todo-status-demo {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  background: #f8fafc;
  border-radius: 16px;
}

.demo-header {
  text-align: center;
  margin-bottom: 32px;
}

.demo-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.demo-description {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.demo-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.demo-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.demo-section > p {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
  line-height: 1.6;
}

.demo-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.status-examples {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-example {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.status-desc {
  font-size: 13px;
  color: #64748b;
}

.selection-result {
  margin-top: 16px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.selection-result p {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.todo-examples {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-example-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.todo-content span {
  font-size: 14px;
  color: #1e293b;
  flex: 1;
}

.todo-content span.completed {
  text-decoration: line-through;
  color: #94a3b8;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.feature-list li {
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .todo-status-demo {
    padding: 16px;
  }
  
  .demo-section {
    padding: 16px;
  }
  
  .feature-list {
    grid-template-columns: 1fr;
  }
}
</style>