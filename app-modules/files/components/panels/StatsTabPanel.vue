<template>
  <div class="stats-tab-panel">
    <div v-if="statistics" class="stats-content">
      <!-- 存储概览 -->
      <div class="stat-section">
        <div class="section-title">存储概览</div>
        <div class="storage-card">
          <div class="storage-info">
            <div class="storage-value">{{ formatFileSize(statistics.storageUsed) }}</div>
            <div class="storage-label">已使用空间</div>
          </div>

          <div class="storage-visual">
            <div class="progress-ring">
              <svg viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.1)"
                  stroke-width="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#gradient)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="dashOffset"
                  transform="rotate(-90 60 60)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="rgb(0, 122, 255)" />
                    <stop offset="100%" stop-color="rgb(88, 86, 214)" />
                  </linearGradient>
                </defs>
              </svg>
              <div class="progress-text">{{ storagePercentage }}%</div>
            </div>
          </div>

          <div class="storage-details">
            <div class="detail-item">
              <span class="detail-label">总容量</span>
              <span class="detail-value">{{ formatFileSize(statistics.storageLimit) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">可用空间</span>
              <span class="detail-value">{{ formatFileSize(statistics.storageLimit - statistics.storageUsed) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件统计 -->
      <div class="stat-section">
        <div class="section-title">文件统计</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon files">
              <Icon name="solar:file-linear" size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalFiles }}</div>
              <div class="stat-label">总文件数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon folders">
              <Icon name="solar:folder-linear" size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalFolders }}</div>
              <div class="stat-label">总文件夹数</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon size">
              <Icon name="solar:database-linear" size="24" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatFileSize(statistics.totalSize) }}</div>
              <div class="stat-label">总大小</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件类型分布 -->
      <div class="stat-section">
        <div class="section-title">文件类型分布</div>
        <div class="type-distribution">
          <div
            v-for="(count, type) in statistics.typeDistribution"
            :key="type"
            class="type-item"
          >
            <div class="type-icon">
              <Icon :name="getTypeIcon(type)" size="20" />
            </div>
            <div class="type-info">
              <div class="type-name">{{ getTypeName(type) }}</div>
              <div class="type-count">{{ count }} 个文件</div>
            </div>
            <div class="type-bar">
              <div
                class="type-bar-fill"
                :style="{ width: getTypePercentage(count) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="stat-section" v-if="statistics.recentActivity.length > 0">
        <div class="section-title">最近活动</div>
        <div class="activity-list">
          <div
            v-for="activity in statistics.recentActivity.slice(0, 10)"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              <Icon :name="getActivityIcon(activity.type)" size="18" />
            </div>
            <div class="activity-info">
              <div class="activity-text">{{ getActivityText(activity) }}</div>
              <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载统计信息...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileStatistics, FileActivity } from '~/types/file'
import { computed } from 'vue'

const props = defineProps<{
  statistics: FileStatistics | null
}>()

const circumference = 2 * Math.PI * 54 // 圆周长

const storagePercentage = computed(() => {
  if (!props.statistics) return 0
  return Math.min(
    Math.round((props.statistics.storageUsed / props.statistics.storageLimit) * 100),
    100
  )
})

const dashOffset = computed(() => {
  const progress = storagePercentage.value / 100
  return circumference * (1 - progress)
})

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'image': 'solar:gallery-linear',
    'video': 'solar:videocamera-linear',
    'audio': 'solar:music-linear',
    'document': 'solar:document-linear',
    'archive': 'solar:zip-file-linear',
    'other': 'solar:file-linear',
  }
  return iconMap[type] || iconMap['other']
}

function getTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    'image': '图片',
    'video': '视频',
    'audio': '音频',
    'document': '文档',
    'archive': '压缩包',
    'other': '其他',
  }
  return nameMap[type] || type
}

function getTypePercentage(count: number): number {
  if (!props.statistics || props.statistics.totalFiles === 0) return 0
  return Math.round((count / props.statistics.totalFiles) * 100)
}

function getActivityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'upload': 'solar:cloud-upload-linear',
    'delete': 'solar:trash-bin-trash-linear',
    'move': 'solar:folder-move-linear',
    'rename': 'solar:edit-linear',
    'download': 'solar:download-linear',
    'share': 'solar:share-linear',
  }
  return iconMap[type] || 'solar:file-linear'
}

function getActivityText(activity: FileActivity): string {
  const textMap: Record<string, string> = {
    'upload': `上传了 ${activity.fileName}`,
    'delete': `删除了 ${activity.fileName}`,
    'move': `移动了 ${activity.fileName}`,
    'rename': `重命名了 ${activity.fileName}`,
    'download': `下载了 ${activity.fileName}`,
    'share': `分享了 ${activity.fileName}`,
  }

  return textMap[activity.type] || activity.details || '未知操作'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.stats-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 24px;
}

.stats-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-section {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 16px;
}

.storage-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.storage-info {
  flex: 1;
}

.storage-value {
  font-size: 24px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
}

.storage-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.storage-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.storage-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.detail-label {
  color: rgba(0, 0, 0, 0.6);
}

.detail-value {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  color: white;
}

.stat-icon.files {
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
}

.stat-icon.folders {
  background: linear-gradient(135deg, rgb(52, 199, 89), rgb(48, 209, 88));
}

.stat-icon.size {
  background: linear-gradient(135deg, rgb(255, 149, 0), rgb(255, 159, 10));
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.type-distribution {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.6);
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.type-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.type-bar {
  width: 80px;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.type-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(0, 122, 255), rgb(88, 86, 214));
  transition: width 0.3s ease;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.5);
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 2px;
}

.activity-time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(0, 0, 0, 0.6);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
