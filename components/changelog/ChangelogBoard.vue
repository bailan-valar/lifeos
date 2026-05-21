<template>
  <div class="changelog-board">
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

    <div v-else class="board-columns custom-scrollbar">
      <div
        v-for="group in groupedChangelogs"
        :key="group.version"
        class="board-column"
      >
        <div class="column-header">
          <span class="column-version">v{{ group.version }}</span>
          <span class="column-count">{{ group.items.length }} 条</span>
        </div>
        <div class="column-date">{{ formatDate(group.releaseDate) }}</div>
        <div class="column-items">
          <ChangelogItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            compact
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
.changelog-board {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.board-columns {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  height: 100%;
  align-items: flex-start;
}

.board-columns::-webkit-scrollbar {
  height: 6px;
}

.board-columns::-webkit-scrollbar-track {
  background: transparent;
}

.board-columns::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.board-columns::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.board-column {
  flex-shrink: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  max-height: 100%;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 4px;
}

.column-version {
  font-size: 15px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.01em;
}

.column-count {
  font-size: 12px;
  font-weight: 500;
  color: var(--liquid-text-tertiary);
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
}

.column-date {
  font-size: 12px;
  color: var(--liquid-text-tertiary);
  padding: 0 14px 10px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.column-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  overflow-y: auto;
  flex: 1;
}

.column-items::-webkit-scrollbar {
  width: 4px;
}

.column-items::-webkit-scrollbar-track {
  background: transparent;
}

.column-items::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}
</style>
