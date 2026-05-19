<template>
  <div class="changelog-list">
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <Icon name="solar:danger-circle-linear" class="error-icon" />
      <p class="error-text">{{ error }}</p>
      <button class="liquid-glass-button" @click="retry">重试</button>
    </div>

    <div v-else-if="groupedChangelogs.length === 0" class="empty-state">
      <Icon name="solar:document-text-linear" class="empty-icon" />
      <p class="empty-text">暂无更新日志</p>
    </div>

    <div v-else class="changelog-groups">
      <div
        v-for="group in groupedChangelogs"
        :key="group.version"
        class="changelog-group"
      >
        <div class="group-header">
          <span class="group-version">v{{ group.version }}</span>
          <span class="group-date">{{ formatDate(group.releaseDate) }}</span>
        </div>
        <div class="group-items">
          <ChangelogItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { groupedChangelogs, isLoading, error, fetchChangelogs } = useChangelog()

onMounted(() => {
  if (groupedChangelogs.value.length === 0) {
    fetchChangelogs()
  }
})

function retry() {
  fetchChangelogs()
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 16px;
  color: var(--liquid-text-secondary);
  font-size: 14px;
}

.error-icon,
.empty-icon {
  font-size: 48px;
  color: var(--liquid-text-tertiary);
  margin-bottom: 12px;
}

.error-text,
.empty-text {
  color: var(--liquid-text-secondary);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.changelog-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.changelog-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.group-version {
  font-size: 16px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.01em;
}

.group-date {
  font-size: 13px;
  color: var(--liquid-text-secondary);
}

.group-items {
  display: flex;
  flex-direction: column;
}
</style>
