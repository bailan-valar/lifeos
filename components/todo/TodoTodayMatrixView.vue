<template>
  <main class="today-matrix-view">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <Icon :name="ICONS.loading" size="32" class="loading-icon" />
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="todayTasks.length === 0" class="empty-state">
      <Icon :name="SOLAR_ICONS.doc.clipboard" size="48" />
      <p>今天没有待办任务 🎉</p>
    </div>

    <!-- 四象限表格 -->
    <div v-else class="matrix-table-container">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="row-header">状态</th>
            <th v-for="quadrant in quadrants" :key="quadrant.id" class="quadrant-header" :class="quadrant.className">
              <div class="quadrant-header-content">
                <Icon :name="quadrant.icon" size="16" />
                <span>{{ quadrant.label }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="statusRow in statusRows" :key="statusRow.statusId">
            <td class="row-header">
              <div class="status-badge" :style="{ background: statusRow.color }">
                <Icon :name="statusRow.icon || ICONS.round" size="14" />
                <span>{{ statusRow.name }}</span>
              </div>
            </td>
            <td v-for="quadrant in quadrants" :key="quadrant.id" class="quadrant-cell">
              <div class="cell-content">
                <div class="cell-tasks">
                  <TodoItem
                    v-for="task in getTasksInCell(statusRow.statusId, quadrant.id)"
                    :key="task.id"
                    :todo="task"
                    mode="compact"
                    :draggable="false"
                    @toggle="(id) => $emit('toggle', id)"
                    @update="(id, text) => $emit('update', id, text)"
                    @delete="(id) => $emit('delete', id)"
                    @edit="(id) => $emit('edit', id)"
                    @contextmenu="handleContextMenu"
                  />
                  <div v-if="getTasksInCell(statusRow.statusId, quadrant.id).length === 0" class="cell-empty" />
                </div>
                <!-- 快速添加区域 -->
                <div class="cell-quick-add">
                  <button
                    type="button"
                    class="quick-add-btn liquid-glass-button"
                    :title="`在${statusRow.name}-${quadrant.label}中添加任务`"
                    @click="handleQuickAddClick(statusRow.statusId, quadrant.id)"
                  >
                    <Icon :name="SOLAR_ICONS.action.add" size="14" />
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 待办右键菜单 -->
    <TodoContextMenu
      v-model:visible="contextMenuVisible"
      :todo="contextMenuTodo"
      :x="contextMenuX"
      :y="contextMenuY"
      @toggle-complete="handleToggleComplete"
      @edit="handleMenuEdit"
      @add-child="handleMenuAddChild"
      @view-detail="handleMenuViewDetail"
      @delete="handleMenuDelete"
      @set-date="handleMenuSetDate"
      @reposition="handleMenuReposition"
    />
  </main>
</template>

<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import TodoItem from './TodoItem.vue'
import TodoContextMenu from './TodoContextMenu.vue'
import type { TodoWithMeta } from '~/types/todo'
import type { TodoStatus } from '~/types/todo'
import type { TodoItem as TodoItemType } from '~/types/todo'

// 四象限定义
interface Quadrant {
  id: string
  label: string
  icon: string
  className: string
}

const QUADRANTS: Quadrant[] = [
  { id: 'urgent-important', label: '紧急且重要', icon: 'solar:fire-bold', className: 'quadrant-1' },
  { id: 'urgent-not-important', label: '紧急不重要', icon: 'solar:clock-circle-bold', className: 'quadrant-2' },
  { id: 'important-not-urgent', label: '重要不紧急', icon: 'solar:star-bold', className: 'quadrant-3' },
  { id: 'not-urgent-not-important', label: '不紧急不重要', icon: 'solar:coffee-bold', className: 'quadrant-4' }
]

interface Props {
  loading?: boolean
  todayTasks?: TodoWithMeta[]
  statuses?: TodoStatus[]
}

interface QuickAddOptions {
  statusId?: string
  dueDate?: string
  priority?: TodoItemType['priority']
}

interface Emits {
  (e: 'toggle', id: string): void
  (e: 'delete', id: string): void
  (e: 'update', id: string, text: string): void
  (e: 'edit', id: string): void
  (e: 'set-date', id: string, date: string | null): void
  (e: 'open-create', options: QuickAddOptions): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  todayTasks: () => [],
  statuses: () => []
})

const emit = defineEmits<Emits>()

const quadrants = QUADRANTS

// 按状态分组的行
const statusRows = computed(() => {
  // 获取所有使用中的状态（有任务的状态）
  const usedStatuses = new Set(props.todayTasks.map(t => t.statusId).filter(Boolean))

  const rows = props.statuses
    .filter(s => usedStatuses.has(s.id) || s.isDefault)
    .map(s => ({
      statusId: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color
    }))
    .sort((a, b) => {
      // 默认状态排最后
      if (a.statusId === '') return 1
      if (b.statusId === '') return -1
      return 0
    })

  // 如果没有状态，添加一个"无状态"行
  if (rows.length === 0) {
    rows.push({ statusId: '', name: '无状态', icon: '', color: '#999' })
  }

  return rows
})

// 判断任务属于哪个象限
const getQuadrantForTask = (task: TodoWithMeta): string => {
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = task.dueDate || task.createdAt.slice(0, 10)

  const isUrgent = dueDate <= today
  const isImportant = task.priority === 'high' || task.priority === 'medium'

  if (isUrgent && isImportant) return 'urgent-important'
  if (isUrgent && !isImportant) return 'urgent-not-important'
  if (!isUrgent && isImportant) return 'important-not-urgent'
  return 'not-urgent-not-important'
}

// 按象限和状态分组任务
const taskMatrix = computed(() => {
  const matrix: Record<string, Record<string, TodoWithMeta[]>> = {}

  for (const quadrant of quadrants) {
    matrix[quadrant.id] = {}
    for (const row of statusRows.value) {
      matrix[quadrant.id][row.statusId] = []
    }
  }

  for (const task of props.todayTasks) {
    const quadrantId = getQuadrantForTask(task)
    const statusId = task.statusId || ''

    if (!matrix[quadrantId]) {
      matrix[quadrantId] = {}
    }
    if (!matrix[quadrantId][statusId]) {
      matrix[quadrantId][statusId] = []
    }

    matrix[quadrantId][statusId].push(task)
  }

  return matrix
})

// 获取特定单元格的任务
const getTasksInCell = (statusId: string, quadrantId: string): TodoWithMeta[] => {
  return taskMatrix.value[quadrantId]?.[statusId] || []
}

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuTodo = ref<TodoWithMeta | null>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 右键菜单处理
const handleContextMenu = (event: MouseEvent, todo: TodoWithMeta) => {
  contextMenuTodo.value = todo
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

const handleToggleComplete = (todo: TodoWithMeta) => {
  emit('toggle', todo.id)
}

const handleMenuEdit = (todo: TodoWithMeta) => {
  emit('edit', todo.id)
}

const handleMenuAddChild = (todo: TodoWithMeta) => {
  // 添加子任务功能暂不支持
}

const handleMenuViewDetail = (todo: TodoWithMeta) => {
  emit('edit', todo.id)
}

const handleMenuDelete = (todo: TodoWithMeta) => {
  emit('delete', todo.id)
}

const handleMenuSetDate = (todo: TodoWithMeta, date: string | null) => {
  emit('set-date', todo.id, date)
}

const handleMenuReposition = (x: number, y: number) => {
  contextMenuX.value = x
  contextMenuY.value = y
}

// 快速添加功能：点击按钮打开创建弹框
const handleQuickAddClick = (statusId: string, quadrantId: string) => {
  // 根据象限确定优先级和截止日期
  const today = new Date().toISOString().slice(0, 10)
  let dueDate: string | undefined
  let priority: TodoItemType['priority'] = 'none'

  switch (quadrantId) {
    case 'urgent-important':
      dueDate = today
      priority = 'high'
      break
    case 'urgent-not-important':
      dueDate = today
      priority = 'low'
      break
    case 'important-not-urgent':
      // 重要但不紧急，不设置截止日期或设置为稍后
      priority = 'high'
      break
    case 'not-urgent-not-important':
      priority = 'low'
      break
  }

  emit('open-create', {
    statusId: statusId || undefined,
    dueDate: dueDate || undefined,
    priority
  })
}
</script>

<style scoped>
.today-matrix-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 表格容器 */
.matrix-table-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

/* 表头 */
.matrix-table thead tr {
  position: sticky;
  top: 0;
  z-index: 10;
}

.row-header {
  position: sticky;
  left: 0;
  z-index: 20;
  width: 140px;
  min-width: 140px;
  padding: 12px 8px;
  background: var(--liquid-bg-thick, rgba(255, 255, 255, 0.22));
  backdrop-filter: blur(var(--liquid-blur-thick, 32px));
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  font-weight: 600;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
  text-align: center;
}

.matrix-table thead .row-header {
  z-index: 30;
  border-top: none;
}

.quadrant-header {
  padding: 12px 8px;
  background: var(--liquid-bg-thick, rgba(255, 255, 255, 0.22));
  backdrop-filter: blur(var(--liquid-blur-thick, 32px));
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
  font-weight: 600;
  font-size: 12px;
  text-align: center;
}

.matrix-table thead .quadrant-header {
  z-index: 25;
  border-top: none;
}

.quadrant-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.quadrant-1 { color: rgb(255, 69, 58); }
.quadrant-2 { color: rgb(255, 159, 10); }
.quadrant-3 { color: rgb(48, 209, 88); }
.quadrant-4 { color: rgb(142, 142, 147); }

/* 表体 */
.quadrant-cell {
  padding: 8px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.08);
  vertical-align: top;
}

.quadrant-cell:first-child {
  border-left: none;
}

.matrix-table tbody tr:last-child .quadrant-cell,
.matrix-table tbody tr:last-child .row-header {
  border-bottom: none;
}

.matrix-table tbody .row-header {
  background: var(--liquid-bg, rgba(255, 255, 255, 0.15));
  backdrop-filter: blur(var(--liquid-blur, 20px));
  border-bottom: 1px solid rgba(60, 60, 67, 0.08);
}

/* 单元格内容容器 */
.cell-content {
  display: flex;
  flex-direction: column;
  min-height: 60px;
  max-height: 360px;
  overflow: hidden;
  padding: 6px;
  border-radius: 12px;
  background: rgba(60, 60, 67, 0.03);
}

/* 单元格任务容器 */
.cell-tasks {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 40px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.cell-empty {
  min-height: 32px;
}

/* 快速添加区域 */
.cell-quick-add {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin-top: 2px;
  border-top: 1px solid rgba(60, 60, 67, 0.06);
}

.quick-add-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgba(60, 60, 67, 0.5);
  background: transparent;
  transition: all 0.15s ease;
}

.quick-add-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.7);
}

/* 状态徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: white;
  justify-content: center;
}

/* 滚动条样式 */
.cell-tasks::-webkit-scrollbar {
  width: 4px;
}

.cell-tasks::-webkit-scrollbar-track {
  background: transparent;
}

.cell-tasks::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 2px;
}

.cell-tasks::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}

.matrix-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.matrix-table-container::-webkit-scrollbar-track {
  background: transparent;
}

.matrix-table-container::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 4px;
}

.matrix-table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .loading-state,
  .empty-state {
    color: rgba(255, 255, 255, 0.55);
  }

  .row-header,
  .quadrant-header {
    border-color: rgba(255, 255, 255, 0.1);
    background: var(--liquid-bg-thick, rgba(255, 255, 255, 0.15));
  }

  .quadrant-cell {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .matrix-table tbody .row-header {
    border-color: rgba(255, 255, 255, 0.08);
    background: var(--liquid-bg, rgba(255, 255, 255, 0.1));
  }

  .cell-tasks {
    background: rgba(255, 255, 255, 0.05);
  }

  .cell-content {
    background: rgba(255, 255, 255, 0.05);
  }

  .quick-add-btn {
    color: rgba(255, 255, 255, 0.5);
  }

  .quick-add-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
  }

  .cell-quick-add {
    border-top-color: rgba(255, 255, 255, 0.06);
  }

  .matrix-table-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  .matrix-table-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .cell-tasks::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  .cell-tasks::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .matrix-table-container {
    padding: 8px;
  }

  .row-header {
    width: 100px;
    min-width: 100px;
    padding: 8px 4px;
    font-size: 10px;
  }

  .quadrant-header {
    padding: 8px 4px;
    font-size: 10px;
  }

  .quadrant-header-content {
    gap: 2px;
  }

  .quadrant-header-content .icon {
    width: 14px;
    height: 14px;
  }
}
</style>
