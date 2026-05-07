<template>
  <div class="bill-type-picker">
    <div ref="triggerRef" class="picker-trigger" @click.stop="toggleOpen">
      <span :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      <div class="trigger-right">
        <button
          v-if="clearable && modelValue != null"
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
          :class="{ open }"
        />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="picker-panel bill-type-picker-panel"
        :style="panelStyle"
      >
        <div class="picker-list">
          <div
            v-for="opt in options"
            :key="opt.value ?? 'null'"
            class="picker-item"
            :class="{ active: (modelValue ?? null) === opt.value }"
            @click.stop="select(opt.value)"
          >
            <span class="item-name">{{ opt.label }}</span>
            <Icon
              v-if="(modelValue ?? null) === opt.value"
              name="solar:check-circle-linear"
              size="14"
              class="check-icon"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { BillType } from '~/types/bill'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { getNextZIndex } from '~/composables/useZIndex'

const props = defineProps<{
  modelValue: BillType | null | undefined
  placeholder?: string
  clearable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BillType | null]
}>()

const placeholder = computed(() => props.placeholder || '请选择账单类型')
const open = ref(false)
const triggerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})

const options: { value: BillType | null; label: string }[] = [
  { value: null, label: '不指定' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'transfer', label: '转账' },
  { value: 'debt', label: '借贷' }
]

const selectedLabel = computed(() => {
  const opt = options.find(o => o.value === (props.modelValue ?? null))
  return opt?.label || ''
})

function select(value: BillType | null) {
  emit('update:modelValue', value)
  open.value = false
}

function clear() {
  emit('update:modelValue', null)
}

function toggleOpen() {
  if (open.value) {
    open.value = false
  } else {
    open.value = true
    nextTick(() => requestAnimationFrame(() => updatePanelPosition()))
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

function onKeyDown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
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
.bill-type-picker {
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
.picker-list {
  overflow-y: auto;
  max-height: 240px;
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
.item-name {
  color: inherit;
}
.check-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}
</style>
