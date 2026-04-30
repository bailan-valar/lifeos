<template>
  <div
    class="text-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div
      contenteditable="true"
      class="block-content"
      :class="alignClass"
      :style="{ color: block.metadata.color }"
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

const alignClass = computed(() => {
  const align = props.block.metadata.align || 'left'
  return `text-${align}`
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
.text-block {
  position: relative;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.text-block:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.text-block.is-active {
  background-color: rgba(0, 122, 255, 0.05);
}

.block-content {
  outline: none;
  min-height: 24px;
  line-height: 1.6;
  word-wrap: break-word;
}

.block-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.text-block:hover .block-handle {
  opacity: 1;
}
</style>
