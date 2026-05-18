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
        <div v-if="item.reply" class="feedback-reply">
          <div class="reply-label">
            <Icon name="solar:reply-linear" size="14" />
            <span>官方回复</span>
            <span v-if="item.repliedAt" class="reply-date">{{ formatDate(item.repliedAt) }}</span>
          </div>
          <p class="reply-content">{{ item.reply }}</p>
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
    }
  } catch (e) {
    console.warn('Failed to load feedbacks:', e)
  } finally {
    loading.value = false
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
}
</style>
