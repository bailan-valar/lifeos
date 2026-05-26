<template>
  <div class="search-tab-panel">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <Icon name="solar:magnifer-linear" size="20" />
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索文件名、标签..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button
          v-if="searchKeyword"
          type="button"
          class="clear-btn"
          @click="clearSearch"
        >
          <Icon name="solar:close-circle-linear" size="16" />
        </button>
      </div>

      <button
        type="button"
        class="search-btn"
        :disabled="!searchKeyword || searching"
        @click="handleSearch"
      >
        <Icon name="solar:magnifer-linear" size="18" />
        <span v-if="!searching">搜索</span>
        <span v-else>搜索中...</span>
      </button>
    </div>

    <!-- 高级搜索选项 -->
    <div class="advanced-search">
      <div class="filter-section">
        <div class="filter-title">文件类型</div>
        <div class="filter-options">
          <label class="filter-option">
            <input
              v-model="filters.types"
              type="checkbox"
              value="image"
              @change="handleSearch"
            />
            <span>图片</span>
          </label>
          <label class="filter-option">
            <input
              v-model="filters.types"
              type="checkbox"
              value="video"
              @change="handleSearch"
            />
            <span>视频</span>
          </label>
          <label class="filter-option">
            <input
              v-model="filters.types"
              type="checkbox"
              value="document"
              @change="handleSearch"
            />
            <span>文档</span>
          </label>
          <label class="filter-option">
            <input
              v-model="filters.types"
              type="checkbox"
              value="audio"
              @change="handleSearch"
            />
            <span>音频</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-title">日期范围</div>
        <div class="date-range">
          <input
            v-model="filters.startDate"
            type="date"
            class="date-input"
            @change="handleSearch"
          />
          <span>至</span>
          <input
            v-model="filters.endDate"
            type="date"
            class="date-input"
            @change="handleSearch"
          />
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results">
      <!-- 搜索中状态 -->
      <div v-if="searching" class="search-loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在搜索...</div>
      </div>

      <!-- 搜索结果列表 -->
      <div v-else-if="searchResults.length > 0" class="results-list">
        <div class="results-header">
          <span>找到 {{ searchResults.length }} 个结果</span>
        </div>

        <div class="results-items">
          <div
            v-for="file in searchResults"
            :key="file.id"
            class="result-item"
            @click="$emit('open-file', file)"
          >
            <div class="item-icon">
              <Icon :name="getFileIcon(file)" size="32" />
            </div>

            <div class="item-info">
              <div class="item-name">{{ file.name }}</div>
              <div class="item-meta">
                <span>{{ formatFileSize(file.size) }}</span>
                <span>•</span>
                <span>{{ formatDate(file.createdAt) }}</span>
              </div>
            </div>

            <div class="item-tags" v-if="file.tags.length > 0">
              <span
                v-for="tag in file.tags.slice(0, 3)"
                :key="tag"
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="hasSearched" class="empty-state">
        <Icon name="solar:document-linear" size="48" />
        <div class="empty-title">未找到相关文件</div>
        <div class="empty-desc">尝试调整搜索条件或使用其他关键词</div>
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <Icon name="solar:magnifer-linear" size="48" />
        <div class="initial-title">搜索文件</div>
        <div class="initial-desc">输入关键词或使用过滤器查找文件</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { File, FileSearchCriteria } from '~/types/file'
import { ref, reactive } from 'vue'

const props = defineProps<{
  searchResults: File[]
  searching: boolean
}>()

const emit = defineEmits<{
  (e: 'search', criteria: FileSearchCriteria): void
  (e: 'open-file', file: File): void
}>()

const searchKeyword = ref('')
const hasSearched = ref(false)
const filters = reactive({
  types: [] as string[],
  startDate: '',
  endDate: '',
})

function handleSearch() {
  if (!searchKeyword.value && filters.types.length === 0) {
    return
  }

  hasSearched.value = true

  const criteria: FileSearchCriteria = {
    keyword: searchKeyword.value,
    type: filters.types as any,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }

  emit('search', criteria)
}

function clearSearch() {
  searchKeyword.value = ''
  hasSearched.value = false
}

function getFileIcon(file: File): string {
  const iconMap: Record<string, string> = {
    'image': 'solar:gallery-linear',
    'video': 'solar:videocamera-linear',
    'audio': 'solar:music-linear',
    'document': 'solar:document-linear',
    'archive': 'solar:zip-file-linear',
    'other': 'solar:file-linear',
  }
  return iconMap[file.type] || iconMap['other']
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.search-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.search-input-wrapper:focus-within {
  border-color: rgb(0, 122, 255);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-input-wrapper svg {
  color: rgba(0, 0, 0, 0.4);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.6);
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  height: 44px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  background: rgb(0, 98, 218);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.advanced-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  margin-bottom: 16px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  background: white;
}

.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.search-loading {
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

.results-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.results-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.results-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-item:hover {
  background: white;
  border-color: rgba(0, 122, 255, 0.3);
  transform: translateX(2px);
}

.item-icon {
  margin-right: 12px;
  color: rgba(0, 0, 0, 0.5);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.tag {
  padding: 2px 8px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.empty-state,
.initial-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.4);
  padding: 40px;
}

.empty-state svg,
.initial-state svg {
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title,
.initial-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-desc,
.initial-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
}
</style>
