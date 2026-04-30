<template>
  <div
    class="code-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div class="code-header">
      <select
        class="language-selector"
        v-model="language"
        @change="onLanguageChange"
        @click.stop
      >
        <option value="">Plain Text</option>
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="cpp">C++</option>
        <option value="go">Go</option>
        <option value="rust">Rust</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="sql">SQL</option>
        <option value="bash">Bash</option>
      </select>
    </div>
    <pre
      class="code-content"
      :class="{ 'is-empty': !block.content }"
    >
      <code
        :contenteditable="true"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
        ref="contentRef"
        spellcheck="false"
      >{{ block.content }}</code>
    </pre>
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
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<Emits>()

const contentRef = ref<HTMLElement | null>(null)

const language = computed({
  get: () => props.block.metadata.language || '',
  set: (value: string) => value
})

const onLanguageChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update', {
    ...props.block,
    metadata: {
      ...props.block.metadata,
      language: target.value
    },
    updatedAt: new Date().toISOString()
  })
}

const onInput = (e: Event) => {
  const target = e.target as HTMLElement
  emit('update', {
    ...props.block,
    content: target.textContent || '',
    updatedAt: new Date().toISOString()
  })
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '  ')
  } else if (e.key === 'Enter') {
    e.preventDefault()
    document.execCommand('insertText', false, '\n')
  }
}

const onBlur = () => {
  if (contentRef.value) {
    contentRef.value.textContent = props.block.content
  }
}

watch(() => props.isActive, (active) => {
  if (active && contentRef.value) {
    contentRef.value.focus()
  }
})
</script>

<style scoped>
.code-block {
  position: relative;
  margin: 8px 0;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s;
}

.code-block:hover {
  border-color: rgba(0, 122, 255, 0.3);
}

.code-block.is-active {
  border-color: rgba(0, 122, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.code-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.language-selector {
  padding: 4px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background: white;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.language-selector:focus {
  border-color: rgb(0, 122, 255);
}

.code-content {
  margin: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.01);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: auto;
  min-height: 60px;
}

.code-content code {
  display: block;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-content.is-empty::before {
  content: 'Type code here...';
  color: rgba(0, 0, 0, 0.4);
}

.block-handle {
  position: absolute;
  left: -24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.code-block:hover .block-handle {
  opacity: 1;
}
</style>
