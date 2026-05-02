<template>
  <div
    class="text-block"
    :class="{ 'is-active': isActive }"
    @click="onContainerClick"
  >
    <div
      contenteditable="true"
      class="block-content"
      :class="alignClass"
      :style="contentStyle"
      data-placeholder="输入 / 唤起命令，或开始书写..."
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

const alignClass = computed(() => {
  const align = props.block.metadata?.align || 'left'
  return `text-${align}`
})

const contentStyle = computed(() => {
  const color = props.block.metadata?.color
  return color ? { color } : {}
})

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

watch(() => props.isActive, (active) => {
  if (active) {
    nextTick(() => contentRef.value?.focus())
  }
})

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
.text-block {
  position: relative;
  padding: 6px 12px;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.text-block:hover {
  background-color: rgba(120, 120, 128, 0.08);
}

.text-block.is-active {
  background-color: rgba(0, 122, 255, 0.06);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.18);
}

.block-content {
  outline: none;
  min-height: 28px;
  line-height: 1.65;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: rgba(0, 0, 0, 0.88);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.block-content:empty::before {
  content: attr(data-placeholder);
  color: rgba(60, 60, 67, 0.36);
  pointer-events: none;
}

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.block-handle {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.text-block:hover .block-handle,
.text-block.is-active .block-handle {
  opacity: 1;
}
</style>
