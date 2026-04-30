<template>
  <div
    class="heading-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <component
      :is="`h${level}`"
      :contenteditable="true"
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

const level = computed(() => props.block.metadata.level || 1)

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
.heading-block {
  position: relative;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.heading-block:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.heading-block.is-active {
  background-color: rgba(0, 122, 255, 0.05);
}

.block-content {
  outline: none;
  margin: 0;
  font-weight: 600;
  line-height: 1.3;
}

.heading-block h1 {
  font-size: 2rem;
}

.heading-block h2 {
  font-size: 1.5rem;
}

.heading-block h3 {
  font-size: 1.25rem;
}

.block-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.heading-block:hover .block-handle {
  opacity: 1;
}
</style>
