<template>
  <div
    class="todo-block"
    :class="{ 'is-active': isActive, 'is-checked': checked }"
    @click="onContainerClick"
  >
    <button
      class="todo-checkbox"
      :class="{ checked }"
      type="button"
      :aria-pressed="checked"
      @click.stop="toggleChecked"
      @mousedown.stop
    >
      <Icon v-if="checked" name="solar:check-circle-bold" class="check-icon" />
      <span v-else class="check-empty" />
    </button>

    <div
      contenteditable="true"
      class="block-content"
      data-placeholder="待办事项..."
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
      ref="contentRef"
      spellcheck="false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Block } from '~/types/block'
import { useSlashCommand } from '~/composables/useSlashCommand'
import { useBlockFocus } from '~/composables/useBlockFocus'

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
const focusBus = useBlockFocus()

const contentRef = ref<HTMLElement | null>(null)
const isFocused = ref(false)

const checked = computed(() => props.block.metadata?.checked === true)

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

const toggleChecked = () => {
  emit('update', {
    ...props.block,
    metadata: { ...(props.block.metadata || {}), checked: !checked.value },
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

watch(() => focusBus.state.endRequestId, () => {
  if (focusBus.state.targetId === props.block.id && props.isActive) {
    nextTick(() => placeCaretAtEnd(contentRef.value!))
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
.todo-block {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.todo-block:hover {
  background-color: rgba(120, 120, 128, 0.08);
}

.todo-block.is-active {
  background-color: rgba(0, 122, 255, 0.06);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.18);
}

.todo-checkbox {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 4px;
  border: none;
  border-radius: 7px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s ease;
}

.todo-checkbox:hover {
  transform: scale(1.06);
}

.todo-checkbox:active {
  transform: scale(0.94);
}

.check-empty {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1.5px solid rgba(60, 60, 67, 0.32);
  background: rgba(255, 255, 255, 0.6);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.todo-checkbox:hover .check-empty {
  border-color: rgba(0, 122, 255, 0.6);
}

.check-icon {
  font-size: 22px;
  color: rgb(0, 122, 255);
}

.block-content {
  flex: 1;
  outline: none;
  min-height: 28px;
  line-height: 1.65;
  font-size: 16px;
  letter-spacing: -0.01em;
  color: rgba(0, 0, 0, 0.88);
  word-wrap: break-word;
  white-space: pre-wrap;
  transition: color 0.18s ease, text-decoration-color 0.18s ease;
}

.todo-block.is-checked .block-content {
  color: rgba(60, 60, 67, 0.45);
  text-decoration: line-through;
  text-decoration-color: rgba(60, 60, 67, 0.45);
  text-decoration-thickness: 1.5px;
}

.block-content:empty::before {
  content: attr(data-placeholder);
  color: rgba(60, 60, 67, 0.36);
  pointer-events: none;
}
</style>
