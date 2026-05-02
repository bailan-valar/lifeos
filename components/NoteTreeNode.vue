<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :class="{
        active: ctx.isActive(note.id),
        'is-dragging': ctx.isDragging(note.id),
        'drop-before': ctx.isDropTarget(note.id) && ctx.dropPosition() === 'before',
        'drop-after': ctx.isDropTarget(note.id) && ctx.dropPosition() === 'after',
        'drop-child': ctx.isDropTarget(note.id) && ctx.dropPosition() === 'child'
      }"
      :style="{ paddingLeft: `${depth * 16 + 10}px` }"
      draggable="true"
      role="treeitem"
      :aria-expanded="hasChildren ? ctx.isExpanded(note.id) : undefined"
      @click="ctx.onSelect(note.id)"
      @dragstart="onDragStart"
      @dragend="ctx.onDragEnd()"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent.stop="onDrop"
    >
      <button
        v-if="hasChildren"
        class="chevron"
        :class="{ expanded: ctx.isExpanded(note.id) }"
        type="button"
        title="展开/收起"
        @click.stop="ctx.onToggleExpand(note.id)"
        @mousedown.stop
      >
        <Icon name="solar:alt-arrow-right-linear" />
      </button>
      <span v-else class="chevron-spacer" />

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

      <button
        class="row-add"
        type="button"
        title="添加子笔记"
        @click.stop="ctx.onCreateChild(note.id)"
        @mousedown.stop
      >
        <Icon name="solar:add-circle-linear" />
      </button>
    </div>

    <div v-if="ctx.isExpanded(note.id) && hasChildren" class="tree-children">
      <NoteTreeNode
        v-for="child in children"
        :key="child.id"
        :note="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/types/block'

interface Props {
  note: Note
  depth: number
}

const props = defineProps<Props>()

interface TreeContext {
  isActive: (id: string) => boolean
  isDragging: (id: string) => boolean
  isDropTarget: (id: string) => boolean
  isExpanded: (id: string) => boolean
  dropPosition: () => 'before' | 'after' | 'child' | null
  getChildren: (parentId: string) => Note[]
  onSelect: (id: string) => void
  onCreateChild: (parentId: string) => void
  onToggleExpand: (id: string) => void
  onDragStart: (id: string, parentId: string) => void
  onDragOver: (targetId: string, position: 'before' | 'after' | 'child') => void
  onDragLeave: (targetId: string) => void
  onDrop: (targetId: string) => void
  onDragEnd: () => void
}

const ctx = inject<TreeContext>('noteTreeContext')!

const children = computed(() => ctx.getChildren(props.note.id))
const hasChildren = computed(() => children.value.length > 0)

const onDragStart = (e: DragEvent) => {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.note.id)
  ctx.onDragStart(props.note.id, props.note.parentId)
}

const onDragOver = (e: DragEvent) => {
  if (!e.dataTransfer) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (e.clientY - rect.top) / rect.height
  let position: 'before' | 'after' | 'child'
  if (ratio < 0.28) position = 'before'
  else if (ratio > 0.72) position = 'after'
  else position = 'child'
  e.dataTransfer.dropEffect = 'move'
  ctx.onDragOver(props.note.id, position)
}

const onDragLeave = () => {
  ctx.onDragLeave(props.note.id)
}

const onDrop = () => {
  ctx.onDrop(props.note.id)
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
.tree-node {
  position: relative;
}

.tree-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 10px 10px 10px 14px;
  margin-bottom: 2px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.tree-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.tree-row:active {
  transform: scale(0.99);
}

.tree-row.active {
  background: rgba(0, 122, 255, 0.12);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.tree-row.is-dragging {
  opacity: 0.45;
}

.tree-row.drop-before::before,
.tree-row.drop-after::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgb(0, 122, 255) 0%, rgb(94, 92, 230) 100%);
  box-shadow: 0 0 8px rgba(0, 122, 255, 0.45);
  pointer-events: none;
  z-index: 5;
}

.tree-row.drop-before::before {
  top: -2px;
}

.tree-row.drop-after::after {
  bottom: -2px;
}

.tree-row.drop-child {
  background: rgba(0, 122, 255, 0.18);
  box-shadow: inset 0 0 0 1.5px rgba(0, 122, 255, 0.55);
}

.chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, transform 0.18s ease;
}

.chevron:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}

.chevron.expanded {
  transform: rotate(90deg);
}

.chevron-spacer {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.note-item-bar {
  width: 3px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.18s ease;
}

.tree-row.active .note-item-bar {
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
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-row.active .note-title {
  color: rgb(0, 102, 230);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(60, 60, 67, 0.55);
  font-variant-numeric: tabular-nums;
}

.sync-indicator {
  display: flex;
  align-items: center;
  color: rgb(255, 149, 0);
}

.row-add {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease, background-color 0.12s ease, color 0.12s ease;
}

.tree-row:hover .row-add,
.row-add:focus-visible {
  opacity: 1;
}

.row-add:hover {
  background: rgba(0, 122, 255, 0.14);
  color: rgb(0, 102, 230);
}

.tree-children {
  position: relative;
}
</style>
