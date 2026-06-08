<template>
  <div class="comment-list">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="comments.length === 0" class="empty-state">
      <Icon :name="ICONS.info || 'solar:info-circle-linear'" :size="32" class="empty-icon" />
      <p>暂无评论</p>
    </div>

    <!-- 评论列表 -->
    <div v-else class="comments">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="comment-item"
      >
        <div class="comment-avatar">
          <Icon :name="ICONS.usersGroupRounded || 'solar:users-group-rounded-linear'" :size="18" />
        </div>
        <div class="comment-content">
          <p class="comment-text">{{ comment.content }}</p>
          <div class="comment-meta">
            <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
            <button
              class="comment-delete"
              title="删除评论"
              @click="handleDelete(comment)"
            >
              <Icon :name="SOLAR_ICONS.action.delete || 'solar:trash-bin-trash-linear'" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useConfirm } from '~/composables/useConfirm'
import type { TodoComment } from '~/types/todo'

interface Props {
  comments: TodoComment[]
  loading?: boolean
}

interface Emits {
  (e: 'delete', comment: TodoComment): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()
const { confirm } = useConfirm()

// 删除评论
const handleDelete = async (comment: TodoComment) => {
  const ok = await confirm({
    message: '确定要删除这条评论吗？',
    confirmText: '删除',
    danger: true
  })
  if (!ok) return

  emit('delete', comment)
}

// 格式化时间
const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 80px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(60, 60, 67, 0.1);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
  text-align: center;
  color: rgba(60, 60, 67, 0.4);
}

.empty-icon {
  color: rgba(60, 60, 67, 0.25);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.comments {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  gap: 10px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border-radius: 8px;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-text {
  margin: 0;
  padding: 10px 14px;
  background: rgba(60, 60, 67, 0.04);
  border-radius: 0 12px 12px 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  color: rgba(60, 60, 67, 0.85);
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}

.comment-time {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.4);
}

.comment-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(60, 60, 67, 0.3);
  cursor: pointer;
  transition: all 0.15s ease;
}

.comment-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: rgb(239, 68, 68);
}

@media (prefers-color-scheme: dark) {
  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: rgb(0, 122, 255);
  }

  .empty-state {
    color: rgba(255, 255, 255, 0.4);
  }

  .empty-icon {
    color: rgba(255, 255, 255, 0.25);
  }

  .comment-text {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.85);
  }

  .comment-time {
    color: rgba(255, 255, 255, 0.4);
  }

  .comment-delete {
    color: rgba(255, 255, 255, 0.3);
  }

  .comment-delete:hover {
    background: rgba(248, 113, 113, 0.15);
    color: rgb(248, 113, 113);
  }
}
</style>
