<template>
  <div class="note-picker">
    <div ref="triggerRef" class="picker-trigger" @click.stop="toggleOpen">
      <span :class="{ placeholder: !selectedTitle }">{{ selectedTitle || placeholder }}</span>
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
      <div v-if="open" ref="panelRef" class="picker-panel note-picker-panel" :style="panelStyle">
        <div class="picker-search">
          <Icon name="solar:magnifer-linear" size="14" />
          <input
            ref="searchRef"
            v-model="searchQuery"
            placeholder="搜索笔记..."
            @click.stop
          />
        </div>

        <div ref="listRef" class="picker-list">
          <div v-if="displayItems.length === 0" class="picker-empty">
            无匹配结果
          </div>
          <template v-else>
            <div
              v-for="(item, index) in displayItems"
              :key="item.id"
              class="picker-item"
              :class="{
                active: modelValue === item.id,
                'is-active': index === activeIndex
              }"
              :style="{ paddingLeft: `${12 + item.level * 16}px` }"
              @mouseenter="activeIndex = index"
              @click.stop="select(item)"
            >
              <div class="item-left">
                <span class="item-name">{{ item.title }}</span>
              </div>
              <Icon
                v-if="modelValue === item.id"
                name="solar:check-circle-linear"
                size="14"
                class="check-icon"
              />
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { getNextZIndex } from '~/composables/useZIndex'

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  modelValue: string
  options: NoteOption[]
  placeholder?: string
  clearable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const placeholder = computed(() => props.placeholder || '请选择笔记')
const open = ref(false)
const searchQuery = ref('')
const triggerRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)

const selectedTitle = computed(() => {
  const note = props.options.find(o => o.id === props.modelValue)
  return note?.title || ''
})

/* ---------- 搜索过滤 ---------- */
const displayItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.title.toLowerCase().includes(q))
})

/* ---------- 交互 ---------- */
function select(item: NoteOption) {
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
    nextTick(() => requestAnimationFrame(() => {
      updatePanelPosition()
      searchRef.value?.focus()
      resetActiveIndex()
    }))
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
    maxHeight: '320px',
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
    if (displayItems.value.length === 0) {
      activeIndex.value = -1
      return
    }
    if (props.modelValue) {
      const idx = displayItems.value.findIndex(i => i.id === props.modelValue)
      if (idx !== -1) {
        activeIndex.value = idx
        return
      }
    }
    activeIndex.value = 0
  })
}

function moveSelection(delta: number) {
  const len = displayItems.value.length
  if (len === 0) return
  activeIndex.value = (activeIndex.value + delta + len) % len
  nextTick(() => {
    const el = listRef.value?.children[activeIndex.value] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectActive() {
  const item = displayItems.value[activeIndex.value]
  if (item) select(item)
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value || displayItems.value.length === 0) return

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

watch(() => open.value, (v) => {
  if (v) resetActiveIndex()
})

watch(searchQuery, () => {
  if (open.value) resetActiveIndex()
})

watch(displayItems, (items) => {
  if (!open.value) return
  if (activeIndex.value >= items.length || activeIndex.value < 0) {
    resetActiveIndex()
  }
})

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
.note-picker {
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
.picker-item:hover {
  background: rgba(0, 122, 255, 0.08);
}
.picker-item.is-active {
  background: rgba(0, 122, 255, 0.14);
}
.picker-item.active {
  color: rgb(0, 122, 255);
  font-weight: 500;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.item-name {
  color: inherit;
}
.check-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}
</style>
