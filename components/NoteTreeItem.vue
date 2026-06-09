<template>
  <div class="note-tree-item" :style="{ paddingLeft: `${depth * 16}px` }">
    <div
      class="note-item-wrapper"
      :class="itemClasses"
      :draggable="!isMobile"
      @click="handleClick"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @dragend="handleDragEnd"
    >
      <div class="drop-indicator drop-top" v-if="isDropTarget && dropPosition === 'before'" />
      <div class="drop-indicator drop-bottom" v-if="isDropTarget && dropPosition === 'after'" />

      <button
        v-if="hasChildren"
        type="button"
        class="expand-toggle"
        :class="{ expanded }"
        @click="handleToggle"
      >
        <Icon :name="SOLAR_ICONS.nav.right" size="12" />
      </button>
      <span v-else class="expand-spacer" />

      <div class="note-item-bar" />

      <div class="note-item-body">
        <div class="note-title">{{ note.title || '无标题' }}</div>
      </div>

      <div class="note-item-actions">
        <button
          class="action-btn"
          type="button"
          title="新建子笔记"
          @click.stop="handleCreateChild"
        >
          <Icon :name="SOLAR_ICONS.action.add" size="14" />
        </button>
        <button
          class="action-btn delete-btn"
          type="button"
          title="删除"
          @click.stop="handleDelete"
        >
          <Icon :name="SOLAR_ICONS.action.delete" size="14" />
        </button>
      </div>

      <div class="drop-child-indicator" v-if="isDropTarget && dropPosition === 'child'" />
    </div>

    <div v-if="expanded && hasChildren" class="note-tree-children">
      <NoteTreeItem
        v-for="child in children"
        :key="child.id"
        :note="child"
        :depth="depth + 1"
        :children="getChildren(child.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { Note } from '~/types/block'

const { isMobile } = useDevice()

interface Props {
  note: Note
  depth: number
  children?: Note[]
}

const props = withDefaults(defineProps<Props>(), {
  children: () => []
})

const noteTreeContext = inject<ReturnType<typeof useNoteTreeContext>>('noteTreeContext')

const isActive = computed(() => noteTreeContext?.isActive(props.note.id) ?? false)
const isDragging = computed(() => noteTreeContext?.isDragging(props.note.id) ?? false)
const isDropTarget = computed(() => noteTreeContext?.isDropTarget(props.note.id) ?? false)
const dropPosition = computed(() => noteTreeContext?.dropPosition() ?? null)
const expanded = computed(() => noteTreeContext?.isExpanded(props.note.id) ?? false)
const hasChildren = computed(() => props.children.length > 0)

const itemClasses = computed(() => ({
  active: isActive.value,
  dragging: isDragging.value,
  'drop-target': isDropTarget.value,
  'drop-before': isDropTarget.value && dropPosition.value === 'before',
  'drop-after': isDropTarget.value && dropPosition.value === 'after',
  'drop-child': isDropTarget.value && dropPosition.value === 'child'
}))

const getChildren = (parentId: string) => {
  return noteTreeContext?.getChildren(parentId) ?? []
}

function handleClick() {
  noteTreeContext?.onSelect(props.note.id)
}

function handleToggle() {
  noteTreeContext?.onToggleExpand(props.note.id)
}

function handleCreateChild() {
  noteTreeContext?.onCreateChild(props.note.id)
}

function handleDelete() {
  noteTreeContext?.onDelete(props.note.id)
}

function handleDragStart(e: DragEvent) {
  e.stopPropagation()
  noteTreeContext?.onDragStart(props.note.id, props.note.parentId || '')
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height

  let position: 'before' | 'after' | 'child' = 'after'

  if (y < height * 0.25) {
    position = 'before'
  } else if (y > height * 0.75) {
    position = 'after'
  } else {
    position = hasChildren.value ? 'child' : 'after'
  }

  noteTreeContext?.onDragOver(props.note.id, position)
}

function handleDragLeave(e: DragEvent) {
  e.stopPropagation()
  noteTreeContext?.onDragLeave(props.note.id)
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  noteTreeContext?.onDrop(props.note.id)
}

function handleDragEnd(e: DragEvent) {
  e.stopPropagation()
  noteTreeContext?.onDragEnd()
}

function useNoteTreeContext() {
  return {
    isActive: (id: string) => false,
    isDragging: (id: string) => false,
    isDropTarget: (id: string) => false,
    isExpanded: (id: string) => false,
    dropPosition: () => null,
    getChildren: (parentId: string) => [],
    onSelect: (id: string) => {},
    onCreateChild: (parentId: string) => {},
    onToggleExpand: (id: string) => {},
    onDragStart: (id: string, parentId: string) => {},
    onDragOver: (targetId: string, position: 'before' | 'after' | 'child') => {},
    onDragLeave: (targetId: string) => {},
    onDrop: (targetId: string) => {},
    onDragEnd: () => {},
    onDelete: (id: string) => {}
  }
}
</script>

<style scoped>
.note-tree-item {
  user-select: none;
}

.note-item-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  margin: 1px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.12s ease, box-shadow 0.12s ease;
}

.note-item-wrapper:hover {
  background: rgba(0, 0, 0, 0.04);
}

.note-item-wrapper.active {
  background: rgba(0, 122, 255, 0.12);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.note-item-wrapper.dragging {
  opacity: 0.5;
}

.note-item-wrapper.drop-target {
  background: rgba(0, 122, 255, 0.08);
}

.note-item-wrapper.drop-before {
  box-shadow: inset 0 2px 0 rgba(0, 122, 255, 0.8);
}

.note-item-wrapper.drop-after {
  box-shadow: inset 0 -2px 0 rgba(0, 122, 255, 0.8);
}

.note-item-wrapper.drop-child {
  background: rgba(0, 122, 255, 0.15);
  box-shadow: 0 0 0 1.5px rgba(0, 122, 255, 0.6);
}

.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
}

.expand-toggle:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.expand-toggle.expanded {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 18px;
  flex-shrink: 0;
}

.note-item-bar {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: transparent;
  flex-shrink: 0;
}

.note-item-wrapper.active .note-item-bar {
  background: linear-gradient(180deg, rgb(0, 122, 255) 0%, rgb(94, 92, 230) 100%);
}

.note-item-body {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.note-item-wrapper:hover .note-item-actions {
  display: flex;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(0, 122, 255, 0.8);
}

.action-btn.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.note-tree-children {
  margin-left: 0;
}

.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgb(0, 122, 255);
  border-radius: 1px;
  pointer-events: none;
  z-index: 1;
}

.drop-top {
  top: -1px;
}

.drop-bottom {
  bottom: -1px;
}

.drop-child-indicator {
  position: absolute;
  inset: 2px;
  border: 1.5px dashed rgb(0, 122, 255);
  border-radius: 6px;
  pointer-events: none;
  z-index: 1;
}

@media (prefers-color-scheme: dark) {
  .note-item-wrapper:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .note-item-wrapper.active {
    background: rgba(0, 122, 255, 0.2);
  }

  .note-item-wrapper.drop-target {
    background: rgba(0, 122, 255, 0.15);
  }

  .expand-toggle {
    color: rgba(255, 255, 255, 0.4);
  }

  .expand-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }

  .note-title {
    color: rgba(255, 255, 255, 0.88);
  }

  .action-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(0, 122, 255, 0.9);
  }
}
</style>
