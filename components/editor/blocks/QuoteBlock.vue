<template>
  <div
    class="quote-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div class="quote-icon">"</div>
    <div
      contenteditable="true"
      class="block-content"
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
      ref="contentRef"
      v-html="block.content"
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
  } else if (e.key === 'Backspace' && !props.block.content) {
    e.preventDefault()
    emit('delete', props.block.id)
  }
}

const onBlur = () => {
  if (contentRef.value) {
    contentRef.value.innerHTML = props.block.content
  }
}

watch(() => props.isActive, (active) => {
  if (active && contentRef.value) {
    contentRef.value.focus()
  }
})
</script>

<style scoped>
.quote-block {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  margin: 8px 0;
  border-left: 3px solid rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.05);
  border-radius: 0 8px 8px 0;
  transition: all 0.2s;
}

.quote-block:hover {
  background: rgba(0, 122, 255, 0.08);
}

.quote-block.is-active {
  background: rgba(0, 122, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.quote-icon {
  font-size: 32px;
  line-height: 1;
  color: rgb(0, 122, 255);
  opacity: 0.5;
  font-family: Georgia, serif;
}

.block-content {
  flex: 1;
  outline: none;
  font-style: italic;
  line-height: 1.6;
  min-height: 24px;
}

.block-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.quote-block:hover .block-handle {
  opacity: 1;
}
</style>
