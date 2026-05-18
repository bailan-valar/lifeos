<template>
  <AdminLayout>
    <div class="dashboard-page">
      <div class="page-header">
        <h1 class="page-title">仪表盘</h1>
        <p class="page-subtitle">系统概况和统计数据</p>
      </div>

      <!-- 统计卡片 -->
      <div v-if="stats" class="stats-grid">
        <StatCard
          icon="solar:users-group-rounded-linear"
          label="总用户数"
          :value="String(stats.totalUsers)"
          :target="`+${stats.newUsersToday} 今日`"
          icon-bg="rgba(0, 122, 255, 0.1)"
          icon-color="rgb(0, 122, 255)"
          chart-type="bar"
          :bar-color="'rgb(0, 122, 255)'"
        />

        <StatCard
          icon="solar:chat-square-linear"
          label="总反馈数"
          :value="String(stats.totalFeedbacks)"
          :target="`${stats.pendingFeedbacks} 待处理`"
          icon-bg="rgba(255, 149, 0, 0.1)"
          icon-color="rgb(255, 149, 0)"
          chart-type="ring"
          :ring-percent="feedbackCompletionRate"
          :ring-color="'rgb(255, 149, 0)'"
          ring-icon="solar:check-read-linear"
        />

        <StatCard
          icon="solar:document-text-linear"
          label="待处理反馈"
          :value="String(stats.pendingFeedbacks)"
          :target="'需要关注'"
          icon-bg="rgba(255, 59, 48, 0.1)"
          icon-color="rgb(255, 59, 48)"
          chart-type="bar"
          :bar-color="'rgb(255, 59, 48)'"
        />

        <StatCard
          icon="solar:clock-circle-linear"
          label="今日新增"
          :value="String(stats.newUsersToday)"
          :target="'新用户注册'"
          icon-bg="rgba(52, 199, 89, 0.1)"
          icon-color="rgb(52, 199, 89)"
          chart-type="ring"
          :ring-percent="userGrowthRate"
          :ring-color="'rgb(52, 199, 89)'"
          ring-icon="solar:graph-up-linear"
        />
      </div>

      <!-- 反馈分类统计 -->
      <div v-if="stats" class="section">
        <h2 class="section-title">反馈分类统计</h2>
        <div class="category-stats">
          <div
            v-for="item in stats.categoryStats"
            :key="item.category"
            class="category-item"
          >
            <span class="category-label">{{ getCategoryLabel(item.category) }}</span>
            <span class="category-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- 最近反馈 -->
      <div v-if="stats" class="section">
        <h2 class="section-title">最近反馈</h2>
        <div class="feedback-list">
          <div
            v-for="feedback in stats.recent.feedbacks.slice(0, 5)"
            :key="feedback.id"
            class="feedback-item"
          >
            <div class="feedback-header">
              <span class="feedback-user">{{ feedback.user.name || feedback.user.email }}</span>
              <span class="feedback-category">{{ getCategoryLabel(feedback.category) }}</span>
            </div>
            <p class="feedback-content">{{ feedback.content.substring(0, 100) }}...</p>
            <div class="feedback-footer">
              <span class="feedback-status" :class="`status-${feedback.status}`">
                {{ getStatusLabel(feedback.status) }}
              </span>
              <span class="feedback-time">{{ formatDate(feedback.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
// 页面中间件
definePageMeta({
  middleware: 'admin',
})

import AdminLayout from '~/components/admin/AdminLayout.vue'
import StatCard from '~/components/dashboard/StatCard.vue'

interface StatsData {
  totalUsers: number
  adminUsers: number
  newUsersToday: number
  activeUsers: number
  totalFeedbacks: number
  pendingFeedbacks: number
  categoryStats: Array<{ category: string; count: number }>
  statusStats: Array<{ status: string; count: number }>
  recent: {
    users: any[]
    feedbacks: any[]
  }
}

const stats = ref<StatsData | null>(null)
const isLoading = ref(true)

// 计算反馈完成率
const feedbackCompletionRate = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.totalFeedbacks
  const pending = stats.value.pendingFeedbacks
  return total > 0 ? Math.round(((total - pending) / total) * 100) : 100
})

// 计算用户增长率
const userGrowthRate = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.totalUsers
  const today = stats.value.newUsersToday
  return total > 0 ? Math.min(Math.round((today / total) * 100), 100) : 0
})

// 获取统计数据
const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch('/api/__admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    stats.value = (response as any).data
  } catch (error) {
    console.error('获取统计数据失败:', error)
  } finally {
    isLoading.value = false
  }
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
  } else {
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow:
    0 4px 30px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;
  transition: all 0.2s ease;
}

.category-item:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateY(-1px);
}

.category-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
}

.category-count {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03);
}

.feedback-item:hover {
  background: rgba(255, 255, 255, 0.75);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.feedback-user {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.feedback-category {
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.feedback-content {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
}

.feedback-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: rgba(60, 60, 67, 0.7);
}

.feedback-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .section {
    padding: 16px;
  }
}
</style>
