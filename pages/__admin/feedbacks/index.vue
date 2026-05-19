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

      <!-- 反馈表格 -->
      <div v-if="!isLoading && feedbacks" class="feedbacks-table-container">
        <table class="feedbacks-table">
          <thead>
            <tr>
              <th class="col-user">用户</th>
              <th class="col-content">反馈内容</th>
              <th class="col-category">分类</th>
              <th class="col-status">状态</th>
              <th class="col-rating">评分</th>
              <th class="col-time">时间</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="feedback in feedbacks"
              :key="feedback.id"
              class="feedback-row"
              :class="`status-${feedback.status}`"
            >
              <td class="col-user">
                <div class="user-cell">
                  <div class="user-avatar">
                    {{ feedback.user.name?.charAt(0)?.toUpperCase() || feedback.user.email.charAt(0).toUpperCase() }}
                  </div>
                  <div class="user-info">
                    <div class="user-name">{{ feedback.user.name || '未设置名称' }}</div>
                    <div class="user-email">{{ feedback.user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="col-content">
                <div class="content-cell">
                  <p class="content-text">{{ feedback.content }}</p>
                  <div v-if="feedback.adminReply" class="has-reply-badge">
                    <Icon name="solar:reply-bold" />
                    已回复
                  </div>
                </div>
              </td>
              <td class="col-category">
                <span class="category-badge" :class="`category-${feedback.category}`">
                  {{ getCategoryLabel(feedback.category) }}
                </span>
              </td>
              <td class="col-status">
                <span class="status-badge" :class="`status-${feedback.status}`">
                  {{ getStatusLabel(feedback.status) }}
                </span>
              </td>
              <td class="col-rating">
                <div v-if="feedback.rating" class="rating-cell">
                  <Icon
                    v-for="i in 5"
                    :key="i"
                    :name="i <= (feedback.rating || 0) ? 'solar:star-bold' : 'solar:star-linear'"
                    :class="{ active: i <= (feedback.rating || 0) }"
                  />
                </div>
                <span v-else class="no-rating">-</span>
              </td>
              <td class="col-time">
                <span class="time-cell">{{ formatDate(feedback.createdAt) }}</span>
              </td>
              <td class="col-actions">
                <div class="actions-cell">
                  <button class="icon-btn" @click="viewFeedback(feedback.id)" title="查看详情">
                    <Icon name="solar:eye-linear" />
                  </button>
                  <button class="icon-btn primary" @click="handleFeedback(feedback)" :title="feedback.adminReply ? '编辑回复' : '回复'">
                    <Icon name="solar:chat-square-linear" />
                  </button>
                  <button class="icon-btn danger" @click="deleteFeedback(feedback)" title="删除">
                    <Icon name="solar:trash-bin-minimalistic-linear" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
  const feedback = feedbacks.value.find(f => f.id === feedbackId)
  if (feedback) {
    selectedFeedback.value = feedback
  }
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

.feedbacks-table-container {
  overflow-x: auto;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  -webkit-backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--liquid-radius);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.feedbacks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.feedbacks-table thead {
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
}

.feedbacks-table th {
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.feedbacks-table th.col-user {
  width: 180px;
}

.feedbacks-table th.col-content {
  min-width: 300px;
}

.feedbacks-table th.col-category {
  width: 100px;
}

.feedbacks-table th.col-status {
  width: 100px;
}

.feedbacks-table th.col-rating {
  width: 120px;
}

.feedbacks-table th.col-time {
  width: 120px;
}

.feedbacks-table th.col-actions {
  width: 140px;
  text-align: center;
}

.feedbacks-table tbody {
  background: transparent;
}

.feedback-row {
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
  transition: background 0.2s ease;
}

.feedback-row:last-child {
  border-bottom: none;
}

.feedback-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.feedback-row.status-pending {
  border-left: 2px solid rgb(255, 149, 0);
}

.feedback-row.status-in_progress {
  border-left: 2px solid rgb(0, 122, 255);
}

.feedback-row.status-resolved {
  border-left: 2px solid rgb(52, 199, 89);
}

.feedback-row.status-closed {
  border-left: 2px solid rgba(60, 60, 67, 0.3);
}

.feedback-row td {
  padding: 14px 16px;
  vertical-align: middle;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(0, 122, 255, 0.25);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-cell {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.content-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.75);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  flex: 1;
}

.has-reply-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.has-reply-badge .icon {
  font-size: 12px;
}

.category-badge,
.status-badge {
  display: inline-block;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  white-space: nowrap;
}

.category-badge {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.status-badge {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.status-badge.status-pending {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}

.status-badge.status-in_progress {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.status-badge.status-resolved {
  background: rgba(52, 199, 89, 0.1);
  color: rgb(52, 199, 89);
}

.status-badge.status-closed {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.5);
}

.rating-cell {
  display: flex;
  gap: 2px;
}

.rating-cell .icon {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.15);
}

.rating-cell .icon.active {
  color: rgb(255, 204, 0);
}

.no-rating {
  color: rgba(0, 0, 0, 0.3);
  font-size: 13px;
}

.time-cell {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.actions-cell {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-btn.primary {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.2);
}

.icon-btn.primary:hover {
  background: rgba(0, 122, 255, 0.18);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

.icon-btn.danger {
  background: rgba(255, 59, 48, 0.08);
  color: rgb(255, 59, 48);
  border-color: rgba(255, 59, 48, 0.2);
}

.icon-btn.danger:hover {
  background: rgba(255, 59, 48, 0.12);
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

@media (max-width: 1024px) {
  .feedbacks-table-container {
    border-radius: var(--liquid-radius);
  }

  .feedbacks-table th.col-content {
    min-width: 250px;
  }
}

@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
  }

  .feedbacks-table {
    font-size: 13px;
  }

  .feedbacks-table th,
  .feedback-row td {
    padding: 12px 10px;
  }

  .feedbacks-table th.col-user,
  .feedbacks-table th.col-content {
    width: auto;
    min-width: 150px;
  }

  .feedbacks-table th.col-category,
  .feedbacks-table th.col-status,
  .feedbacks-table th.col-rating,
  .feedbacks-table th.col-time,
  .feedbacks-table th.col-actions {
    width: 80px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .user-name {
    font-size: 13px;
  }

  .user-email {
    font-size: 11px;
  }

  .content-text {
    font-size: 13px;
    -webkit-line-clamp: 2;
  }

  .has-reply-badge {
    font-size: 10px;
    padding: 3px 6px;
  }

  .category-badge,
  .status-badge {
    font-size: 11px;
    padding: 4px 8px;
  }

  .rating-cell .icon {
    font-size: 12px;
  }

  .time-cell {
    font-size: 12px;
  }

  .icon-btn {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }

  .feedbacks-table th,
  .feedback-row td {
    padding: 10px 8px;
  }

  .feedbacks-table th.col-content,
  .feedbacks-table th.col-user {
    min-width: 120px;
  }

  .content-text {
    -webkit-line-clamp: 1;
  }
}
</style>
