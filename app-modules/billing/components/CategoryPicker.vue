<template>
  <div class="category-picker">
    <div ref="triggerRef" class="picker-trigger" @click.stop="toggleOpen">
      <span :class="{ placeholder: !selectedName }">{{ selectedName || placeholder }}</span>
      <div class="trigger-right">
        <button
          v-if="clearable && modelValue"
          type="button"
          class="clear-btn"
          @click.stop="clear"
        >
          <Icon name="solar:close-circle-linear" size="14" />
        </button>
        <Icon
          name="solar:alt-arrow-down-linear"
          size="14"
          class="arrow"
          :class="{ open: open }"
        />
      </div>
    </div>

    <!-- 复用分类对话框 -->
    <CategoryDialog
      :visible="showCategoryDialog"
      :categories="categories"
      :exclude-id="excludeId"
      :default-type="type"
      :default-name="dialogDefaultName"
      :default-parent-id="dialogDefaultParentId"
      :note-options="noteOptions"
      @confirm="handleCreateCategory"
      @cancel="showCategoryDialog = false"
    />

    <Teleport to="body">
      <div v-if="open" ref="panelRef" class="picker-panel category-picker-panel" :style="panelStyle">
        <div class="picker-search">
          <Icon name="solar:magnifer-linear" size="14" />
          <input
            ref="searchRef"
            v-model="searchQuery"
            placeholder="搜索分类..."
            @click.stop
          />
        </div>

        <div ref="listRef" class="picker-list">
          <div v-if="renderItems.length === 0" class="picker-empty">
            无匹配结果
          </div>
          <template v-else>
            <div
              v-for="(item, index) in renderItems"
              :key="item.id"
              class="picker-item"
              :class="{
                active: modelValue === item.id,
                disabled: isDisabled(item),
                'is-parent': item.children.length > 0,
                'is-active': index === activeIndex
              }"
              :style="{ paddingLeft: `${12 + item.level * 16}px` }"
              @mouseenter="activeIndex = index"
              @click.stop="select(item)"
            >
              <div class="item-left">
                <button
                  v-if="item.children.length > 0"
                  type="button"
                  class="expand-btn"
                  @click.stop="toggleExpanded(item.id)"
                >
                  <Icon
                    :name="isExpanded(item.id) ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'"
                    size="12"
                  />
                </button>
                <span v-else class="expand-placeholder" />
                <span class="item-name">{{ item.name }}</span>
              </div>
              <div class="item-right">
                <button
                  v-if="!isDisabled(item)"
                  type="button"
                  class="add-child-btn"
                  :class="{ 'always-visible': searchQuery.trim() }"
                  title="新增子分类"
                  @click.stop="startQuickAddChild(item.id)"
                >
                  <Icon name="solar:add-circle-linear" size="14" />
                </button>
                <Icon
                  v-if="modelValue === item.id"
                  name="solar:check-circle-linear"
                  size="14"
                  class="check-icon"
                />
              </div>
            </div>
          </template>
        </div>

        <div class="picker-footer">
          <button
            type="button"
            class="quick-add-btn"
            @click.stop="startQuickAdd"
          >
            <Icon name="solar:add-circle-linear" size="14" />
            {{ searchQuery.trim() ? `新增分类「${searchQuery.trim()}」` : '新增分类' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { BillCategory, CategoryType, CategoryFormData } from '~/types/bill'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { getNextZIndex } from '~/composables/useZIndex'
import { fuzzyMatch } from '~/utils/pinyin'
import { useBillCategories } from '~/composables/useBillCategories'
import { useNotes } from '~/composables/useNotes'
import CategoryDialog from './CategoryDialog.vue'

interface TreeItem {
  id: string
  name: string
  level: number
  type: CategoryType
  children: string[]
}

const props = defineProps<{
  modelValue: string
  categories: BillCategory[]
  type?: 'income' | 'expense'
  placeholder?: string
  clearable?: boolean
  showParent?: boolean
  excludeId?: string
  frequencyMap?: Map<string, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const { createCategory } = useBillCategories()
const { noteOptions } = useNotes()
const effectiveFrequencyMap = computed(() => props.frequencyMap)

const placeholder = computed(() => props.placeholder || '请选择分类')
const open = ref(false)
const searchQuery = ref('')
const showCategoryDialog = ref(false)
const dialogDefaultName = ref('')
const dialogDefaultParentId = ref('')
const triggerRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)
const expandedIds = ref(new Set<string>())

const selectedName = computed(() => {
  const cat = props.categories.find(c => c.id === props.modelValue)
  return cat?.name || ''
})

/* ---------- 树形构建 ---------- */
// 性能优化：构建 parentId → category 的 Map，O(1) 查找替代 O(n) find
const categoryById = computed(() => {
  const map = new Map<string, BillCategory>()
  for (const c of props.categories) {
    map.set(c.id, c)
  }
  return map
})

// 性能优化：构建 parentId → children 的映射，缓存祖先关系
const parentMap = computed(() => {
  const map = new Map<string, string | null>()
  for (const c of props.categories) {
    map.set(c.id, c.parentId || null)
  }
  return map
})

const treeItems = computed(() => {
  const list = props.type
    ? props.categories.filter(c => c.type === props.type)
    : [...props.categories]

  const childrenMap = new Map<string, BillCategory[]>()
  for (const c of list) {
    if (c.parentId) {
      const siblings = childrenMap.get(c.parentId) || []
      siblings.push(c)
      childrenMap.set(c.parentId, siblings)
    }
  }
  for (const [, children] of childrenMap) {
    children.sort((a, b) => {
      const fa = effectiveFrequencyMap.value?.get(a.id) || 0
      const fb = effectiveFrequencyMap.value?.get(b.id) || 0
      if (fb !== fa) return fb - fa
      return a.order - b.order
    })
  }

  const result: TreeItem[] = []

  function walk(cat: BillCategory, level: number) {
    if (cat.id === props.excludeId) return
    result.push({
      id: cat.id,
      name: cat.name,
      level,
      type: cat.type,
      children: (childrenMap.get(cat.id) || []).map(c => c.id)
    })
    const children = childrenMap.get(cat.id) || []
    for (const child of children) {
      walk(child, level + 1)
    }
  }

  const roots = list.filter(c => !c.parentId).sort((a, b) => {
    const fa = effectiveFrequencyMap.value?.get(a.id) || 0
    const fb = effectiveFrequencyMap.value?.get(b.id) || 0
    if (fb !== fa) return fb - fa
    return a.order - b.order
  })
  for (const root of roots) {
    walk(root, 0)
  }

  return result
})

/* ---------- 搜索过滤 ---------- */
// 性能优化：使用 parentMap 替代嵌套 find，从 O(n²) 降到 O(n)
const displayItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return treeItems.value

  const allItems = treeItems.value
  const parentIdMap = parentMap.value
  const matchedIds = new Set(
    allItems.filter(i => fuzzyMatch(i.name, searchQuery.value.trim())).map(i => i.id)
  )

  const visibleIds = new Set<string>()
  for (const id of matchedIds) {
    visibleIds.add(id)
    // 祖先：使用 Map O(1) 查找
    let parentId = parentIdMap.get(id)
    while (parentId) {
      visibleIds.add(parentId)
      parentId = parentIdMap.get(parentId) || undefined
    }
  }
  // 后代：预先构建 children map
  const childrenOfId = new Map<string, string[]>()
  for (const item of allItems) {
    const pid = parentIdMap.get(item.id)
    if (pid) {
      const siblings = childrenOfId.get(pid) || []
      siblings.push(item.id)
      childrenOfId.set(pid, siblings)
    }
  }
  for (const id of matchedIds) {
    const collectDescendants = (pid: string) => {
      const children = childrenOfId.get(pid)
      if (!children) return
      for (const childId of children) {
        visibleIds.add(childId)
        collectDescendants(childId)
      }
    }
    collectDescendants(id)
  }

  return allItems.filter(i => visibleIds.has(i.id))
})

/* ---------- 渲染列表（考虑展开状态） ---------- */
function isExpanded(id: string): boolean {
  return expandedIds.value.has(id)
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

// 性能优化：使用 parentMap 替代嵌套 find
const renderItems = computed(() => {
  if (searchQuery.value.trim()) return displayItems.value
  const visible: TreeItem[] = []
  const parentIdMap = parentMap.value
  for (const item of treeItems.value) {
    let parentId = parentIdMap.get(item.id)
    let hidden = false
    while (parentId) {
      if (!expandedIds.value.has(parentId)) {
        hidden = true
        break
      }
      parentId = parentIdMap.get(parentId) || undefined
    }
    if (!hidden) visible.push(item)
  }
  return visible
})

// 关闭面板时重置展开状态，下次打开默认收起
watch(() => open.value, (isOpen) => {
  if (!isOpen) {
    expandedIds.value = new Set<string>()
    searchQuery.value = ''
  }
})

// 打开面板时，只展开选中分类的祖先路径
watch([() => open.value], ([isOpen]) => {
  if (!isOpen) return
  // 展开当前选中分类的祖先路径
  if (props.modelValue) {
    const parentIdMap = parentMap.value
    const ancestors = new Set<string>()
    let parentId = parentIdMap.get(props.modelValue)
    while (parentId) {
      ancestors.add(parentId)
      parentId = parentIdMap.get(parentId) || undefined
    }
    if (ancestors.size > 0) {
      expandedIds.value = new Set([...expandedIds.value, ...ancestors])
    }
  }
  resetActiveIndex()
}, { flush: 'post' })

/* ---------- 状态判断 ---------- */
// 性能优化：memoize isDisabled 结果
const disabledCache = new Map<string, boolean>()
function isDisabled(item: TreeItem): boolean {
  if (disabledCache.has(item.id)) return disabledCache.get(item.id)!
  if (item.id === props.excludeId) {
    disabledCache.set(item.id, true)
    return true
  }
  if (props.excludeId) {
    const parentIdMap = parentMap.value
    let parentId = parentIdMap.get(item.id)
    while (parentId) {
      if (parentId === props.excludeId) {
        disabledCache.set(item.id, true)
        return true
      }
      parentId = parentIdMap.get(parentId) || undefined
    }
  }
  disabledCache.set(item.id, false)
  return false
}

// 清除缓存当 categories 或 excludeId 变化
watch([() => props.categories, () => props.excludeId], () => {
  disabledCache.clear()
})

/* ---------- 交互 ---------- */
function select(item: TreeItem) {
  if (isDisabled(item)) return
  emit('update:modelValue', item.id)
  open.value = false
  searchQuery.value = ''
}

function clear() {
  emit('update:modelValue', '')
}

function toggleOpen() {
  if (open.value) {
    open.value = false
  } else {
    open.value = true
    nextTick(() => {
      updatePanelPosition()
      searchRef.value?.focus()
    })
  }
}

function updatePanelPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const MARGIN = 4
  const MIN_HEIGHT = 120
  const PANEL_MAX_HEIGHT = 320

  const spaceBelow = window.innerHeight - rect.bottom - MARGIN
  const spaceAbove = rect.top - MARGIN

  const placeAbove = spaceBelow < MIN_HEIGHT && spaceAbove > spaceBelow

  let top: number
  let maxHeight: number

  if (placeAbove) {
    maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceAbove)
    top = rect.top - maxHeight - MARGIN
  } else {
    maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceBelow)
    top = rect.bottom + MARGIN
  }

  if (top < MARGIN) top = MARGIN
  if (top + maxHeight > window.innerHeight - MARGIN) {
    maxHeight = window.innerHeight - top - MARGIN
  }

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(getNextZIndex())
  }
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    if (panelRef.value && panelRef.value.contains(target)) return
    open.value = false
  }
}

/* ---------- 键盘导航 ---------- */
function resetActiveIndex() {
  nextTick(() => {
    if (renderItems.value.length === 0) {
      activeIndex.value = -1
      return
    }
    if (props.modelValue) {
      const idx = renderItems.value.findIndex(i => i.id === props.modelValue)
      if (idx !== -1) {
        activeIndex.value = idx
        return
      }
    }
    const firstSelectable = renderItems.value.findIndex(i => !isDisabled(i))
    activeIndex.value = firstSelectable !== -1 ? firstSelectable : 0
  })
}

function moveSelection(delta: number) {
  const len = renderItems.value.length
  if (len === 0) return
  let nextIndex = activeIndex.value
  let attempts = 0
  do {
    nextIndex = (nextIndex + delta + len) % len
    attempts++
  } while (attempts < len && isDisabled(renderItems.value[nextIndex]))
  activeIndex.value = nextIndex
  nextTick(() => {
    const el = listRef.value?.children[nextIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectActive() {
  const item = renderItems.value[activeIndex.value]
  if (item && !isDisabled(item)) {
    select(item)
    return
  }
  // 无匹配结果且有搜索文字时，回车快捷新增
  if (activeIndex.value === -1 && searchQuery.value.trim()) {
    startQuickAdd()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value || renderItems.value.length === 0) return

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
    open.value = false
  }
}

/* ---------- 快捷新增 ---------- */
function startQuickAdd() {
  dialogDefaultName.value = searchQuery.value.trim()
  dialogDefaultParentId.value = ''
  open.value = false
  showCategoryDialog.value = true
}

function startQuickAddChild(parentId: string) {
  dialogDefaultName.value = searchQuery.value.trim()
  dialogDefaultParentId.value = parentId
  open.value = false
  showCategoryDialog.value = true
}

async function handleCreateCategory(data: CategoryFormData) {
  try {
    const category = await createCategory(data)
    showCategoryDialog.value = false
    searchQuery.value = ''
    emit('update:modelValue', category.id)
  } catch (e) {
    console.error('创建分类失败:', e)
  }
}

// 性能优化：仅在面板打开时添加滚动监听
watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('scroll', updatePanelPosition, true)
  } else {
    window.removeEventListener('scroll', updatePanelPosition, true)
  }
})

// 性能优化：节流 updatePanelPosition
let rafId: number | null = null
function throttledUpdatePanelPosition() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    updatePanelPosition()
    rafId = null
  })
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('resize', throttledUpdatePanelPosition)
  window.addEventListener('keydown', onKeyDown, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', throttledUpdatePanelPosition)
  window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

</script>

<style scoped>
.category-picker {
  position: relative;
}
.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  cursor: pointer;
  transition: border-color 0.15s ease;
  user-select: none;
}
.picker-trigger:hover {
  border-color: rgba(60, 60, 67, 0.35);
}
.picker-trigger .placeholder {
  color: rgba(60, 60, 67, 0.4);
}
.trigger-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  padding: 2px;
}
.clear-btn:hover {
  color: rgba(60, 60, 67, 0.7);
}
.arrow {
  color: rgba(60, 60, 67, 0.4);
  transition: transform 0.15s ease;
}
.arrow.open {
  transform: rotate(180deg);
}

.picker-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: var(--z-picker);
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
  color: rgba(60, 60, 67, 0.5);
}
.picker-search input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
  color: rgba(0, 0, 0, 0.92);
}
.picker-search input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.picker-list {
  overflow-y: auto;
  max-height: 240px;
}
.picker-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.5);
}
.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.1s ease;
  color: rgba(0, 0, 0, 0.92);
}
.picker-item:hover:not(.disabled) {
  background: rgba(0, 122, 255, 0.08);
}
.picker-item.is-active:not(.disabled) {
  background: rgba(0, 122, 255, 0.14);
}
.picker-item.active {
  color: rgb(0, 122, 255);
  font-weight: 500;
}
.picker-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.picker-item.is-parent:not(.disabled) {
  font-weight: 500;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.1s ease;
}
.expand-btn:hover {
  background: rgba(60, 60, 60, 0.08);
  color: rgba(60, 60, 67, 0.8);
}
.expand-placeholder {
  width: 18px;
  flex-shrink: 0;
}
.item-name {
  color: inherit;
}
.item-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.add-child-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background-color 0.1s ease;
}
.picker-item:hover .add-child-btn,
.add-child-btn.always-visible {
  opacity: 1;
}
.add-child-btn:hover {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.check-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}

.picker-footer {
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
  padding-top: 8px;
}
.quick-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.quick-add-btn:hover {
  background: rgba(0, 122, 255, 0.08);
}
.quick-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.quick-add-btn:hover {
  background: rgba(0, 122, 255, 0.08);
}
</style>
