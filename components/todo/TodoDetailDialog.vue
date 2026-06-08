<template>
  <BaseDialog
    v-model:visible="internalVisible"
    title="待办详情"
    size="large"
  >
    <div v-if="todo" class="todo-detail">
      <!-- 待办基本信息 -->
      <div class="detail-section">
        <div class="detail-header">
          <div class="status-indicator" :class="{ completed: todo.completed }">
            <Icon
              :name="todo.completed ? ICONS.checkCircle : ICONS.round"
              :size="18"
              :color="statusColor"
            />
          </div>
          <h3 class="detail-title">{{ todo.text }}</h3>
        </div>

        <div class="detail-meta">
          <!-- 优先级 -->
          <div v-if="todo.priority && todo.priority !== 'none'" class="meta-item">
            <Icon :name="ICONS.starCircle || 'solar:star-circle-linear'" :size="14" :color="priorityColor" />
            <span>{{ priorityLabel }}</span>
          </div>

          <!-- 类型 -->
          <div v-if="typeInfo" class="meta-item">
            <Icon :name="typeInfo.icon" :size="14" :color="typeInfo.color" />
            <span>{{ typeInfo.name }}</span>
          </div>

          <!-- 状态 -->
          <div v-if="statusInfo" class="meta-item">
            <div class="status-badge" :style="{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }">
              <Icon :name="statusInfo.icon" :size="12" />
              <span>{{ statusInfo.name }}</span>
            </div>
          </div>

          <!-- 创建时间 -->
          <div class="meta-item">
            <Icon :name="SOLAR_ICONS.billing.calendar || 'solar:calendar-linear'" :size="14" />
            <span>创建于 {{ formatDate(todo.createdAt) }}</span>
          </div>
        </div>

        <!-- 时间信息 -->
        <div v-if="todo.startDate || todo.dueDate" class="detail-time">
          <div v-if="todo.startDate" class="time-item">
            <Icon :name="ICONS.clockCircle || 'solar:clock-circle-linear'" :size="14" />
            <span>开始：{{ formatDateTime(todo.startDate) }}</span>
          </div>
          <div v-if="todo.dueDate" class="time-item">
            <Icon :name="SOLAR_ICONS.billing.calendar || 'solar:calendar-linear'" :size="14" />
            <span>截止：{{ formatDateTime(todo.dueDate) }}</span>
          </div>
        </div>

        <!-- 绑定笔记 -->
        <div v-if="noteInfo" class="detail-note">
          <Icon :name="SOLAR_ICONS.doc.notebook || 'solar:notebook-linear'" :size="14" />
          <span>绑定笔记：{{ noteInfo }}</span>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="detail-divider" />

      <!-- 评论区域 -->
      <div class="comment-section">
        <h4 class="section-title">
          评论
          <span v-if="!loadingComments" class="comment-count">({{ comments.length }})</span>
        </h4>

        <TodoCommentList
          :comments="comments"
          :loading="loadingComments"
          @delete="handleDeleteComment"
        />

        <TodoCommentInput
          ref="commentInputRef"
          :todo-id="todo.id"
          @submit="handleSubmitComment"
        />
      </div>
    </div>

    <template #footer>
      <div class="footer-actions">
        <button class="liquid-glass-button" @click="onCancel">
          关闭
        </button>
        <button class="liquid-glass-button liquid-glass-button-primary" @click="onEdit">
          <Icon :name="SOLAR_ICONS.action.edit || 'solar:pen-linear'" :size="16" />
          <span>编辑</span>
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import BaseDialog from '~/components/ui/BaseDialog.vue'
import TodoCommentList from './TodoCommentList.vue'
import TodoCommentInput from './TodoCommentInput.vue'
import { useTodoComments } from '~/composables/useTodoComments'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useTodoTypes } from '~/composables/useTodoTypes'
import { useNotes } from '~/composables/useNotes'
import type { TodoItem, TodoComment } from '~/types/todo'

interface Props {
  visible?: boolean
  todo?: TodoItem | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'edit', todo: TodoItem): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  todo: null
})

const emit = defineEmits<Emits>()

const { loadComments, addComment, deleteComment, onCommentsChange } = useTodoComments()
const { statuses, loadStatuses } = useTodoStatus()
const { types, loadTypes } = useTodoTypes()
const { noteOptions, loadNotes } = useNotes()

const internalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const comments = ref<TodoComment[]>([])
const loadingComments = ref(false)
const commentInputRef = ref<InstanceType<typeof TodoCommentInput> | null>(null)

// 取消订阅
let unsubscribeComments: (() => void) | null = null

// 状态颜色
const statusColor = computed(() => {
  if (!props.todo?.statusId) return 'rgba(60, 60, 67, 0.3)'
  const status = statuses.value.find(s => s.id === props.todo.statusId)
  return status?.color || 'rgba(60, 60, 67, 0.3)'
})

// 优先级信息
const priorityColor = computed(() => {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  }
  return colors[props.todo?.priority || 'none'] || '#9ca3af'
})

const priorityLabel = computed(() => {
  const labels = { high: '高优先级', medium: '中优先级', low: '低优先级' }
  return labels[props.todo?.priority || 'none'] || ''
})

// 类型信息
const typeInfo = computed(() => {
  if (!props.todo?.typeId) return null
  return types.value.find(t => t.id === props.todo.typeId)
})

// 状态信息
const statusInfo = computed(() => {
  if (!props.todo?.statusId) return null
  return statuses.value.find(s => s.id === props.todo.statusId)
})

// 笔记信息
const noteInfo = computed(() => {
  if (!props.todo?.noteId) return null
  const note = noteOptions.value.find(n => n.id === props.todo.noteId)
  return note?.title || null
})

// 加载评论
const loadTodoComments = async () => {
  if (!props.todo) return

  loadingComments.value = true
  try {
    comments.value = await loadComments(props.todo.id)
  } finally {
    loadingComments.value = false
  }
}

// 处理提交评论
const handleSubmitComment = async (content: string) => {
  if (!props.todo) return

  const result = await addComment(props.todo.id, content)
  if (result) {
    comments.value = [result, ...comments.value]
  }
}

// 处理删除评论
const handleDeleteComment = async (comment: TodoComment) => {
  const success = await deleteComment(comment.id)
  if (success) {
    comments.value = comments.value.filter(c => c.id !== comment.id)
  }
}

// 格式化日期
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 格式化日期时间
const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 取消
const onCancel = () => {
  internalVisible.value = false
}

// 编辑
const onEdit = () => {
  if (props.todo) {
    emit('edit', props.todo)
  }
}

// 监听 visible 变化
watch(() => props.visible, async (visible) => {
  if (visible && props.todo) {
    // 加载静态数据
    await Promise.all([
      loadStatuses(),
      loadTypes(),
      loadNotes()
    ])
    // 加载评论
    await loadTodoComments()
    // 聚焦评论输入框
    nextTick(() => {
      commentInputRef.value?.focus()
    })
    // 订阅评论变更
    unsubscribeComments = onCommentsChange(() => {
      loadTodoComments()
    })
  } else {
    // 清理订阅
    unsubscribeComments?.()
    unsubscribeComments = null
  }
})

// 清理
onUnmounted(() => {
  unsubscribeComments?.()
})
</script>

<style scoped>
.todo-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(60, 60, 67, 0.06);
  color: rgba(60, 60, 67, 0.3);
  flex-shrink: 0;
}

.status-indicator.completed {
  background: rgba(52, 199, 89, 0.15);
  color: rgb(52, 199, 89);
}

.detail-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.9);
  line-height: 1.4;
  word-break: break-word;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.65);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.detail-time {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(60, 60, 67, 0.03);
  border-radius: 8px;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
}

.detail-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.65);
}

.detail-divider {
  height: 0.5px;
  background: rgba(60, 60, 67, 0.1);
  margin: 4px 0;
}

.comment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
}

.comment-count {
  font-size: 13px;
  font-weight: 400;
  color: rgba(60, 60, 67, 0.5);
}

.footer-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.footer-actions button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

@media (prefers-color-scheme: dark) {
  .status-indicator {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.3);
  }

  .status-indicator.completed {
    background: rgba(52, 199, 89, 0.2);
    color: rgb(52, 199, 89);
  }

  .detail-title {
    color: rgba(255, 255, 255, 0.9);
  }

  .meta-item {
    color: rgba(255, 255, 255, 0.65);
  }

  .time-item {
    color: rgba(255, 255, 255, 0.7);
  }

  .detail-time {
    background: rgba(255, 255, 255, 0.04);
  }

  .detail-note {
    color: rgba(255, 255, 255, 0.65);
  }

  .detail-divider {
    background: rgba(255, 255, 255, 0.1);
  }

  .section-title {
    color: rgba(255, 255, 255, 0.8);
  }

  .comment-count {
    color: rgba(255, 255, 255, 0.5);
  }
}
</style>
