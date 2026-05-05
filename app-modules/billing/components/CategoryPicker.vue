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
                  title="新增子分类"
                  @click.stop="emit('open-form', { type: props.type || 'expense', defaultParentId: item.id, defaultName: searchQuery.trim() })"
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
            @click.stop="emit('open-form', { type: props.type || 'expense', defaultParentId: renderItems[activeIndex]?.id, defaultName: searchQuery.trim() })"
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
import type { BillCategory, CategoryType } from '~/types/bill'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

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
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  create: [data: { name: string; type: CategoryType; parentId?: string }]
  'open-form': [data: { type: CategoryType; defaultParentId?: string; defaultName?: string }]
}>()

const placeholder = computed(() => props.placeholder || '请选择分类')
const open = ref(false)
const searchQuery = ref('')
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
    children.sort((a, b) => a.order - b.order)
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

  const roots = list.filter(c => !c.parentId).sort((a, b) => a.order - b.order)
  for (const root of roots) {
    walk(root, 0)
  }

  return result
})

/* ---------- 搜索过滤 ---------- */
const displayItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return treeItems.value

  const allItems = treeItems.value
  const matchedIds = new Set(
    allItems.filter(i => i.name.toLowerCase().includes(q)).map(i => i.id)
  )

  const visibleIds = new Set<string>()
  for (const id of matchedIds) {
    visibleIds.add(id)
    // 祖先
    let parentId = props.categories.find(c => c.id === id)?.parentId
    while (parentId) {
      visibleIds.add(parentId)
      parentId = props.categories.find(c => c.id === parentId)?.parentId
    }
    // 后代
    for (const desc of allItems) {
      let dp = props.categories.find(c => c.id === desc.id)?.parentId
      while (dp) {
        if (dp === id) {
          visibleIds.add(desc.id)
          break
        }
        dp = props.categories.find(c => c.id === dp)?.parentId
      }
    }
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

const renderItems = computed(() => {
  if (searchQuery.value.trim()) return displayItems.value
  const visible: TreeItem[] = []
  for (const item of treeItems.value) {
    let parentId = props.categories.find(c => c.id === item.id)?.parentId
    let hidden = false
    while (parentId) {
      if (!expandedIds.value.has(parentId)) {
        hidden = true
        break
      }
      parentId = props.categories.find(c => c.id === parentId)?.parentId
    }
    if (!hidden) visible.push(item)
  }
  return visible
})

watch(() => open.value, (v) => {
  if (v) {
    if (expandedIds.value.size === 0) {
      const all = new Set<string>()
      for (const item of treeItems.value) {
        if (item.children.length > 0) all.add(item.id)
      }
      expandedIds.value = all
    }
    resetActiveIndex()
  }
})

watch(searchQuery, () => {
  if (open.value) resetActiveIndex()
})

watch(renderItems, (items) => {
  if (!open.value) return
  if (activeIndex.value >= items.length || activeIndex.value < 0) {
    resetActiveIndex()
  }
})

/* ---------- 状态判断 ---------- */
function isDisabled(item: TreeItem): boolean {
  if (item.id === props.excludeId) return true
  if (props.excludeId) {
    let parentId = props.categories.find(c => c.id === item.id)?.parentId
    while (parentId) {
      if (parentId === props.excludeId) return true
      parentId = props.categories.find(c => c.id === parentId)?.parentId
    }
  }
  return false
}

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
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: '320px'
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
  if (item && !isDisabled(item)) select(item)
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

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('keydown', onKeyDown, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
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
.picker-item:hover .add-child-btn {
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
