<template>
  <div
    class="quote-block"
    :class="{ 'is-active': isActive }"
    @click="onContainerClick"
  >
    <div class="quote-bar" />
    <div class="quote-icon">"</div>
    <div
      contenteditable="true"
      class="block-content"
      data-placeholder="引用一段重要内容..."
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

const contentRef = ref<HTMLElement | null>(null)
const isFocused = ref(false)

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

const onInput = (e: Event) => {
  const target = e.target as HTMLElement
  emit('update', {
    ...props.block,
    content: target.innerHTML,
    updatedAt: new Date().toISOString()
  })
}

const onKeydown = (e: KeyboardEvent) => {
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
}

const onContainerClick = () => {
  emit('focus', props.block.id)
  contentRef.value?.focus()
}
</script>

<style scoped>
.quote-block {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px 14px 22px;
  margin: 8px 0;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    rgba(0, 122, 255, 0.08) 0%,
    rgba(94, 92, 230, 0.06) 100%
  );
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  backdrop-filter: blur(20px) saturate(160%);
  border: 0.5px solid rgba(0, 122, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
}

.quote-block:hover {
  border-color: rgba(0, 122, 255, 0.32);
}

.quote-block.is-active {
  border-color: rgba(0, 122, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    0 0 0 3px rgba(0, 122, 255, 0.14);
}

.quote-bar {
  position: absolute;
  left: 6px;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    rgb(0, 122, 255) 0%,
    rgb(94, 92, 230) 100%
  );
}

.quote-icon {
  flex-shrink: 0;
  font-size: 28px;
  line-height: 1;
  color: rgb(0, 122, 255);
  opacity: 0.55;
  font-family: Georgia, serif;
  margin-top: -4px;
}

.block-content {
  flex: 1;
  outline: none;
  font-style: italic;
  font-size: 16px;
  line-height: 1.65;
  letter-spacing: -0.01em;
  color: rgba(0, 0, 0, 0.84);
  min-height: 24px;
  word-wrap: break-word;
}

.block-content:empty::before {
  content: attr(data-placeholder);
  color: rgba(60, 60, 67, 0.36);
  font-style: italic;
  pointer-events: none;
}

.block-handle {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.quote-block:hover .block-handle,
.quote-block.is-active .block-handle {
  opacity: 1;
}
</style>
