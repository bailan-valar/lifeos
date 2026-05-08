<template>
  <div class="block-editor">
    <div class="editor-title-bar">
      <input
        ref="titleInputRef"
        v-model="titleDraft"
        class="note-title-input"
        type="text"
        placeholder="无标题"
        spellcheck="false"
        @input="scheduleTitleSave"
        @blur="flushTitleSave"
        @keydown.enter.prevent="onTitleEnter"
      />
      <button
        v-if="noteClassBadge"
        class="title-class-badge"
        :style="{ background: noteClassBadge.color + '18', color: noteClassBadge.color, border: `0.5px solid ${noteClassBadge.color}30` }"
        type="button"
        @click="drawerVisible = true"
      >
        <Icon :name="noteClassBadge.icon" />
        <span>{{ noteClassBadge.name }}</span>
      </button>
      <button
        v-else
        class="title-class-badge undefined"
        type="button"
        @click="drawerVisible = true"
      >
        <Icon name="solar:question-circle-linear" />
        <span>未定义</span>
      </button>
    </div>

    <div class="editor-scroll">
      <BlockList
        :blocks="blocks"
        :active-block-id="activeBlockId"
        @focus="handleBlockFocus"
        @update="handleBlockUpdate"
        @delete="handleBlockDelete"
        @enter="handleBlockEnter"
        @move="handleBlockMove"
        @reorder="handleBlockReorder"
        @duplicate="handleBlockDuplicate"
        @transform="handleBlockTransform"
        @create="handleCreateBlock"
      />
    </div>

    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'text' }"
          @click="insertBlockType('text')"
          title="文本"
          type="button"
        >
          <Icon name="solar:text-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'heading' }"
          @click="insertBlockType('heading')"
          title="标题"
          type="button"
        >
          <Icon name="solar:text-field-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'code' }"
          @click="insertBlockType('code')"
          title="代码"
          type="button"
        >
          <Icon name="solar:code-2-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'quote' }"
          @click="insertBlockType('quote')"
          title="引用"
          type="button"
        >
          <Icon name="solar:chat-square-linear" />
        </button>
        <button
          class="toolbar-btn"
          @click="insertBlockType('divider')"
          title="分割线"
          type="button"
        >
          <Icon name="solar:minus-circle-linear" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="handleUndo" title="撤销" type="button">
          <Icon name="solar:undo-left-linear" />
        </button>
        <button class="toolbar-btn" @click="handleRedo" title="重做" type="button">
          <Icon name="solar:undo-right-linear" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="handleExportMarkdown" title="导出 Markdown" type="button">
          <Icon name="solar:download-minimalistic-linear" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="drawerVisible = true" title="属性" type="button">
          <Icon name="solar:menu-dots-square-linear" />
        </button>
      </div>

      <div class="toolbar-spacer" />

      <div class="toolbar-hint">
        输入 <kbd>/</kbd> 唤起命令
      </div>
    </div>

    <SlashMenu
      :visible="slash.state.visible"
      :query="slash.state.query"
      :position="slash.state.position"
      @select="onSlashSelect"
      @close="slash.close"
    />

    <ClassDrawer
      v-model:visible="drawerVisible"
      :note-id="props.noteId"
    />
  </div>
</template>

<script setup lang="ts">
import type { BlockType, BlockMetadata } from '~/types/block'
import BlockList from './BlockList.vue'
import SlashMenu, { type SlashMenuItem } from './SlashMenu.vue'
import ClassDrawer from '~/components/class/ClassDrawer.vue'
import { useBlockEditor } from '~/composables/useBlockEditor'
import { useSlashCommand } from '~/composables/useSlashCommand'
import { useBlockFocus } from '~/composables/useBlockFocus'
import { getDB, now } from '~/services/db'
import { useNoteClasses } from '~/composables/useNoteClasses'

interface Props {
  noteId: string
}

interface Emits {
  (e: 'title-update', noteId: string, title: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const noteIdRef = toRef(props, 'noteId')

const {
  blocks,
  activeBlockId,
  initEditor,
  createBlock,
  moveBlock,
  reorderBlock,
  duplicateBlock,
  changeBlockType,
  handleBlockFocus,
  handleBlockUpdate,
  handleBlockDelete,
  handleBlockEnter
} = useBlockEditor(noteIdRef)

const slash = useSlashCommand()
const focusBus = useBlockFocus()

const activeBlockType = ref<BlockType>('text')
const titleDraft = ref('')
const titleDraftNoteId = ref('')
const drawerVisible = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)
let titleSaveTimer: ReturnType<typeof setTimeout> | null = null

const { noteBindings, classes, loadBindings } = useNoteClasses()

const noteClassBadge = computed(() => {
  const binding = noteBindings.value.find(b => b.noteId === props.noteId)
  if (!binding) return null
  const cls = classes.value.find(c => c.id === binding.classId)
  if (!cls) return null
  return { name: cls.name, icon: cls.icon, color: cls.color }
})

const loadNoteTitle = async () => {
  const db = await getDB()
  const targetId = props.noteId
  const doc = await db.notes.findOne(targetId).exec()
  titleDraft.value = doc?.title || ''
  titleDraftNoteId.value = targetId
}

const flushTitleSave = async () => {
  if (titleSaveTimer) {
    clearTimeout(titleSaveTimer)
    titleSaveTimer = null
  }
  const id = titleDraftNoteId.value
  if (!id) return
  const db = await getDB()
  const doc = await db.notes.findOne(id).exec()
  if (!doc) return
  const trimmed = titleDraft.value
  if (doc.title === trimmed) return
  await doc.patch({ title: trimmed, updatedAt: now() })
  emit('title-update', id, trimmed)
}

const scheduleTitleSave = () => {
  if (titleSaveTimer) clearTimeout(titleSaveTimer)
  titleSaveTimer = setTimeout(() => {
    flushTitleSave()
  }, 500)
}

const onTitleEnter = async () => {
  await flushTitleSave()
  if (blocks.value.length > 0) {
    const targetId = blocks.value[0].id
    activeBlockId.value = targetId
    focusBus.focusEnd(targetId)
  } else {
    await createBlock('text')
  }
}

onMounted(async () => {
  await initEditor()
  await loadNoteTitle()
  await loadBindings()
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
})

watch(() => props.noteId, async (newNoteId, oldNoteId) => {
  if (newNoteId && newNoteId !== oldNoteId) {
    await flushTitleSave()
    await initEditor()
    await loadNoteTitle()
    nextTick(() => {
      titleInputRef.value?.focus()
      titleInputRef.value?.select()
    })
  }
})

onBeforeUnmount(() => {
  flushTitleSave()
})

const insertBlockType = async (type: BlockType) => {
  if (activeBlockId.value) {
    await changeBlockType(activeBlockId.value, type)
    activeBlockType.value = type
  } else {
    await handleCreateBlock(type)
  }
}

const handleBlockMove = async (id: string, direction: 'up' | 'down') => {
  await moveBlock(id, direction)
}

const handleBlockReorder = async (id: string, newIndex: number) => {
  await reorderBlock(id, newIndex)
}

const handleBlockDuplicate = async (id: string) => {
  await duplicateBlock(id)
}

const handleBlockTransform = async (id: string, type: BlockType, metadata?: BlockMetadata) => {
  await changeBlockType(id, type, metadata)
  activeBlockType.value = type
}

const handleCreateBlock = async (type: BlockType) => {
  await createBlock(type)
}

const onSlashSelect = async (item: SlashMenuItem) => {
  const blockId = slash.state.blockId
  slash.close()
  if (blockId) {
    const block = blocks.value.find(b => b.id === blockId)
    if (block) {
      const temp = document.createElement('div')
      temp.innerHTML = block.content
      const text = temp.textContent || ''
      const cleared = text.replace(/(^|\s)\/[^\s/]*$/, '$1')
      await changeBlockType(blockId, item.type, item.metadata, cleared)
      activeBlockType.value = item.type
    }
  }
}

const handleUndo = () => {
  if (typeof document !== 'undefined') {
    document.execCommand('undo')
  }
}

const handleRedo = () => {
  if (typeof document !== 'undefined') {
    document.execCommand('redo')
  }
}

const handleExportMarkdown = () => {
  let orderedListIndex = 0
  const markdown = blocks.value.map(block => {
    const text = block.content.replace(/<[^>]*>/g, '')
    switch (block.type) {
      case 'heading': {
        const level = block.metadata?.level || 1
        return `${'#'.repeat(level)} ${text}`
      }
      case 'code':
        return `\`\`\`${block.metadata?.language || ''}\n${block.content}\n\`\`\``
      case 'quote':
        return `> ${text}`
      case 'divider':
        return '---'
      case 'list': {
        const indent = '  '.repeat(block.metadata?.indent || 0)
        return `${indent}- ${text}`
      }
      case 'orderedList': {
        orderedListIndex++
        const indent = '  '.repeat(block.metadata?.indent || 0)
        return `${indent}${orderedListIndex}. ${text}`
      }
      case 'todo': {
        const mark = block.metadata?.checked ? 'x' : ' '
        return `- [${mark}] ${text}`
      }
      default:
        return text
    }
  }).join('\n\n')

  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.noteId}.md`
  a.click()
  URL.revokeObjectURL(url)
}

watch(activeBlockId, (newId) => {
  if (newId) {
    const block = blocks.value.find(b => b.id === newId)
    if (block) {
      activeBlockType.value = block.type
    }
  }
})
</script>

<style scoped>
.block-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.editor-title-bar {
  padding: 18px 28px 6px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-class-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  border: 0.5px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
}

.title-class-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title-class-badge.undefined {
  background: rgba(142, 142, 147, 0.12);
  color: rgba(60, 60, 67, 0.78);
  border-color: rgba(60, 60, 67, 0.16);
}

.title-class-badge.undefined:hover {
  background: rgba(142, 142, 147, 0.18);
}

.note-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgba(0, 0, 0, 0.92);
  padding: 4px 0;
  caret-color: rgb(0, 122, 255);
}

.note-title-input::placeholder {
  color: rgba(60, 60, 67, 0.32);
  font-weight: 700;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
  position: relative;
  z-index: 2;
}

.toolbar-group {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.6);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.toolbar-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
}

.toolbar-btn:active {
  transform: scale(0.94);
}

.toolbar-btn.active {
  background: rgba(0, 122, 255, 0.16);
  color: rgb(0, 102, 230);
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.32);
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: rgba(60, 60, 67, 0.18);
  margin: 0 4px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.55);
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  border: 0.5px solid rgba(60, 60, 67, 0.08);
}

.toolbar-hint kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  box-shadow: 0 1px 0 rgba(60, 60, 67, 0.12);
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.78);
}

.editor-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px 32px;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}

.editor-scroll::-webkit-scrollbar {
  width: 8px;
}

.editor-scroll::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 4px;
}
</style>
