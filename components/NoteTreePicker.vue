<template>
  <div class="note-tree-picker">
    <div
      ref="triggerRef"
      class="picker-trigger"
      :class="{ disabled, 'has-value': selectedNote }"
      @click="toggleOpen"
    >
      <span class="trigger-label" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <div class="trigger-right">
        <button
          v-if="clearable && modelValue"
          type="button"
          class="clear-btn"
          @click.stop="clear"
        >
          <Icon :name="SOLAR_ICONS.action.close" size="14" />
        </button>
        <Icon :name="SOLAR_ICONS.nav.down" size="14" class="arrow" :class="{ open }" />
      </div>
    </div>

    <Teleport to="body">
      <Transition name="picker-fade">
        <div v-if="open" ref="panelRef" class="picker-panel" :style="panelStyle">
          <div class="picker-header" v-if="searchable">
            <Icon :name="SOLAR_ICONS.search.default" size="14" />
            <input
              ref="searchRef"
              v-model="searchQuery"
              type="text"
              placeholder="搜索笔记..."
              @click.stop
            />
          </div>

          <div ref="listRef" class="picker-list">
            <div v-if="filteredTree.length === 0" class="picker-empty">
              {{ searchQuery ? '无匹配结果' : emptyText }}
            </div>
            <template v-else>
              <TreeNode
                v-for="node in filteredTree"
                :key="node.id"
                :node="node"
                :selected-id="modelValue"
                :expanded="expandedSet.has(node.id)"
                :level="0"
                @select="selectNote"
                @toggle="toggleExpand"
              />
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { Note } from '~/types/block'
import { getNextZIndex } from '~/composables/useZIndex'

interface TreeNode {
  id: string
  title: string
  level: number
  children: TreeNode[]
}

interface Props {
  modelValue?: string | null
  notes: Note[]
  placeholder?: string
  emptyText?: string
  clearable?: boolean
  searchable?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择父笔记',
  emptyText: '暂无笔记',
  clearable: true,
  searchable: true,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'change': [note: Note | null]
}>()

const open = ref(false)
const searchQuery = ref('')
const expandedSet = ref<Set<string>>(new Set())
const triggerRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})

// 构建树形结构
const noteTree = computed(() => {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // 先创建所有节点
  for (const note of props.notes) {
    map.set(note.id, {
      id: note.id,
      title: note.title || '无标题',
      level: 0,
      children: []
    })
  }

  // 建立父子关系
  for (const note of props.notes) {
    const node = map.get(note.id)!
    const parentId = note.parentId || ''

    if (parentId && map.has(parentId)) {
      const parent = map.get(parentId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
})

// 搜索过滤
const filteredTree = computed(() => {
  if (!searchQuery.value.trim()) {
    return noteTree.value
  }

  const query = searchQuery.value.toLowerCase()
  const matched = new Set<string>()

  function search(nodes: TreeNode[]) {
    for (const node of nodes) {
      const titleMatch = node.title.toLowerCase().includes(query)
      let childMatch = false

      if (node.children.length > 0) {
        childMatch = search(node.children)
      }

      if (titleMatch || childMatch) {
        matched.add(node.id)
        // 展开匹配的节点
        expandedSet.value.add(node.id)
      }
    }
    return matched.size > 0
  }

  search(noteTree.value)

  // 过滤树，只显示匹配的节点及其路径
  function filterTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of nodes) {
      if (matched.has(node.id)) {
        result.push({
          ...node,
          children: node.children.length > 0 ? filterTree(node.children) : []
        })
      } else if (node.children.length > 0) {
        const filtered = filterTree(node.children)
        if (filtered.length > 0) {
          result.push({
            ...node,
            children: filtered
          })
        }
      }
    }
    return result
  }

  return filterTree(noteTree.value)
})

// 当前选中项
const selectedNote = computed(() => {
  if (!props.modelValue) return null
  return props.notes.find(n => n.id === props.modelValue) || null
})

// 选中项的标签（包含路径）
const selectedLabel = computed(() => {
  if (!selectedNote.value) return ''

  // 构建路径
  const path: string[] = []
  let current = selectedNote.value
  while (current) {
    path.unshift(current.title || '无标题')
    const parentId = current.parentId || ''
    current = props.notes.find(n => n.id === parentId) || null as any
  }

  return path.join(' / ')
})

// 切换展开状态
function toggleExpand(nodeId: string) {
  const next = new Set(expandedSet.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  expandedSet.value = next
}

// 选择笔记
function selectNote(noteId: string) {
  const note = props.notes.find(n => n.id === noteId)
  if (note) {
    emit('update:modelValue', noteId)
    emit('change', note)
    open.value = false
    searchQuery.value = ''
  }
}

// 清除选择
function clear() {
  emit('update:modelValue', null)
  emit('change', null)
}

// 切换开关
function toggleOpen() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    nextTick(() => {
      updatePanelPosition()
      if (props.searchable) {
        searchRef.value?.focus()
      }
    })
  }
}

// 更新面板位置
function updatePanelPosition() {
  const trigger = triggerRef.value
  const panel = panelRef.value
  if (!trigger || !panel) return

  const triggerRect = trigger.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  const PANEL_WIDTH = 280
  const MAX_HEIGHT = 320

  // 默认下方显示
  let top = triggerRect.bottom + 4
  let left = triggerRect.left
  let maxHeight = MAX_HEIGHT

  // 如果下方空间不足，尝试上方显示
  if (top + MAX_HEIGHT > viewportHeight - 8) {
    const aboveTop = triggerRect.top - MAX_HEIGHT - 4
    if (aboveTop >= 8) {
      top = aboveTop
    } else {
      // 上下都不够，使用可用空间
      maxHeight = viewportHeight - triggerRect.bottom - 12
    }
  }

  // 防止右溢出
  if (left + PANEL_WIDTH > viewportWidth - 8) {
    left = viewportWidth - PANEL_WIDTH - 8
  }

  // 防止左溢出
  if (left < 8) {
    left = 8
  }

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${PANEL_WIDTH}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(getNextZIndex())
  }
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  open.value = false
}

// ESC 键关闭
onKeyStroke('Escape', () => {
  open.value = false
})

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<script lang="ts">
// TreeNode 子组件
const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: {
      type: Object as () => TreeNode,
      required: true
    },
    selectedId: String,
    expanded: Boolean,
    level: {
      type: Number,
      default: 0
    }
  },
  emits: ['select', 'toggle'],
  setup(props, { emit }) {
    const hasChildren = computed(() => props.node.children.length > 0)

    function handleClick() {
      emit('select', props.node.id)
    }

    function handleToggle(e: MouseEvent) {
      e.stopPropagation()
      emit('toggle', props.node.id)
    }

    return {
      hasChildren,
      handleClick,
      handleToggle,
      SOLAR_ICONS
    }
  },
  template: `
    <div class="tree-node" :style="{ paddingLeft: level * 16 + 'px' }">
      <div
        class="tree-node-content"
        :class="{ selected: node.id === selectedId }"
        @click="handleClick"
      >
        <button
          v-if="hasChildren"
          type="button"
          class="expand-btn"
          :class="{ expanded }"
          @click="handleToggle"
        >
          <Icon :name="SOLAR_ICONS.nav.right" size="12" />
        </button>
        <span v-else class="expand-spacer"></span>
        <span class="node-label">{{ node.title }}</span>
      </div>
      <div v-if="expanded && hasChildren" class="tree-children">
        <TreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected-id="selectedId"
          :expanded="false"
          :level="level + 1"
          @select="$emit('select', $event)"
          @toggle="$emit('toggle', $event)"
        />
      </div>
    </div>
  `
})
</script>

<style scoped>
.note-tree-picker {
  position: relative;
  width: 100%;
}

.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 6px 10px;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button);
  cursor: pointer;
  transition: all 0.15s ease;
}

.picker-trigger:hover:not(.disabled) {
  border-color: rgba(0, 122, 255, 0.4);
  background: rgba(255, 255, 255, 0.25);
}

.picker-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(60, 60, 67, 0.05);
}

.trigger-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-label.placeholder {
  color: rgba(60, 60, 67, 0.45);
}

.trigger-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.12s ease;
}

.clear-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.arrow {
  color: rgba(60, 60, 67, 0.5);
  transition: transform 0.2s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.picker-panel {
  position: fixed;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur-thick)) saturate(var(--liquid-saturate));
  border: 0.5px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--liquid-radius);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  background: rgba(255, 255, 255, 0.3);
}

.picker-header input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  outline: none;
}

.picker-header input:focus {
  background: rgba(255, 255, 255, 0.9);
}

.picker-header input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.picker-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.5);
}

/* 树节点样式 */
.tree-node {
  user-select: none;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.tree-node-content:hover {
  background: rgba(0, 122, 255, 0.08);
}

.tree-node-content.selected {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 102, 230);
}

.expand-btn {
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

.expand-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 18px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-children {
  margin-left: 0;
}

/* 过渡动画 */
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .picker-trigger {
    background: var(--liquid-bg);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .picker-trigger:hover:not(.disabled) {
    border-color: rgba(0, 122, 255, 0.5);
    background: rgba(255, 255, 255, 0.12);
  }

  .trigger-label {
    color: rgba(255, 255, 255, 0.85);
  }

  .trigger-label.placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .clear-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }

  .arrow {
    color: rgba(255, 255, 255, 0.5);
  }

  .picker-panel {
    background: var(--liquid-bg);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .picker-header {
    background: rgba(255, 255, 255, 0.08);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .picker-header input {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);
  }

  .picker-header input:focus {
    background: rgba(255, 255, 255, 0.15);
  }

  .picker-header input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .picker-empty {
    color: rgba(255, 255, 255, 0.5);
  }

  .tree-node-content:hover {
    background: rgba(0, 122, 255, 0.15);
  }

  .tree-node-content.selected {
    background: rgba(0, 122, 255, 0.25);
    color: rgb(0, 122, 255);
  }

  .expand-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .expand-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
