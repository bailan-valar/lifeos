<template>
  <div
    class="heading-block"
    :class="[`heading-level-${level}`, { 'is-active': isActive }]"
    @click="onContainerClick"
  >
    <div class="level-switch" v-if="isActive">
      <button
        v-for="lv in [1, 2, 3]"
        :key="lv"
        class="level-btn"
        :class="{ active: level === lv }"
        @click.stop="setLevel(lv)"
        type="button"
      >
        H{{ lv }}
      </button>
    </div>

    <component
      :is="`h${level}`"
      contenteditable="true"
      class="block-content"
      :data-placeholder="placeholder"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
      ref="contentRef"
      spellcheck="false"
    />
    <div class="block-handle" v-if="isActive">
      <slot name="handle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Block } from '~/types/block'
import { useSlashCommand } from '~/composables/useSlashCommand'

interface Props {
  block: Block
  isActive?: boolean
}

interface Emits {
  (e: 'focus', id: string): void
  (e: 'update', block: Block): void
  (e: 'delete', id: string): void
  (e: 'enter', afterId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<Emits>()

const slash = useSlashCommand()

const contentRef = ref<HTMLElement | null>(null)
const isFocused = ref(false)

const level = computed(() => {
  const lv = props.block.metadata?.level
  if (lv === 2) return 2
  if (lv === 3) return 3
  return 1
})

const placeholder = computed(() => `标题 ${level.value}`)

const setContent = (html: string) => {
  if (contentRef.value && contentRef.value.innerHTML !== html) {
    contentRef.value.innerHTML = html || ''
  }
}

onMounted(() => {
  setContent(props.block.content)
  if (props.isActive) {
    nextTick(() => contentRef.value?.focus())
  }
})

watch(() => props.block.id, () => {
  setContent(props.block.content)
})

watch(() => props.block.content, (newVal) => {
  if (!isFocused.value) {
    setContent(newVal)
  }
})

watch(() => level.value, () => {
  nextTick(() => {
    setContent(props.block.content)
    if (isFocused.value) contentRef.value?.focus()
  })
})

watch(() => props.isActive, (active) => {
  if (active) {
    nextTick(() => contentRef.value?.focus())
  }
})

const setLevel = (lv: number) => {
  emit('update', {
    ...props.block,
    metadata: { ...(props.block.metadata || {}), level: lv },
    updatedAt: new Date().toISOString()
  })
}

const getTextBeforeCaret = (el: HTMLElement): string => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ''
  const range = sel.getRangeAt(0).cloneRange()
  range.setStart(el, 0)
  return range.toString()
}

const getCaretPosition = (el: HTMLElement): { top: number; left: number } => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) {
    const rect = el.getBoundingClientRect()
    return { top: rect.bottom + 6, left: rect.left }
  }
  const range = sel.getRangeAt(0).cloneRange()
  const rect = range.getBoundingClientRect()
  if (rect.top === 0 && rect.left === 0 && rect.width === 0) {
    const parentRect = el.getBoundingClientRect()
    return { top: parentRect.bottom + 6, left: parentRect.left }
  }
  return { top: rect.bottom + 6, left: rect.left }
}

const detectSlash = () => {
  if (!contentRef.value) return
  const before = getTextBeforeCaret(contentRef.value)
  const match = before.match(/(?:^|\s)\/([^\s/]*)$/)
  if (match) {
    const query = match[1] ?? ''
    const pos = getCaretPosition(contentRef.value)
    if (slash.state.visible && slash.state.blockId === props.block.id) {
      slash.update(query, pos)
    } else {
      slash.open(props.block.id, query, pos)
    }
  } else if (slash.state.visible && slash.state.blockId === props.block.id) {
    slash.close()
  }
}

const placeCaretAtEnd = (el: HTMLElement) => {
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const clearSlashQuery = () => {
  if (!contentRef.value) return
  const text = contentRef.value.innerText
  const cleared = text.replace(/(^|\s)\/[^\s/]*$/, (_m, prefix) => prefix || '')
  contentRef.value.innerText = cleared
  placeCaretAtEnd(contentRef.value)
  emit('update', {
    ...props.block,
    content: contentRef.value.innerHTML,
    updatedAt: new Date().toISOString()
  })
}

watch(() => slash.state.clearRequestId, () => {
  if (slash.state.blockId === props.block.id) {
    clearSlashQuery()
  }
})

const onInput = (e: Event) => {
  const target = e.target as HTMLElement
  emit('update', {
    ...props.block,
    content: target.innerHTML,
    updatedAt: new Date().toISOString()
  })
  detectSlash()
}

const onKeydown = (e: KeyboardEvent) => {
  if (slash.state.visible && slash.state.blockId === props.block.id) {
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('enter', props.block.id)
  } else if (e.key === 'Backspace' && !contentRef.value?.innerText.trim()) {
    e.preventDefault()
    emit('delete', props.block.id)
  }
}

const onFocus = () => {
  isFocused.value = true
  emit('focus', props.block.id)
}

const onBlur = () => {
  isFocused.value = false
  if (slash.state.blockId === props.block.id && slash.state.visible) {
    setTimeout(() => slash.close(), 150)
  }
}

const onContainerClick = () => {
  emit('focus', props.block.id)
  contentRef.value?.focus()
}

defineExpose({ clearSlashQuery })
</script>

<style scoped>
.heading-block {
  position: relative;
  padding: 6px 12px;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.heading-block:hover {
  background-color: rgba(120, 120, 128, 0.08);
}

.heading-block.is-active {
  background-color: rgba(0, 122, 255, 0.06);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.18);
}

.level-switch {
  position: absolute;
  top: -34px;
  left: 12px;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.14);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  z-index: 5;
}

.level-btn {
  min-width: 32px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.level-btn:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.88);
}

.level-btn.active {
  background: rgb(0, 122, 255);
  color: white;
}

.block-content {
  outline: none;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.92);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.block-content:empty::before {
  content: attr(data-placeholder);
  color: rgba(60, 60, 67, 0.32);
  font-weight: 600;
  pointer-events: none;
}

.heading-level-1 .block-content {
  font-size: 32px;
  line-height: 1.2;
}

.heading-level-2 .block-content {
  font-size: 24px;
  line-height: 1.25;
}

.heading-level-3 .block-content {
  font-size: 20px;
  line-height: 1.3;
}

.block-handle {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.heading-block:hover .block-handle,
.heading-block.is-active .block-handle {
  opacity: 1;
}
</style>
