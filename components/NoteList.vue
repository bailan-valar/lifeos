<template>
  <div class="note-list">
    <div class="note-list-header">
      <div class="header-text">
        <h3>笔记</h3>
        <span class="note-count" v-if="props.notes.length">{{ props.notes.length }}</span>
      </div>
      <button class="add-note-btn" @click="$emit('create')" type="button" title="新建笔记">
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
        spellcheck="false"
      />
      <button
        v-if="searchQuery"
        class="search-clear"
        @click="searchQuery = ''"
        type="button"
        title="清空"
      >
        <Icon name="solar:close-circle-bold" />
      </button>
    </div>

    <div class="note-items">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: props.activeNoteId === note.id }"
        @click="$emit('select', note.id)"
      >
        <div class="note-item-bar" />
        <div class="note-item-body">
          <div class="note-title">{{ note.title || '无标题' }}</div>
          <div class="note-meta">
            <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
            <span v-if="!note.isSynced" class="sync-indicator" title="未同步">
              <Icon name="solar:cloud-storage-linear" />
            </span>
          </div>
        </div>
      </div>

      <div v-if="filteredNotes.length === 0" class="empty-state">
        <Icon
          :name="searchQuery ? 'solar:minimalistic-magnifer-linear' : 'solar:notebook-linear'"
          class="empty-icon"
        />
        <p class="empty-text">{{ searchQuery ? '没有找到匹配的笔记' : '暂无笔记，点击右上角创建' }}</p>
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

const props = withDefaults(defineProps<Props>(), {
  activeNoteId: null
})

defineEmits<Emits>()

const searchQuery = ref('')

const filteredNotes = computed(() => {
  if (!searchQuery.value) {
    return props.notes
  }

  const query = searchQuery.value.toLowerCase()
  return props.notes.filter(note =>
    note.title.toLowerCase().includes(query)
  )
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const nowDate = new Date()
  const diff = nowDate.getTime() - date.getTime()

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
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-right: 0.5px solid rgba(60, 60, 67, 0.12);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.3);
}

.note-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 12px;
}

.header-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.note-list-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.92);
}

.note-count {
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.5);
  font-variant-numeric: tabular-nums;
}

.add-note-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  font-size: 17px;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 2px 8px rgba(0, 122, 255, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.add-note-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 4px 12px rgba(0, 122, 255, 0.4);
}

.add-note-btn:active {
  transform: scale(0.94);
}

.search-box {
  position: relative;
  margin: 0 14px 8px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(60, 60, 67, 0.5);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  border: 0.5px solid rgba(60, 60, 67, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  font-size: 13.5px;
  color: rgba(0, 0, 0, 0.86);
  outline: none;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.search-input::placeholder {
  color: rgba(60, 60, 67, 0.38);
}

.search-input:focus {
  border-color: rgba(0, 122, 255, 0.6);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(60, 60, 67, 0.35);
  cursor: pointer;
  transition: color 0.15s ease;
}

.search-clear:hover {
  color: rgba(60, 60, 67, 0.65);
}

.note-items {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 12px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}

.note-items::-webkit-scrollbar {
  width: 6px;
}

.note-items::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.note-item {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.note-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.note-item:active {
  transform: scale(0.99);
}

.note-item.active {
  background: rgba(0, 122, 255, 0.12);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.note-item-bar {
  width: 3px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.18s ease;
}

.note-item.active .note-item-bar {
  background: linear-gradient(180deg, rgb(0, 122, 255) 0%, rgb(94, 92, 230) 100%);
}

.note-item-body {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item.active .note-title {
  color: rgb(0, 102, 230);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
  font-variant-numeric: tabular-nums;
}

.sync-indicator {
  display: flex;
  align-items: center;
  color: rgb(255, 149, 0);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
  color: rgba(60, 60, 67, 0.5);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  color: rgba(60, 60, 67, 0.35);
}

.empty-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
</style>
