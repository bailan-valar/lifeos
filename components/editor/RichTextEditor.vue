<template>
  <div class="rich-text-editor">
    <div v-if="showToolbar" class="editor-toolbar">
      <button
        type="button"
        class="toolbar-btn"
        title="粗体"
        :class="{ active: isActive.bold() }"
        @click="commands.bold"
      >
        <Icon :name="SOLAR_ICONS.editor.bold" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="斜体"
        :class="{ active: isActive.italic() }"
        @click="commands.italic"
      >
        <Icon :name="SOLAR_ICONS.editor.italic" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="下划线"
        :class="{ active: isActive.underline() }"
        @click="commands.underline"
      >
        <Icon :name="SOLAR_ICONS.editor.underline" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="删除线"
        :class="{ active: isActive.strike() }"
        @click="commands.strike"
      >
        <Icon :name="SOLAR_ICONS.editor.strikeThrough" />
      </button>
      <div class="toolbar-divider"></div>
      <button
        type="button"
        class="toolbar-btn"
        title="无序列表"
        :class="{ active: isActive.bulletList() }"
        @click="commands.bulletList"
      >
        <Icon :name="SOLAR_ICONS.list.bullet" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="有序列表"
        :class="{ active: isActive.orderedList() }"
        @click="commands.orderedList"
      >
        <Icon :name="SOLAR_ICONS.list.ordered" />
      </button>
      <div class="toolbar-divider"></div>
      <button
        type="button"
        class="toolbar-btn"
        title="链接"
        :class="{ active: isActive.link() }"
        @click="commands.link"
      >
        <Icon :name="SOLAR_ICONS.editor.link" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="清除格式"
        @click="commands.clearFormatting"
      >
        <Icon :name="SOLAR_ICONS.editor.eraser" />
      </button>
    </div>
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { SOLAR_ICONS } from '~/composables/useIcons'

interface Props {
  modelValue: string
  placeholder?: string
  showToolbar?: boolean
  editable?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入内容...',
  showToolbar: true,
  editable: true
})

const emit = defineEmits<Emits>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      link: false  // 排除内置的 link，使用自定义配置
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank'
      }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    })
  ],
  editable: props.editable,
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

const isActive = computed(() => ({
  bold: () => editor.value?.isActive('bold') || false,
  italic: () => editor.value?.isActive('italic') || false,
  underline: () => editor.value?.isActive('underline') || false,
  strike: () => editor.value?.isActive('strike') || false,
  bulletList: () => editor.value?.isActive('bulletList') || false,
  orderedList: () => editor.value?.isActive('orderedList') || false,
  link: () => editor.value?.isActive('link') || false
}))

const commands = {
  bold: () => editor.value?.chain().focus().toggleBold().run(),
  italic: () => editor.value?.chain().focus().toggleItalic().run(),
  underline: () => editor.value?.chain().focus().toggleUnderline().run(),
  strike: () => editor.value?.chain().focus().toggleStrike().run(),
  bulletList: () => editor.value?.chain().focus().toggleBulletList().run(),
  orderedList: () => editor.value?.chain().focus().toggleOrderedList().run(),
  link: () => {
    const url = window.prompt('请输入链接地址:')
    if (url) {
      editor.value?.chain().focus().setLink({ href: url }).run()
    }
  },
  clearFormatting: () => editor.value?.chain().focus().unsetAllMarks().run()
}

watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value, false)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--liquid-radius);
  overflow: hidden;
  background: var(--liquid-bg-thin);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.5);
  flex-wrap: wrap;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--liquid-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 16px;
}

.toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
}

.toolbar-btn.active {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 4px;
}

.editor-content {
  padding: 12px 16px;
  min-height: 120px;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--liquid-text-primary);
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--liquid-text-tertiary);
  pointer-events: none;
  height: 0;
}

.editor-content :deep(.ProseMirror a) {
  color: rgb(0, 122, 255);
  text-decoration: underline;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 20px;
}

.editor-content :deep(.ProseMirror li) {
  margin: 4px 0;
}

.editor-content :deep(.ProseMirror code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
