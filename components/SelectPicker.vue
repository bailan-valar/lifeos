<template>
  <div class="select-picker">
    <div ref="triggerRef" class="picker-trigger" :class="{ disabled: disabled }" @click.stop="toggleOpen">
      <span :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      <div class="trigger-right">
        <button
          v-if="clearable && modelValue !== '' && modelValue !== null && modelValue !== undefined"
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
      <Transition name="picker-fade">
        <div v-if="open" ref="panelRef" class="picker-panel" :style="panelStyle">
          <!-- 搜索框 -->
          <div v-if="searchable" class="picker-search">
            <Icon name="solar:magnifer-linear" size="14" />
            <input
              ref="searchRef"
              v-model="searchQuery"
              placeholder="搜索..."
              @click.stop
            />
          </div>

          <!-- 选项列表 -->
          <div ref="listRef" class="picker-list">
            <div v-if="filteredOptions.length === 0" class="picker-empty">
              {{ searchQuery ? '无匹配结果' : emptyText }}
            </div>
            <template v-else>
              <div
                v-for="(option, index) in filteredOptions"
                :key="getOptionValue(option)"
                class="picker-item"
                :class="{
                  active: isOptionSelected(option),
                  disabled: option.disabled || false,
                  'is-active': index === activeIndex
                }"
                @mouseenter="activeIndex = index"
                @click.stop="selectOption(option)"
              >
                <span class="item-label">{{ getOptionLabel(option) }}</span>
                <Icon
                  v-if="isOptionSelected(option)"
                  name="solar:check-circle-linear"
                  size="14"
                  class="check-icon"
                />
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { getNextZIndex } from '~/composables/useZIndex'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  [key: string]: any
}

interface Props {
  modelValue: string | number | null
  options: SelectOption[]
  placeholder?: string
  emptyText?: string
  clearable?: boolean
  searchable?: boolean
  disabled?: boolean
  valueKey?: string
  labelKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  emptyText: '暂无数据',
  clearable: false,
  searchable: false,
  disabled: false,
  valueKey: 'value',
  labelKey: 'label'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  'change': [value: string | number | null, option: SelectOption]
}>()

const open = ref(false)
const searchQuery = ref('')
const triggerRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)

// 获取选项的值
function getOptionValue(option: SelectOption): string | number {
  return option[props.valueKey] as string | number
}

// 获取选项的标签
function getOptionLabel(option: SelectOption): string {
  return option[props.labelKey] as string
}

// 当前选中项的标签
const selectedLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === '' || props.modelValue === undefined) {
    return ''
  }
  const option = props.options.find(opt => getOptionValue(opt) === props.modelValue)
  return option ? getOptionLabel(option) : ''
})

// 过滤后的选项
const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value.trim()) {
    return props.options
  }
  const query = searchQuery.value.trim().toLowerCase()
  return props.options.filter(opt => {
    const label = getOptionLabel(opt)
    return label.toLowerCase().includes(query)
  })
})

// 判断选项是否被选中
function isOptionSelected(option: SelectOption): boolean {
  return getOptionValue(option) === props.modelValue
}

// 选择选项
function selectOption(option: SelectOption) {
  if (option.disabled) return
  const value = getOptionValue(option)
  emit('update:modelValue', value)
  emit('change', value, option)
  open.value = false
  searchQuery.value = ''
}

// 清除选择
function clear() {
  emit('update:modelValue', null)
  emit('change', null, null as any)
}

// 切换开关
function toggleOpen() {
  if (props.disabled) return
  if (open.value) {
    open.value = false
  } else {
    open.value = true
    nextTick(() => requestAnimationFrame(() => {
      updatePanelPosition()
      if (props.searchable) {
        searchRef.value?.focus()
      }
      resetActiveIndex()
    }))
  }
}

// 更新面板位置
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

// 点击外部关闭
function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    if (panelRef.value && panelRef.value.contains(target)) return
    open.value = false
  }
}

// 重置活动索引
function resetActiveIndex() {
  nextTick(() => {
    if (filteredOptions.value.length === 0) {
      activeIndex.value = -1
      return
    }
    if (props.modelValue !== null && props.modelValue !== '' && props.modelValue !== undefined) {
      const idx = filteredOptions.value.findIndex(opt => isOptionSelected(opt))
      if (idx !== -1) {
        activeIndex.value = idx
        return
      }
    }
    const firstSelectable = filteredOptions.value.findIndex(opt => !opt.disabled)
    activeIndex.value = firstSelectable !== -1 ? firstSelectable : 0
  })
}

// 键盘导航
function moveSelection(delta: number) {
  const len = filteredOptions.value.length
  if (len === 0) return
  let nextIndex = activeIndex.value
  let attempts = 0
  do {
    nextIndex = (nextIndex + delta + len) % len
    attempts++
  } while (attempts < len && filteredOptions.value[nextIndex].disabled)
  activeIndex.value = nextIndex
  nextTick(() => {
    const el = listRef.value?.children[nextIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectActive() {
  const option = filteredOptions.value[activeIndex.value]
  if (option && !option.disabled) {
    selectOption(option)
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value || filteredOptions.value.length === 0) return

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

// 监听搜索变化
watch(searchQuery, () => {
  if (open.value) resetActiveIndex()
})

// 监听选项变化
watch(filteredOptions, () => {
  if (!open.value) return
  if (activeIndex.value >= filteredOptions.value.length || activeIndex.value < 0) {
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
.select-picker {
  position: relative;
  display: inline-block;
  width: 100%;
}

/* 触发器 - 参考 CategoryPicker */
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

.picker-trigger:hover:not(.disabled) {
  border-color: rgba(60, 60, 67, 0.35);
}

.picker-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(60, 60, 67, 0.06);
}

.picker-trigger .placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.trigger-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
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
  border-radius: 4px;
}

.clear-btn:hover {
  color: rgba(60, 60, 67, 0.7);
  background: rgba(60, 60, 67, 0.08);
}

.arrow {
  color: rgba(60, 60, 67, 0.4);
  transition: transform 0.15s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

/* 下拉面板 - Liquid Glass 风格 */
.picker-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: var(--z-picker);
}

/* 搜索框 */
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

/* 选项列表 */
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
  gap: 8px;
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

.item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}

/* 动画 */
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .picker-trigger {
    background: rgba(60, 60, 67, 0.3);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.92);
  }

  .picker-trigger:hover:not(.disabled) {
    border-color: rgba(255, 255, 255, 0.25);
  }

  .picker-trigger .placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .picker-trigger.disabled {
    background: rgba(255, 255, 255, 0.06);
  }

  .clear-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .clear-btn:hover {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.1);
  }

  .arrow {
    color: rgba(255, 255, 255, 0.5);
  }

  .picker-panel {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .picker-search {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
  }

  .picker-search input {
    color: rgba(255, 255, 255, 0.92);
  }

  .picker-search input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .picker-empty {
    color: rgba(255, 255, 255, 0.5);
  }

  .picker-item {
    color: rgba(255, 255, 255, 0.92);
  }

  .picker-item:hover:not(.disabled) {
    background: rgba(0, 122, 255, 0.2);
  }

  .picker-item.is-active:not(.disabled) {
    background: rgba(0, 122, 255, 0.3);
  }
}
</style>
