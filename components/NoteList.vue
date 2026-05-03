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

    <div
      class="note-items"
      :class="{ 'root-drop-active': rootDropActive }"
      @dragover.prevent="onRootDragOver"
      @dragleave="onRootDragLeave"
      @drop.prevent="onRootDrop"
    >
      <template v-if="searchQuery">
        <div
          v-for="note in flatFilteredNotes"
          :key="note.id"
          class="search-result-item"
          :class="{ active: props.activeNoteId === note.id }"
          @click="$emit('select', note.id)"
        >
          <div class="note-item-bar" />
          <div class="note-item-body">
            <div class="note-title">{{ note.title || '无标题' }}</div>
            <div class="note-meta">
              <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <NoteTreeNode
          v-for="root in rootNotes"
          :key="root.id"
          :note="root"
          :depth="0"
        />
      </template>

      <div
        v-if="rootNotes.length === 0 && !searchQuery"
        class="empty-state"
      >
        <Icon name="solar:notebook-linear" class="empty-icon" />
        <p class="empty-text">暂无笔记，点击右上角创建</p>
      </div>

      <div
        v-else-if="searchQuery && flatFilteredNotes.length === 0"
        class="empty-state"
      >
        <Icon name="solar:minimalistic-magnifer-linear" class="empty-icon" />
        <p class="empty-text">没有找到匹配的笔记</p>
      </div>

      <div class="root-drop-hint" v-if="rootDropActive">
        <Icon name="solar:arrow-up-linear" />
        <span>移动到顶层</span>
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
  (e: 'create-child', parentId: string): void
  (e: 'reorder', payload: { id: string; targetId: string | null; position: 'before' | 'after' | 'child' | 'root-end' }): void
  (e: 'delete', id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  activeNoteId: null
})

const emit = defineEmits<Emits>()

const searchQuery = ref('')

const childrenMap = computed<Record<string, Note[]>>(() => {
  const map: Record<string, Note[]> = {}
  for (const note of props.notes) {
    const key = note.parentId || ''
    if (!map[key]) map[key] = []
    map[key].push(note)
  }
  for (const key in map) {
    map[key].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
  }
  return map
})

const rootNotes = computed(() => childrenMap.value[''] || [])

const flatFilteredNotes = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  return props.notes
    .filter(n => n.title.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

const expandedSet = ref<Set<string>>(new Set())

const isExpanded = (id: string) => expandedSet.value.has(id)

const toggleExpand = (id: string) => {
  const next = new Set(expandedSet.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedSet.value = next
}

const dragging = ref<{ id: string; parentId: string } | null>(null)
const dropTarget = ref<{ id: string; position: 'before' | 'after' | 'child' } | null>(null)
const rootDropActive = ref(false)
let rootLeaveTimer: ReturnType<typeof setTimeout> | null = null

const isDescendant = (sourceId: string, targetId: string): boolean => {
  if (sourceId === targetId) return true
  const stack = [...(childrenMap.value[sourceId] || [])]
  while (stack.length) {
    const node = stack.pop()!
    if (node.id === targetId) return true
    stack.push(...(childrenMap.value[node.id] || []))
  }
  return false
}

const isValidDropTarget = (sourceId: string, targetId: string) => {
  if (sourceId === targetId) return false
  if (isDescendant(sourceId, targetId)) return false
  return true
}

const resetDragState = () => {
  dragging.value = null
  dropTarget.value = null
  rootDropActive.value = false
  if (rootLeaveTimer) {
    clearTimeout(rootLeaveTimer)
    rootLeaveTimer = null
  }
}

watch(() => props.activeNoteId, (id) => {
  if (!id) return
  const note = props.notes.find(n => n.id === id)
  if (!note) return
  let cursor: string = note.parentId || ''
  if (!cursor) return
  const next = new Set(expandedSet.value)
  while (cursor) {
    next.add(cursor)
    const parent = props.notes.find(n => n.id === cursor)
    cursor = parent?.parentId || ''
    if (!cursor) break
  }
  expandedSet.value = next
}, { immediate: true })

provide('noteTreeContext', {
  isActive: (id: string) => props.activeNoteId === id,
  isDragging: (id: string) => dragging.value?.id === id,
  isDropTarget: (id: string) => dropTarget.value?.id === id,
  isExpanded,
  dropPosition: () => dropTarget.value?.position ?? null,
  getChildren: (parentId: string) => childrenMap.value[parentId] || [],
  onSelect: (id: string) => emit('select', id),
  onCreateChild: (parentId: string) => {
    const next = new Set(expandedSet.value)
    next.add(parentId)
    expandedSet.value = next
    emit('create-child', parentId)
  },
  onToggleExpand: toggleExpand,
  onDragStart: (id: string, parentId: string) => {
    dragging.value = { id, parentId }
    dropTarget.value = null
    rootDropActive.value = false
  },
  onDragOver: (targetId: string, position: 'before' | 'after' | 'child') => {
    const drag = dragging.value
    if (!drag) return
    if (!isValidDropTarget(drag.id, targetId)) {
      dropTarget.value = null
      return
    }
    if (dropTarget.value?.id !== targetId || dropTarget.value?.position !== position) {
      dropTarget.value = { id: targetId, position }
    }
    rootDropActive.value = false
    if (rootLeaveTimer) {
      clearTimeout(rootLeaveTimer)
      rootLeaveTimer = null
    }
  },
  onDragLeave: (_targetId: string) => {
    // No-op: dragOver on next target replaces dropTarget; dragend clears all.
  },
  onDrop: (targetId: string) => {
    const drag = dragging.value
    const dt = dropTarget.value
    if (!drag || !dt || dt.id !== targetId || !isValidDropTarget(drag.id, targetId)) {
      resetDragState()
      return
    }
    emit('reorder', {
      id: drag.id,
      targetId,
      position: dt.position
    })
    resetDragState()
  },
  onDragEnd: () => {
    resetDragState()
  },
  onDelete: (id: string) => emit('delete', id)
})

const onRootDragOver = (e: DragEvent) => {
  if (!dragging.value) return
  if (dropTarget.value) {
    rootDropActive.value = false
    return
  }
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  rootDropActive.value = true
}

const onRootDragLeave = (e: DragEvent) => {
  const related = e.relatedTarget as HTMLElement | null
  const container = e.currentTarget as HTMLElement
  if (related && container.contains(related)) return
  if (rootLeaveTimer) clearTimeout(rootLeaveTimer)
  rootLeaveTimer = setTimeout(() => {
    rootDropActive.value = false
  }, 60)
}

const onRootDrop = () => {
  const drag = dragging.value
  if (!drag) {
    resetDragState()
    return
  }
  if (dropTarget.value) {
    resetDragState()
    return
  }
  emit('reorder', {
    id: drag.id,
    targetId: null,
    position: 'root-end'
  })
  resetDragState()
}

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
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 32px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.note-items::-webkit-scrollbar {
  width: 6px;
}

.note-items::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.note-items.root-drop-active {
  background: rgba(0, 122, 255, 0.06);
  box-shadow: inset 0 0 0 1.5px rgba(0, 122, 255, 0.4);
  border-radius: 12px;
}

.root-drop-hint {
  position: sticky;
  bottom: 8px;
  margin: 12px 12px 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.92);
  color: white;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.32);
  pointer-events: none;
}

.search-result-item {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.search-result-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.search-result-item.active {
  background: rgba(0, 122, 255, 0.12);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.search-result-item .note-item-bar {
  width: 3px;
  border-radius: 2px;
  background: transparent;
}

.search-result-item.active .note-item-bar {
  background: linear-gradient(180deg, rgb(0, 122, 255) 0%, rgb(94, 92, 230) 100%);
}

.search-result-item .note-item-body {
  flex: 1;
  min-width: 0;
}

.search-result-item .note-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-item .note-meta {
  font-size: 11.5px;
  color: rgba(60, 60, 67, 0.55);
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
