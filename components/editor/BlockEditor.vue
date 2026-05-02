<template>
  <div class="block-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'text' }"
          @click="insertBlockType('text')"
          title="文本"
          type="button"
        >
          <Icon name="solar:text-bubble-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'heading' }"
          @click="insertBlockType('heading')"
          title="标题"
          type="button"
        >
          <Icon name="solar:text-field-bold-linear" />
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
          <Icon name="solar:quote-up-linear" />
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

      <div class="toolbar-spacer" />

      <div class="toolbar-hint">
        输入 <kbd>/</kbd> 唤起命令
      </div>
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
        @create="handleCreateBlock"
      />
    </div>

    <SlashMenu
      :visible="slash.state.visible"
      :query="slash.state.query"
      :position="slash.state.position"
      @select="onSlashSelect"
      @close="slash.close"
    />
  </div>
</template>

<script setup lang="ts">
import type { BlockType } from '~/types/block'
import BlockList from './BlockList.vue'
import SlashMenu, { type SlashMenuItem } from './SlashMenu.vue'
import { useBlockEditor } from '~/composables/useBlockEditor'
import { useSlashCommand } from '~/composables/useSlashCommand'

interface Props {
  noteId: string
}

const props = defineProps<Props>()

const {
  blocks,
  activeBlockId,
  initEditor,
  createBlock,
  moveBlock,
  changeBlockType,
  handleBlockFocus,
  handleBlockUpdate,
  handleBlockDelete,
  handleBlockEnter
} = useBlockEditor(props.noteId)

const slash = useSlashCommand()

const activeBlockType = ref<BlockType>('text')

onMounted(async () => {
  await initEditor()
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

const handleCreateBlock = async (type: BlockType) => {
  await createBlock(type)
}

const onSlashSelect = async (item: SlashMenuItem) => {
  const blockId = slash.state.blockId
  slash.requestClear()
  await nextTick()
  if (blockId) {
    await changeBlockType(blockId, item.type, item.metadata)
    activeBlockType.value = item.type
  }
  slash.close()
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
      case 'list':
        return `- ${text}`
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
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 18px;
  overflow: hidden;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 32px rgba(0, 0, 0, 0.06);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
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
