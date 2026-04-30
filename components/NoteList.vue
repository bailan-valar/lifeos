<template>
  <div class="note-list">
    <div class="note-list-header">
      <h3>笔记</h3>
      <button class="add-note-btn" @click="$emit('create')">
        <Icon name="solar:add-circle-linear" />
      </button>
    </div>

    <div class="search-box">
      <Icon name="solar:magnifer-linear" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索笔记..."
        class="search-input"
      />
    </div>

    <div class="note-items">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: activeNoteId === note.id }"
        @click="$emit('select', note.id)"
      >
        <div class="note-title">{{ note.title || '无标题' }}</div>
        <div class="note-meta">
          <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
          <span v-if="!note.synced" class="sync-indicator">
            <Icon name="solar:cloud-linear" />
          </span>
        </div>
      </div>

      <div v-if="filteredNotes.length === 0" class="empty-state">
        <p>{{ searchQuery ? '没有找到匹配的笔记' : '暂无笔记' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/types/block'

interface Props {
  notes: Note[]
  activeNoteId: string | null
}

interface Emits {
  (e: 'select', id: string): void
  (e: 'create'): void
}

withDefaults(defineProps<Props>(), {
  activeNoteId: null
})

defineEmits<Emits>()

const searchQuery = ref('')

const filteredNotes = computed(() => {
  if (!searchQuery.value) {
    return notes.value
  }

  const query = searchQuery.value.toLowerCase()
  return notes.value.filter(note =>
    note.title.toLowerCase().includes(query)
  )
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.note-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}

.note-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.note-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.add-note-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgb(0, 122, 255);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.add-note-btn:hover {
  background: rgb(0, 105, 217);
  transform: scale(1.05);
}

.search-box {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: rgb(0, 122, 255);
}

.note-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.note-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.note-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.note-item.active {
  background-color: rgba(0, 122, 255, 0.1);
}

.note-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.sync-indicator {
  display: flex;
  align-items: center;
  color: rgb(255, 149, 0);
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: rgba(0, 0, 0, 0.4);
  font-size: 14px;
}
</style>
