<template>
  <AdminLayout>
    <div v-if="isLoading" class="loading-state">
      <Icon name="solar:refresh-linear" class="loading-icon" />
      <p>加载中...</p>
    </div>

    <div v-else-if="user" class="user-detail-page">
      <!-- 返回按钮 -->
      <button class="back-btn" @click="goBack">
        <Icon name="solar:alt-arrow-left-linear" />
        返回用户列表
      </button>

      <!-- 用户基本信息卡片 -->
      <div class="info-card">
        <div class="user-header">
          <div class="user-avatar-large">
            {{ user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() }}
          </div>
          <div class="user-header-info">
            <h1 class="user-name">{{ user.name || '未设置名称' }}</h1>
            <p class="user-email">{{ user.email }}</p>
            <span class="user-role-badge" :class="`role-${user.role}`">
              {{ user.role === 'admin' ? '管理员' : '普通用户' }}
            </span>
          </div>
          <div class="user-header-actions">
            <button class="action-btn" @click="editUser">
              <Icon name="solar:pen-linear" />
              编辑
            </button>
            <button class="action-btn danger" @click="resetPassword">
              <Icon name="solar:lock-keyhole-linear" />
              重置密码
            </button>
          </div>
        </div>

        <div class="user-meta-grid">
          <div class="meta-item">
            <Icon name="solar:calendar-linear" class="meta-icon" />
            <div class="meta-content">
              <span class="meta-label">注册时间</span>
              <span class="meta-value">{{ formatDate(user.createdAt) }}</span>
            </div>
          </div>
          <div class="meta-item">
            <Icon name="solar:clock-circle-linear" class="meta-icon" />
            <div class="meta-content">
              <span class="meta-label">最后更新</span>
              <span class="meta-value">{{ formatDate(user.updatedAt) }}</span>
            </div>
          </div>
          <div class="meta-item">
            <Icon name="solar:document-text-linear" class="meta-icon" />
            <div class="meta-content">
              <span class="meta-label">反馈数量</span>
              <span class="meta-value">{{ user._count.feedbacks }} 条</span>
            </div>
          </div>
          <div class="meta-item">
            <Icon name="solar:login-linear" class="meta-icon" />
            <div class="meta-content">
              <span class="meta-label">活跃会话</span>
              <span class="meta-value">{{ user._count.sessions }} 个</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近反馈 -->
      <div v-if="user.recentFeedbacks && user.recentFeedbacks.length > 0" class="feedbacks-section">
        <h2 class="section-title">最近反馈</h2>
        <div class="feedbacks-list">
          <div
            v-for="feedback in user.recentFeedbacks"
            :key="feedback.id"
            class="feedback-item"
            @click="viewFeedback(feedback.id)"
          >
            <div class="feedback-header">
              <span class="feedback-category">{{ feedback.category }}</span>
              <span class="feedback-status" :class="`status-${feedback.status}`">
                {{ getStatusText(feedback.status) }}
              </span>
              <span class="feedback-rating" v-if="feedback.rating">
                <Icon
                  v-for="i in 5"
                  :key="i"
                  name="solar:star-linear"
                  :class="{ filled: i <= feedback.rating! }"
                />
              </span>
            </div>
            <p class="feedback-content">{{ feedback.content }}</p>
            <span class="feedback-date">{{ formatDate(feedback.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-feedbacks">
        <Icon name="solar:document-linear" class="empty-icon" />
        <p>该用户暂无反馈记录</p>
      </div>
    </div>

    <!-- 用户编辑弹窗 -->
    <UserEditDialog
      v-if="editingUser"
      :user="editingUser"
      @close="editingUser = null"
      @saved="handleUserSaved"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
// 页面中间件
definePageMeta({
  middleware: 'admin',
})

import AdminLayout from '~/components/admin/AdminLayout.vue'
import UserEditDialog from '~/components/admin/UserEditDialog.vue'

const route = useRoute()
const router = useRouter()

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  updatedAt: string
  _count: {
    feedbacks: number
    sessions: number
  }
  recentFeedbacks: Array<{
    id: string
    content: string
    category: string
    rating: number | null
    status: string
    createdAt: string
  }>
}

const user = ref<User | null>(null)
const isLoading = ref(true)
const editingUser = ref<User | null>(null)

// 获取用户详情
const fetchUserDetail = async () => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch(`/api/__admin/users/${route.params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    user.value = (response as any).data.user
  } catch (error) {
    console.error('获取用户详情失败:', error)
    alert('获取用户详情失败')
    goBack()
  } finally {
    isLoading.value = false
  }
}

// 返回上一页
const goBack = () => {
  router.push('/__admin/users')
}

// 编辑用户
const editUser = () => {
  if (user.value) {
    editingUser.value = user.value
  }
}

// 重置密码
const resetPassword = async () => {
  if (!user.value) return

  if (!confirm(`确定要重置用户 ${user.value.email} 的密码吗？`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch(`/api/__admin/users/${user.value.id}/password-reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    alert(`密码已重置：${(response as any).data.newPassword}`)
  } catch (error: any) {
    alert(`重置密码失败: ${error.message}`)
  }
}

// 查看反馈详情
const viewFeedback = (feedbackId: string) => {
  router.push(`/__admin/feedbacks/${feedbackId}`)
}

// 用户保存后刷新
const handleUserSaved = () => {
  editingUser.value = null
  fetchUserDetail()
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchUserDetail()
})
</script>

<style scoped>
.user-detail-page {
  max-width: 1000px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(-2px);
  color: rgba(0, 0, 0, 0.85);
}

.info-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.user-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 32px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  margin-bottom: 24px;
}

.user-avatar-large {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  font-size: 36px;
  font-weight: 700;
  border-radius: 24px;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
}

.user-header-info {
  flex: 1;
}

.user-name {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.user-email {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.user-role-badge {
  display: inline-block;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
}

.role-admin {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.role-user {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.user-header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  color: rgba(0, 0, 0, 0.85);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.user-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.meta-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 20px;
  border-radius: 10px;
  flex-shrink: 0;
}

.meta-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.meta-value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.feedbacks-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.section-title {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.feedbacks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 20px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.feedback-item:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.feedback-category {
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.feedback-status {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
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
  background: rgba(48, 209, 88, 0.1);
  color: rgb(48, 209, 88);
}

.status-closed {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.feedback-rating {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.feedback-rating :deep(.icon) {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.2);
}

.feedback-rating :deep(.icon.filled) {
  color: rgb(255, 204, 0);
}

.feedback-content {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feedback-date {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.empty-feedbacks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  color: rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
}

.empty-feedbacks p {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
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

.loading-state p {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

@media (max-width: 768px) {
  .user-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .user-header-actions {
    width: 100%;
    justify-content: center;
  }

  .user-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
