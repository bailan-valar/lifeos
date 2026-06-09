<template>
  <div v-if="visible" class="todo-status-manage-dialog-overlay" @click.self="close">
    <div class="todo-status-manage-dialog">
      <div class="dialog-header">
        <h3>管理待办状态</h3>
        <button class="close-btn" type="button" @click="close">
          <Icon name="solar:close-circle-linear" size="24" />
        </button>
      </div>

      <div class="dialog-body">
        <div v-if="loading" class="loading-state">
          <Icon :name="ICONS.loading" size="32" class="loading-icon" />
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <Icon name="solar:danger-circle-linear" size="32" color="#ef4444" />
          <p>{{ error }}</p>
          <button class="retry-btn" type="button" @click="loadStatuses">
            重试
          </button>
        </div>

        <div v-else class="status-list">
          <div
            v-for="(status, index) in sortedStatuses"
            :key="status.id"
            class="status-item"
            :class="{
              'is-default': status.isDefault,
              'is-dragging': draggedIndex === index,
              'is-drag-over': dragOverIndex === index
            }"
            draggable="true"
            @dragstart="handleDragStart(index)"
            @dragover.prevent="handleDragOver(index)"
            @dragend="handleDragEnd"
            @drop.prevent="handleDrop(index)"
          >
            <div class="drag-handle">
              <Icon name="solar:handle-horizontal-linear" size="16" />
            </div>

            <div class="status-display">
              <div 
                class="status-icon"
                :style="{ backgroundColor: `${status.color}20`, color: status.color }"
              >
                <Icon :name="status.icon || ICONS.round" size="16" />
              </div>
              <div class="status-details">
                <div class="status-name">
                  {{ status.name }}
                  <span v-if="status.isDefault" class="default-badge">默认</span>
                  <span v-if="status.isCompleted" class="completed-badge">完成</span>
                </div>
                <div v-if="status.description" class="status-description">
                  {{ status.description }}
                </div>
              </div>
            </div>

            <div class="status-actions">
              <button
                v-if="!status.isDefault"
                class="action-btn set-default-btn"
                type="button"
                title="设为默认"
                @click="setDefaultStatus(status.id)"
              >
                <Icon name="solar:star-linear" size="16" />
              </button>
              <button
                class="action-btn edit-btn"
                type="button"
                title="编辑"
                @click="editStatus(status)"
              >
                <Icon name="solar:pen-2-linear" size="16" />
              </button>
              <button
                v-if="!status.isDefault"
                class="action-btn delete-btn"
                type="button"
                title="删除"
                @click="confirmDeleteStatus(status)"
              >
                <Icon name="solar:trash-bin-trash-linear" size="16" />
              </button>
            </div>
          </div>

          <div v-if="sortedStatuses.length === 0" class="empty-state">
            <Icon name="solar:clipboard-list-linear" size="48" />
            <p>暂无状态</p>
            <button class="create-btn" type="button" @click="createNewStatus">
              创建第一个状态
            </button>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="create-btn" type="button" @click="createNewStatus">
            <Icon name="solar:add-circle-linear" size="18" />
            新建状态
          </button>
          <button class="reset-btn" type="button" @click="confirmReset">
            <Icon name="solar:refresh-linear" size="18" />
            重置为默认
          </button>
        </div>
      </div>

      <!-- 编辑/创建状态对话框 -->
      <TodoStatusEditDialog
        v-model:visible="showEditDialog"
        :status="editingStatus"
        @save="handleStatusSaved"
        @create="handleStatusCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useToast } from '~/composables/useToast'
import { useConfirm } from '~/composables/useConfirm'
import type { TodoStatus } from '~/types/todo'

const { error: showError, success: showSuccess } = useToast()
const { confirm } = useConfirm()

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const {
  statuses,
  loading,
  error,
  loadStatuses,
  setDefaultStatus,
  deleteStatus,
  resetStatuses,
  reorderStatuses
} = useTodoStatus()

const showEditDialog = ref(false)
const editingStatus = ref<TodoStatus | null>(null)

// 拖拽状态
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const sortedStatuses = computed(() => {
  return [...statuses.value].sort((a, b) => {
    // 默认状态排在前面
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    // 按order排序
    return a.order - b.order
  })
})

function close() {
  emit('update:visible', false)
}

function createNewStatus() {
  editingStatus.value = null
  showEditDialog.value = true
}

function editStatus(status: TodoStatus) {
  editingStatus.value = { ...status }
  showEditDialog.value = true
}

async function confirmDeleteStatus(status: TodoStatus) {
  const ok = await confirm({
    message: `确定要删除状态"${status.name}"吗？`,
    danger: true
  })
  if (!ok) return
  try {
    await deleteStatus(status.id)
  } catch (e) {
    showError(e instanceof Error ? e.message : '删除失败')
  }
}

async function confirmReset() {
  const ok = await confirm({
    message: '确定要重置为默认状态吗？这将删除所有自定义状态。',
    danger: true
  })
  if (!ok) return
  try {
    await resetStatuses()
    showSuccess('重置成功')
  } catch (e) {
    showError(e instanceof Error ? e.message : '重置失败')
  }
}

function handleStatusSaved(status: TodoStatus) {
  showEditDialog.value = false
  editingStatus.value = null
}

function handleStatusCreated(status: TodoStatus) {
  showEditDialog.value = false
  editingStatus.value = null
}

// 拖拽处理
function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragOver(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return
  dragOverIndex.value = index
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

async function handleDrop(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }

  const from = draggedIndex.value
  const to = index

  draggedIndex.value = null
  dragOverIndex.value = null

  try {
    await reorderStatuses(from, to)
  } catch (e) {
    showError(e instanceof Error ? e.message : '排序失败')
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadStatuses()
  }
})
</script>

<style scoped>
.todo-status-manage-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.todo-status-manage-dialog {
  background: var(--liquid-bg, rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(var(--liquid-blur, 20px)) saturate(var(--liquid-saturate, 180%));
  border-radius: var(--liquid-radius, 20px);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  border: 0.5px solid rgba(255, 255, 255, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.12);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.dialog-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
  color: rgba(60, 60, 67, 0.6);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.retry-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.status-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(60, 60, 67, 0.12);
  border-radius: 12px;
  background: white;
  transition: all 0.2s;
  cursor: move;
}

.status-item:hover {
  border-color: rgba(0, 122, 255, 0.3);
  background: rgba(0, 122, 255, 0.02);
}

.status-item.is-default {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.05);
}

.status-item.is-dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.status-item.is-drag-over {
  border-color: rgba(0, 122, 255, 0.5);
  background: rgba(0, 122, 255, 0.05);
}

.drag-handle {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(60, 60, 67, 0.3);
  cursor: grab;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.status-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-description {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
}

.default-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.completed-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(60, 60, 67, 0.05);
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.set-default-btn:hover {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.empty-state p {
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(60, 60, 67, 0.12);
}

.create-btn,
.reset-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn {
  background: #3b82f6;
  color: white;
}

.create-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.reset-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.reset-btn:hover {
  background: rgba(60, 60, 67, 0.15);
}

/* 滚动条样式 */
.status-list::-webkit-scrollbar {
  width: 6px;
}

.status-list::-webkit-scrollbar-track {
  background: rgba(60, 60, 67, 0.05);
  border-radius: 3px;
}

.status-list::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.status-list::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .todo-status-manage-dialog {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.05));
    border-color: rgba(255, 255, 255, 0.1);
  }

  .dialog-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .dialog-header h3 {
    color: rgba(255, 255, 255, 0.9);
  }

  .close-btn {
    color: rgba(255, 255, 255, 0.6);
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .loading-state,
  .error-state {
    color: rgba(255, 255, 255, 0.6);
  }

  .status-item {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .status-item:hover {
    border-color: rgba(0, 122, 255, 0.3);
    background: rgba(0, 122, 255, 0.05);
  }

  .status-item.is-default {
    border-color: rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.1);
  }

  .status-item.is-drag-over {
    border-color: rgba(0, 122, 255, 0.5);
    background: rgba(0, 122, 255, 0.1);
  }

  .drag-handle {
    color: rgba(255, 255, 255, 0.3);
  }

  .status-name {
    color: rgba(255, 255, 255, 0.9);
  }

  .status-description {
    color: rgba(255, 255, 255, 0.6);
  }

  .default-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
  }

  .completed-badge {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .action-btn {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .empty-state {
    color: rgba(255, 255, 255, 0.55);
  }

  .dialog-actions {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .create-btn {
    background: rgb(0, 122, 255);
  }

  .create-btn:hover {
    background: rgb(0, 102, 220);
  }

  .reset-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }
}
</style>