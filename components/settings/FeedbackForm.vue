<template>
  <div class="feedback-list-container">
    <div class="feedback-list-header">
      <div class="header-text">
        <h3>我的反馈</h3>
        <p class="feedback-desc">查看您提交过的所有反馈记录</p>
      </div>
      <button class="submit-feedback-btn" @click="showModal = true">
        <Icon name="solar:pen-new-square-linear" />
        <span>提交反馈</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <Icon name="solar:widget-2-linear" class="spin-icon" />
      <span>加载中...</span>
    </div>

    <div v-else-if="userFeedbacks.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon name="solar:chat-square-linear" />
      </div>
      <p class="empty-title">暂无反馈记录</p>
      <p class="empty-desc">您的反馈对我们非常重要，点击上方按钮提交您的第一条反馈</p>
    </div>

    <div v-else class="feedback-list">
      <div
        v-for="item in userFeedbacks"
        :key="item.id"
        class="feedback-item"
      >
        <div class="feedback-item-header">
          <div class="feedback-meta">
            <span class="feedback-category">{{ getCategoryLabel(item.category) }}</span>
            <span
              class="feedback-status"
              :class="`status-${item.status}`"
            >
              {{ getStatusLabel(item.status) }}
            </span>
            <span class="feedback-date">{{ formatDate(item.createdAt) }}</span>
          </div>
          <div class="feedback-actions">
            <div v-if="item.rating" class="feedback-rating">
              <Icon
                v-for="star in 5"
                :key="star"
                :name="item.rating >= star ? 'solar:star-bold' : 'solar:star-linear'"
                class="rating-star"
                size="14"
              />
            </div>
            <button
              class="delete-btn"
              title="删除"
              @click="handleDelete(item.id)"
            >
              <Icon name="solar:trash-bin-trash-linear" size="14" />
            </button>
          </div>
        </div>
        <p class="feedback-content">{{ item.content }}</p>

        <!-- 旧版官方回复兼容 -->
        <div v-if="item.reply && !feedbackReplies[item.id]?.length" class="feedback-reply">
          <div class="reply-label">
            <Icon name="solar:reply-linear" size="14" />
            <span>官方回复</span>
            <span v-if="item.repliedAt" class="reply-date">{{ formatDate(item.repliedAt) }}</span>
          </div>
          <p class="reply-content">{{ item.reply }}</p>
        </div>

        <!-- 对话区域 -->
        <div class="conversation-wrapper">
          <button
            class="toggle-replies-btn"
            @click="toggleReplies(item.id)"
          >
            <Icon
              :name="expandedFeedbackId === item.id ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'"
              size="14"
            />
            <span v-if="expandedFeedbackId === item.id">收起对话</span>
            <span v-else>
              查看对话
              <template v-if="replyCounts[item.id] > 0">({{ replyCounts[item.id] }})</template>
            </span>
          </button>

          <div v-if="expandedFeedbackId === item.id" class="conversation-body">
            <div v-if="loadingReplies[item.id]" class="conversation-loading">
              <Icon name="solar:widget-2-linear" class="spin-icon" size="16" />
              <span>加载中...</span>
            </div>

            <div v-else-if="!feedbackReplies[item.id]?.length" class="conversation-empty">
              暂无回复，您可以继续补充说明
            </div>

            <div v-else class="conversation-list">
              <div
                v-for="reply in feedbackReplies[item.id]"
                :key="reply.id"
                :class="['conversation-bubble', reply.isAdmin ? 'admin' : 'user']"
              >
                <div class="bubble-avatar">
                  {{ reply.isAdmin
                    ? (reply.user?.name?.[0] || reply.user?.email?.[0] || 'A')
                    : (authStore.user?.name?.[0] || authStore.user?.email?.[0] || '我')
                  }}
                </div>
                <div class="bubble-main">
                  <div class="bubble-header">
                    <span class="bubble-author">
                      {{ reply.isAdmin ? (reply.user?.name || '官方') : '我' }}
                    </span>
                    <span class="bubble-time">{{ formatDate(reply.createdAt) }}</span>
                  </div>
                  <p class="bubble-text">{{ reply.content }}</p>
                </div>
              </div>
            </div>

            <!-- 回复输入 -->
            <div class="reply-input-area">
              <textarea
                v-model="replyInputs[item.id]"
                class="reply-textarea"
                placeholder="输入回复内容..."
                rows="2"
                maxlength="2000"
              />
              <div class="reply-input-footer">
                <span class="char-hint">{{ (replyInputs[item.id] || '').length }} / 2000</span>
                <button
                  class="send-reply-btn"
                  :disabled="!replyInputs[item.id]?.trim() || sendingReply[item.id]"
                  @click="sendReply(item.id)"
                >
                  <Icon v-if="sendingReply[item.id]" name="solar:widget-2-linear" class="spin-icon" size="14" />
                  <span>{{ sendingReply[item.id] ? '发送中...' : '发送回复' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <FeedbackSubmitModal
      v-model:visible="showModal"
      @submitted="loadFeedbacks"
    />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useConfirm } from '~/composables/useConfirm'
import FeedbackSubmitModal from './FeedbackSubmitModal.vue'

const authStore = useAuthStore()
const router = useRouter()
const { confirm } = useConfirm()

const categories = [
  { value: 'bug', label: 'Bug', icon: 'solar:danger-circle-linear' },
  { value: 'feature', label: '功能建议', icon: 'solar:star-linear' },
  { value: 'ui', label: '界面', icon: 'solar:monitor-linear' },
  { value: 'performance', label: '性能', icon: 'solar:bolt-linear' },
  { value: 'other', label: '其他', icon: 'solar:menu-dots-linear' },
]

const statusMap: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  rejected: '已驳回',
}

const loading = ref(true)
const userFeedbacks = ref<any[]>([])
const showModal = ref(false)

// 对话相关状态
const expandedFeedbackId = ref<string | null>(null)
const feedbackReplies = ref<Record<string, any[]>>({})
const loadingReplies = ref<Record<string, boolean>>({})
const replyInputs = ref<Record<string, string>>({})
const sendingReply = ref<Record<string, boolean>>({})
const replyCounts = ref<Record<string, number>>({})

onMounted(() => {
  if (!authStore.user) {
    router.push('/login')
    return
  }
  loadFeedbacks()
})

async function loadFeedbacks() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const response = await $fetch('/api/feedback', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response && typeof response === 'object' && 'success' in response && response.success) {
      userFeedbacks.value = (response as any).data || []
      // 预加载每条反馈的回复数量（可选优化）
      for (const fb of userFeedbacks.value) {
        loadReplyCount(fb.id)
      }
    }
  } catch (e) {
    console.warn('Failed to load feedbacks:', e)
  } finally {
    loading.value = false
  }
}

async function loadReplyCount(feedbackId: string) {
  try {
    const token = localStorage.getItem('token')
    if (!token) return
    const response = await $fetch(`/api/feedbacks/${feedbackId}/replies`, {
      headers: { Authorization: `Bearer ${token}` },
    }) as any
    const replies = response?.data || []
    replyCounts.value[feedbackId] = replies.length
    // 如果已经展开，同时缓存数据
    if (expandedFeedbackId.value === feedbackId) {
      feedbackReplies.value[feedbackId] = replies
    }
  } catch (e) {
    replyCounts.value[feedbackId] = 0
  }
}

async function toggleReplies(feedbackId: string) {
  if (expandedFeedbackId.value === feedbackId) {
    expandedFeedbackId.value = null
    return
  }
  expandedFeedbackId.value = feedbackId
  if (!feedbackReplies.value[feedbackId]) {
    loadingReplies.value[feedbackId] = true
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await $fetch(`/api/feedbacks/${feedbackId}/replies`, {
        headers: { Authorization: `Bearer ${token}` },
      }) as any
      feedbackReplies.value[feedbackId] = response?.data || []
      replyCounts.value[feedbackId] = feedbackReplies.value[feedbackId].length
    } catch (e) {
      console.warn('Failed to load replies:', e)
      feedbackReplies.value[feedbackId] = []
    } finally {
      loadingReplies.value[feedbackId] = false
    }
  }
}

async function sendReply(feedbackId: string) {
  const content = replyInputs.value[feedbackId]?.trim()
  if (!content) return

  sendingReply.value[feedbackId] = true
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const response = await $fetch(`/api/feedbacks/${feedbackId}/replies`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content },
    }) as any

    if (response?.data) {
      if (!feedbackReplies.value[feedbackId]) {
        feedbackReplies.value[feedbackId] = []
      }
      feedbackReplies.value[feedbackId].push(response.data)
      replyInputs.value[feedbackId] = ''
      replyCounts.value[feedbackId] = (replyCounts.value[feedbackId] || 0) + 1
    }
  } catch (e: any) {
    alert(e?.data?.message || '发送失败，请重试')
  } finally {
    sendingReply.value[feedbackId] = false
  }
}

async function handleDelete(id: string) {
  const ok = await confirm({
    title: '删除反馈',
    message: '确定要删除这条反馈吗？删除后无法恢复。',
    confirmText: '删除',
    cancelText: '取消',
    danger: true,
  })

  if (!ok) return

  try {
    const token = localStorage.getItem('token')
    if (!token) return

    await $fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    userFeedbacks.value = userFeedbacks.value.filter(f => f.id !== id)
  } catch (e: any) {
    console.warn('Failed to delete feedback:', e)
    alert(e?.data?.message || '删除失败，请重试')
  }
}

function getCategoryLabel(category: string): string {
  const cat = categories.find(c => c.value === category)
  return cat?.label || '其他'
}

function getStatusLabel(status: string): string {
  return statusMap[status] || '待处理'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.feedback-list-container {
  max-width: 680px;
}

.feedback-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.header-text h3 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.02em;
}

.feedback-desc {
  margin: 0;
  font-size: 14px;
  color: var(--liquid-text-secondary);
}

.submit-feedback-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: var(--liquid-radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.35);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.2s ease,
              background 0.2s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.submit-feedback-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
  pointer-events: none;
}

.submit-feedback-btn:hover {
  background: rgb(0, 110, 230);
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.45);
  transform: translateY(-1px);
}

.submit-feedback-btn:active {
  transform: scale(0.97);
  background: rgb(0, 100, 210);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: var(--liquid-text-tertiary);
  font-size: 14px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--liquid-text-tertiary);
  font-size: 28px;
  box-shadow: var(--liquid-shadow-light);
}

.empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.empty-desc {
  margin: 0;
  font-size: 14px;
  color: var(--liquid-text-secondary);
  max-width: 320px;
  line-height: 1.5;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-item {
  padding: 16px 18px;
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  background: var(--liquid-bg-thin);
  border: var(--liquid-border);
  border-radius: var(--liquid-radius);
  box-shadow: var(--liquid-shadow-light);
  position: relative;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.25s ease;
}

.feedback-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--liquid-refraction);
  pointer-events: none;
  z-index: 0;
}

.feedback-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--liquid-shadow);
}

.feedback-item-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.feedback-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.feedback-category {
  padding: 2px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.feedback-status {
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}

.status-processing {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.status-resolved {
  background: rgba(52, 199, 89, 0.1);
  color: rgb(52, 199, 89);
}

.status-rejected {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.feedback-date {
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.feedback-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-content {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--liquid-text-primary);
  word-break: break-word;
}

.feedback-rating {
  display: flex;
  gap: 2px;
}

.rating-star {
  color: #ff9500;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--liquid-text-tertiary);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.feedback-reply {
  position: relative;
  z-index: 1;
  margin-top: 12px;
  padding: 12px 14px;
  background: rgba(0, 122, 255, 0.05);
  border-left: 3px solid rgb(0, 122, 255);
  border-radius: 0 10px 10px 0;
}

.reply-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(0, 122, 255);
}

.reply-date {
  font-weight: 400;
  color: var(--liquid-text-tertiary);
  margin-left: 4px;
}

.reply-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--liquid-text-secondary);
  word-break: break-word;
}

/* 对话区域样式 */
.conversation-wrapper {
  position: relative;
  z-index: 1;
  margin-top: 10px;
}

.toggle-replies-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 122, 255, 0.08);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgb(0, 122, 255);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-replies-btn:hover {
  background: rgba(0, 122, 255, 0.15);
}

.conversation-body {
  margin-top: 12px;
  padding: 14px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.06);
}

.conversation-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--liquid-text-tertiary);
  font-size: 13px;
}

.conversation-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--liquid-text-tertiary);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  max-height: 320px;
  overflow-y: auto;
}

.conversation-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.conversation-bubble.user {
  flex-direction: row-reverse;
}

.bubble-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.conversation-bubble.admin .bubble-avatar {
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
}

.conversation-bubble.user .bubble-avatar {
  background: var(--liquid-bg-elevated);
  color: var(--liquid-text-secondary);
  border: var(--liquid-border);
}

.bubble-main {
  max-width: 75%;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.conversation-bubble.user .bubble-header {
  justify-content: flex-end;
}

.bubble-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--liquid-text-secondary);
}

.bubble-time {
  font-size: 11px;
  color: var(--liquid-text-tertiary);
}

.bubble-text {
  margin: 0;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 10px;
  word-break: break-word;
  white-space: pre-wrap;
}

.conversation-bubble.admin .bubble-text {
  background: rgba(0, 122, 255, 0.08);
  color: var(--liquid-text-primary);
  border-bottom-left-radius: 4px;
}

.conversation-bubble.user .bubble-text {
  background: var(--liquid-bg-elevated);
  color: var(--liquid-text-primary);
  border: var(--liquid-border);
  border-bottom-right-radius: 4px;
}

.reply-input-area {
  padding-top: 12px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.08);
}

.reply-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--liquid-text-primary);
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.reply-textarea:focus {
  border-color: rgba(0, 122, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.08);
}

.reply-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.char-hint {
  font-size: 11px;
  color: var(--liquid-text-tertiary);
}

.send-reply-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.send-reply-btn:hover:not(:disabled) {
  background: rgb(0, 110, 230);
}

.send-reply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .feedback-list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .submit-feedback-btn {
    justify-content: center;
  }

  .feedback-item-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .feedback-actions {
    width: 100%;
    justify-content: space-between;
  }

  .bubble-main {
    max-width: 80%;
  }
}
</style>
