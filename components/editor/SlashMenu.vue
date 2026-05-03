<template>
  <Teleport to="body">
    <Transition name="slash-fade">
      <div
        v-if="visible && filteredItems.length > 0"
        class="slash-menu"
        :style="menuStyle"
        @mousedown.prevent
      >
        <div class="slash-menu-header">
          <span class="slash-menu-hint">基础块</span>
        </div>
        <div class="slash-menu-list" ref="listRef">
          <button
            v-for="(item, index) in filteredItems"
            :key="item.id"
            class="slash-menu-item"
            :class="{ 'is-active': index === activeIndex }"
            @mouseenter="activeIndex = index"
            @click="selectItem(item)"
            type="button"
          >
            <div class="slash-menu-icon">
              <Icon :name="item.icon" />
            </div>
            <div class="slash-menu-text">
              <div class="slash-menu-label">{{ item.label }}</div>
              <div class="slash-menu-description">{{ item.description }}</div>
            </div>
            <div class="slash-menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</div>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { BlockType, BlockMetadata } from '~/types/block'

export interface SlashMenuItem {
  id: string
  type: BlockType
  label: string
  description: string
  icon: string
  shortcut?: string
  metadata?: BlockMetadata
}

interface Props {
  visible: boolean
  query: string
  position: { top: number; left: number }
}

interface Emits {
  (e: 'select', item: SlashMenuItem): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const allItems: SlashMenuItem[] = [
  {
    id: 'text',
    type: 'text',
    label: '文本',
    description: '普通段落文本',
    icon: 'solar:text-linear',
    shortcut: 'Text'
  },
  {
    id: 'heading-1',
    type: 'heading',
    label: '标题 1',
    description: '一级大标题',
    icon: 'solar:text-field-linear',
    metadata: { level: 1 },
    shortcut: 'H1'
  },
  {
    id: 'heading-2',
    type: 'heading',
    label: '标题 2',
    description: '二级标题',
    icon: 'solar:text-field-linear',
    metadata: { level: 2 },
    shortcut: 'H2'
  },
  {
    id: 'heading-3',
    type: 'heading',
    label: '标题 3',
    description: '三级标题',
    icon: 'solar:text-field-linear',
    metadata: { level: 3 },
    shortcut: 'H3'
  },
  {
    id: 'list',
    type: 'list',
    label: '无序列表',
    description: '无序项目列表',
    icon: 'solar:list-linear',
    shortcut: 'List'
  },
  {
    id: 'ordered-list',
    type: 'orderedList',
    label: '有序列表',
    description: '有序编号列表',
    icon: 'solar:sort-vertical-linear',
    shortcut: 'OL'
  },
  {
    id: 'todo',
    type: 'todo',
    label: '待办',
    description: '可勾选的待办事项',
    icon: 'solar:checklist-minimalistic-linear',
    shortcut: 'Todo'
  },
  {
    id: 'quote',
    type: 'quote',
    label: '引用',
    description: '引用一段重要内容',
    icon: 'solar:chat-square-linear',
    shortcut: 'Quote'
  },
  {
    id: 'code',
    type: 'code',
    label: '代码块',
    description: '插入带语法高亮的代码',
    icon: 'solar:code-2-linear',
    shortcut: 'Code'
  },
  {
    id: 'divider',
    type: 'divider',
    label: '分割线',
    description: '插入水平分割线',
    icon: 'solar:minus-circle-linear',
    shortcut: 'HR'
  }
]

const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)

const filteredItems = computed(() => {
  const q = props.query.trim().toLowerCase()
  if (!q) return allItems
  return allItems.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    (item.shortcut?.toLowerCase().includes(q) ?? false)
  )
})

const menuStyle = computed(() => ({
  top: `${props.position.top}px`,
  left: `${props.position.left}px`
}))

watch(() => props.query, () => {
  activeIndex.value = 0
})

watch(() => props.visible, (v) => {
  if (v) activeIndex.value = 0
})

const selectItem = (item: SlashMenuItem) => {
  emit('select', item)
}

const moveSelection = (delta: number) => {
  const len = filteredItems.value.length
  if (len === 0) return
  activeIndex.value = (activeIndex.value + delta + len) % len
  nextTick(() => {
    const el = listRef.value?.children[activeIndex.value] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

const selectActive = () => {
  const item = filteredItems.value[activeIndex.value]
  if (item) emit('select', item)
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!props.visible || filteredItems.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    moveSelection(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    moveSelection(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    selectActive()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
})

defineExpose({ selectActive, moveSelection })
</script>

<style scoped>
.slash-menu {
  position: fixed;
  z-index: 1000;
  width: 320px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.slash-menu-header {
  padding: 10px 14px 6px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.slash-menu-hint {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: rgba(60, 60, 67, 0.6);
}

.slash-menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}

.slash-menu-list::-webkit-scrollbar {
  width: 6px;
}
.slash-menu-list::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: rgba(0, 0, 0, 0.88);
  transition: background-color 0.12s ease;
}

.slash-menu-item.is-active {
  background: rgba(0, 122, 255, 0.14);
}

.slash-menu-item.is-active .slash-menu-label {
  color: rgb(0, 102, 230);
}

.slash-menu-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  color: rgba(0, 0, 0, 0.74);
  font-size: 16px;
}

.slash-menu-item.is-active .slash-menu-icon {
  background: rgba(0, 122, 255, 0.18);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 102, 230);
}

.slash-menu-text {
  flex: 1;
  min-width: 0;
}

.slash-menu-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 2px;
}

.slash-menu-description {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slash-menu-shortcut {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(60, 60, 67, 0.08);
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
  font-family: 'SF Mono', 'Menlo', monospace;
}

.slash-fade-enter-active,
.slash-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.slash-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.slash-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
