<template>
  <div
    class="code-block"
    :class="{ 'is-active': isActive }"
    @click="$emit('focus', block.id)"
  >
    <div class="code-header">
      <div class="code-dots">
        <span class="dot dot-red" />
        <span class="dot dot-yellow" />
        <span class="dot dot-green" />
      </div>
      <select
        class="language-selector"
        :value="block.metadata?.language || ''"
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
        <option value="json">JSON</option>
        <option value="markdown">Markdown</option>
      </select>
    </div>
    <pre class="code-content">
      <code
        contenteditable="true"
        @input="onInput"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
        ref="contentRef"
        spellcheck="false"
        data-placeholder="// 输入代码..."
      />
    </pre>
  </div>
</template>

<script setup lang="ts">
import type { Block } from '~/types/block'
import { useBlockFocus } from '~/composables/useBlockFocus'

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
const focusBus = useBlockFocus()

const contentRef = ref<HTMLElement | null>(null)
const isFocused = ref(false)

const placeCaretAtEnd = (el: HTMLElement) => {
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const setContent = (text: string) => {
  if (contentRef.value && contentRef.value.textContent !== text) {
    contentRef.value.textContent = text || ''
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

watch(() => focusBus.state.endRequestId, () => {
  if (focusBus.state.targetId === props.block.id && props.isActive) {
    nextTick(() => placeCaretAtEnd(contentRef.value!))
  }
})

const onLanguageChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update', {
    ...props.block,
    metadata: { ...(props.block.metadata || {}), language: target.value },
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
  } else if (e.key === 'Backspace' && !contentRef.value?.textContent) {
    e.preventDefault()
    emit('delete', props.block.id)
  }
}

const onFocus = () => {
  isFocused.value = true
}

const onBlur = () => {
  isFocused.value = false
}
</script>

<style scoped>
.code-block {
  position: relative;
  margin: 8px 0;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(28, 28, 30, 0.92);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: all 0.18s ease;
}

.code-block:hover {
  border-color: rgba(0, 122, 255, 0.35);
}

.code-block.is-active {
  border-color: rgba(0, 122, 255, 0.55);
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.22),
    0 0 0 3px rgba(0, 122, 255, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.code-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
}

.code-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.dot-red { background: rgb(255, 95, 86); }
.dot-yellow { background: rgb(255, 189, 46); }
.dot-green { background: rgb(39, 201, 63); }

.language-selector {
  margin-left: auto;
  padding: 4px 10px;
  border: 0.5px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.language-selector:hover {
  background: rgba(255, 255, 255, 0.1);
}

.language-selector option {
  background: rgb(28, 28, 30);
  color: white;
}

.code-content {
  margin: 0;
  padding: 14px 18px;
  background: transparent;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Ubuntu Mono', monospace;
  font-size: 13.5px;
  line-height: 1.65;
  overflow-x: auto;
  min-height: 64px;
  color: rgba(255, 255, 255, 0.92);
}

.code-content code {
  display: block;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 1.65em;
}

.code-content code:empty::before {
  content: attr(data-placeholder);
  color: rgba(255, 255, 255, 0.32);
  pointer-events: none;
}
</style>
