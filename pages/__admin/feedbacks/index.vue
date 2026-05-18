<template>
  <AdminLayout>
    <div class="feedbacks-page">
      <div class="page-header">
        <h1 class="page-title">反馈管理</h1>
        <p class="page-subtitle">查看和处理用户反馈</p>
      </div>

      <!-- 搜索和筛选 -->
      <div class="filters-bar">
        <div class="search-box">
          <Icon name="solar:magnifer-linear" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索反馈内容或用户邮箱..."
            class="search-input"
            @input="handleSearch"
          />
        </div>

        <select v-model="statusFilter" class="status-filter" @change="handleSearch">
          <option value="">所有状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">处理中</option>
          <option value="resolved">已解决</option>
          <option value="closed">已关闭</option>
        </select>

        <select v-model="categoryFilter" class="category-filter" @change="handleSearch">
          <option value="">所有分类</option>
          <option value="bug">Bug</option>
          <option value="feature">功能建议</option>
          <option value="ui">界面优化</option>
          <option value="performance">性能问题</option>
          <option value="other">其他</option>
        </select>
      </div>

      <!-- 反馈列表 -->
      <div v-if="!isLoading && feedbacks" class="feedbacks-list">
        <div
          v-for="feedback in feedbacks"
          :key="feedback.id"
          class="feedback-item"
          :class="`status-${feedback.status}`"
        >
          <div class="feedback-header">
            <div class="feedback-user">
              <div class="user-avatar">
                {{ feedback.user.name?.charAt(0)?.toUpperCase() || feedback.user.email.charAt(0).toUpperCase() }}
              </div>
              <div class="user-info">
                <div class="user-name">{{ feedback.user.name || '未设置名称' }}</div>
                <div class="user-email">{{ feedback.user.email }}</div>
              </div>
            </div>

            <div class="feedback-meta">
              <span class="feedback-category" :class="`category-${feedback.category}`">
                {{ getCategoryLabel(feedback.category) }}
              </span>
              <span class="feedback-status" :class="`status-${feedback.status}`">
                {{ getStatusLabel(feedback.status) }}
              </span>
            </div>
          </div>

          <div class="feedback-content">
            <p>{{ feedback.content }}</p>
            <div v-if="feedback.rating" class="feedback-rating">
              <Icon
                v-for="i in 5"
                :key="i"
                :name="i <= (feedback.rating || 0) ? 'solar:star-bold' : 'solar:star-linear'"
                :class="{ active: i <= (feedback.rating || 0) }"
              />
            </div>
          </div>

          <div v-if="feedback.adminReply" class="feedback-reply">
            <div class="reply-header">
              <Icon name="solar:reply-linear" class="reply-icon" />
              <span class="reply-label">管理员回复</span>
              <span v-if="feedback.replier" class="replier-name">
                - {{ feedback.replier.name || feedback.replier.email }}
              </span>
            </div>
            <p class="reply-content">{{ feedback.adminReply }}</p>
            <span v-if="feedback.repliedAt" class="reply-time">
              {{ formatDate(feedback.repliedAt) }}
            </span>
          </div>

          <div class="feedback-footer">
            <span class="feedback-time">{{ formatDate(feedback.createdAt) }}</span>
            <div class="feedback-actions">
              <button class="action-btn" @click="viewFeedback(feedback.id)">
                <Icon name="solar:eye-linear" />
                查看详情
              </button>
              <button class="action-btn primary" @click="handleFeedback(feedback)">
                <Icon name="solar:chat-square-linear" />
                {{ feedback.adminReply ? '编辑回复' : '回复' }}
              </button>
              <button class="action-btn danger" @click="deleteFeedback(feedback)">
                <Icon name="solar:trash-bin-minimalistic-linear" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <Icon name="solar:refresh-linear" class="loading-icon" />
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && (!feedbacks || feedbacks.length === 0)" class="empty-state">
        <Icon name="solar:chat-square-linear" class="empty-icon" />
        <p>没有找到反馈</p>
      </div>

      <!-- 分页 -->
      <div v-if="pagination && pagination.totalPages > 1" class="pagination">
        <button
          class="pagination-btn"
          :disabled="pagination.page === 1"
          @click="changePage(pagination.page - 1)"
        >
          上一页
        </button>
        <span class="pagination-info">
          第 {{ pagination.page }} / {{ pagination.totalPages }} 页
        </span>
        <button
          class="pagination-btn"
          :disabled="pagination.page === pagination.totalPages"
          @click="changePage(pagination.page + 1)"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 反馈详情/回复弹窗 -->
    <FeedbackDetailDialog
      v-if="selectedFeedback"
      :feedback="selectedFeedback"
      @close="selectedFeedback = null"
      @saved="handleFeedbackSaved"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
// 页面中间件
definePageMeta({
  middleware: 'admin',
})

import AdminLayout from '~/components/admin/AdminLayout.vue'
import FeedbackDetailDialog from '~/components/admin/FeedbackDetailDialog.vue'

interface Feedback {
  id: string
  content: string
  category: string
  rating: number | null
  status: string
  adminReply: string | null
  repliedAt: string | null
  repliedBy: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  replier: {
    id: string
    email: string
    name: string | null
  } | null
}

const feedbacks = ref<Feedback[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const selectedFeedback = ref<Feedback | null>(null)

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
})

let searchTimeout: NodeJS.Timeout | null = null

// 获取反馈列表
const fetchFeedbacks = async () => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const params = new URLSearchParams({
      page: String(pagination.value.page),
      limit: String(pagination.value.limit),
    })

    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    if (statusFilter.value) {
      params.append('status', statusFilter.value)
    }

    if (categoryFilter.value) {
      params.append('category', categoryFilter.value)
    }

    const response = await $fetch(`/api/__admin/feedbacks?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = (response as any).data
    feedbacks.value = data.feedbacks
    pagination.value = data.pagination
  } catch (error) {
    console.error('获取反馈列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchFeedbacks()
  }, 300)
}

// 更改页面
const changePage = (page: number) => {
  pagination.value.page = page
  fetchFeedbacks()
}

// 查看反馈详情
const viewFeedback = (feedbackId: string) => {
  // 可以跳转到详情页面或打开弹窗
  navigateTo(`/__admin/feedbacks/${feedbackId}`)
}

// 处理反馈
const handleFeedback = (feedback: Feedback) => {
  selectedFeedback.value = feedback
}

// 删除反馈
const deleteFeedback = async (feedback: Feedback) => {
  if (!confirm(`确定要删除这条反馈吗？此操作不可撤销。`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    await $fetch(`/api/__admin/feedbacks/${feedback.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // 刷新列表
    fetchFeedbacks()
  } catch (error: any) {
    alert(`删除失败: ${error.message}`)
  }
}

// 反馈保存后刷新列表
const handleFeedbackSaved = () => {
  selectedFeedback.value = null
  fetchFeedbacks()
}

// 获取分类标签
const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    bug: 'Bug',
    feature: '功能建议',
    ui: '界面优化',
    performance: '性能问题',
    other: '其他',
  }
  return labels[category] || category
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  }
  return labels[status] || status
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} 分钟前`
  } else if (hours < 24) {
    return `${hours} 小时前`
  } else if (hours < 24 * 7) {
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}

onMounted(() => {
  fetchFeedbacks()
})
</script>

<style scoped>
.feedbacks-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 14px 12px 44px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04),
              0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 122, 255, 0.3);
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.status-filter,
.category-filter {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.status-filter:hover,
.category-filter:hover {
  background: rgba(255, 255, 255, 0.75);
}

.status-filter:focus,
.category-filter:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04),
              0 0 0 3px rgba(0, 122, 255, 0.1);
}

.feedbacks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.feedback-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.feedback-item.status-pending {
  border-left: 3px solid rgb(255, 149, 0);
}

.feedback-item.status-in_progress {
  border-left: 3px solid rgb(0, 122, 255);
}

.feedback-item.status-resolved {
  border-left: 3px solid rgb(52, 199, 89);
}

.feedback-item.status-closed {
  border-left: 3px solid rgba(60, 60, 67, 0.3);
}

.feedback-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.feedback-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.user-email {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.feedback-meta {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.feedback-category,
.feedback-status {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  white-space: nowrap;
}

.feedback-category {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.feedback-status {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.status-pending {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}

.status-in_progress {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.status-resolved {
  background: rgba(52, 199, 89, 0.1);
  color: rgb(52, 199, 89);
}

.status-closed {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.5);
}

.feedback-content {
  margin-bottom: 16px;
}

.feedback-content p {
  margin: 0 0 12px 0;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
  word-break: break-word;
}

.feedback-rating {
  display: flex;
  gap: 4px;
}

.feedback-rating .icon {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.15);
}

.feedback-rating .icon.active {
  color: rgb(255, 204, 0);
}

.feedback-reply {
  padding: 14px;
  background: rgba(0, 122, 255, 0.06);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  border-radius: 14px;
  margin-bottom: 16px;
  box-shadow: inset 0 1px 3px rgba(0, 122, 255, 0.08);
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.reply-icon {
  font-size: 16px;
  color: rgb(0, 122, 255);
}

.reply-label {
  font-size: 13px;
  font-weight: 600;
  color: rgb(0, 122, 255);
}

.replier-name {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
}

.reply-content {
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.7);
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.feedback-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}

.feedback-time {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
}

.feedback-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.action-btn.primary {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.25);
}

.action-btn.primary:hover {
  background: rgba(0, 122, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

.action-btn.danger {
  background: rgba(255, 59, 48, 0.08);
  color: rgb(255, 59, 48);
  border-color: rgba(255, 59, 48, 0.2);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.15);
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.2);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-icon {
  font-size: 48px;
  color: rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
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

.empty-icon {
  font-size: 64px;
  color: rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
}

.loading-state p,
.empty-state p {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.7);
  color: rgba(0, 0, 0, 0.85);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
  }

  .feedback-header {
    flex-direction: column;
    gap: 12px;
  }

  .feedback-meta {
    width: 100%;
    justify-content: flex-start;
  }

  .feedback-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .feedback-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 100px;
  }
}
</style>
