<template>
  <div class="changelog-admin-board">
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <Icon name="solar:danger-circle-linear" class="error-icon" />
      <p class="error-text">{{ error }}</p>
    </div>

    <div v-else-if="grouped.length === 0" class="empty-state">
      <Icon name="solar:document-text-linear" class="empty-icon" />
      <p class="empty-text">暂无更新记录</p>
    </div>

    <div v-else class="board-columns custom-scrollbar">
      <div
        v-for="group in grouped"
        :key="group.version"
        class="board-column"
      >
        <div class="column-header">
          <span class="column-version">v{{ group.version }}</span>
          <span class="column-count">{{ group.items.length }} 条</span>
        </div>
        <div class="column-date">{{ formatDate(group.releaseDate) }}</div>
        <div class="column-items custom-scrollbar">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="board-item"
          >
            <div class="item-badges">
              <span class="type-badge" :class="`type-${item.type}`">{{ typeLabel(item.type) }}</span>
              <span class="status-badge" :class="`status-${item.status}`">{{ statusLabel(item.status) }}</span>
            </div>
            <h4 class="item-title">{{ item.title }}</h4>
            <div class="item-footer">
              <span class="item-date">{{ formatDate(item.releaseDate) }}</span>
              <div class="item-actions">
                <button class="action-btn" title="编辑" @click="$emit('edit', item)">
                  <Icon name="solar:pen-linear" />
                </button>
                <button class="action-btn action-btn-danger" title="删除" @click="$emit('delete', item)">
                  <Icon name="solar:trash-bin-trash-linear" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Changelog } from '~/types/changelog'

const props = defineProps<{
  items: Changelog[]
  isLoading?: boolean
  error?: string | null
}>()

defineEmits<{
  edit: [item: Changelog]
  delete: [item: Changelog]
}>()

const grouped = computed(() => {
  const groups = new Map<string, Changelog[]>()

  for (const log of props.items) {
    if (!groups.has(log.version)) {
      groups.set(log.version, [])
    }
    groups.get(log.version)!.push(log)
  }

  return Array.from(groups.entries())
    .map(([version, items]) => ({
      version,
      releaseDate: items[0].releaseDate,
      items: items.sort((a, b) => a.type.localeCompare(b.type))
    }))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
})

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    feature: '新功能',
    fix: '修复',
    improvement: '改进',
    breaking: '重大变更'
  }
  return labels[type] || type
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    idea: '想法',
    planned: '待开发',
    in_progress: '开发中',
    published: '已发布'
  }
  return labels[status] || status
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.changelog-admin-board {
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
  width: 300px;
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
  gap: 10px;
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

.board-item {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  border: 0.5px solid rgba(0, 0, 0, 0.04);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.board-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.item-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  line-height: 1;
}

.type-badge.type-feature {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.type-badge.type-fix {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.type-badge.type-improvement {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.type-badge.type-breaking {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}

.status-badge.status-idea {
  background: rgba(175, 82, 222, 0.12);
  color: rgb(175, 82, 222);
}

.status-badge.status-planned {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.status-badge.status-in_progress {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.status-badge.status-published {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--liquid-text-primary);
  line-height: 1.4;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.item-date {
  font-size: 12px;
  color: var(--liquid-text-tertiary);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--liquid-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
}

.action-btn-danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
</style>
