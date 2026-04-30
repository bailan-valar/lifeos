<template>
  <div class="block-editor">
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'text' }"
          @click="insertBlockType('text')"
          title="文本"
        >
          <Icon name="solar:text-bubble-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'heading' }"
          @click="insertBlockType('heading')"
          title="标题"
        >
          <Icon name="solar:text-field-bold-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'code' }"
          @click="insertBlockType('code')"
          title="代码"
        >
          <Icon name="solar:code-2-linear" />
        </button>
        <button
          class="toolbar-btn"
          :class="{ active: activeBlockType === 'quote' }"
          @click="insertBlockType('quote')"
          title="引用"
        >
          <Icon name="solar:quote-up-linear" />
        </button>
        <button
          class="toolbar-btn"
          @click="insertBlockType('divider')"
          title="分割线"
        >
          <Icon name="solar:minus-circle-linear" />
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="handleUndo" title="撤销">
          <Icon name="solar:undo-left-linear" />
        </button>
        <button class="toolbar-btn" @click="handleRedo" title="重做">
          <Icon name="solar:undo-right-linear" />
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" @click="handleExportMarkdown" title="导出 Markdown">
          <Icon name="solar:download-minimalistic-linear" />
        </button>
      </div>
    </div>

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
</template>

<script setup lang="ts">
import type { Block, BlockType } from '~/types/block'
import BlockList from './BlockList.vue'
import { useBlockEditor } from '~/composables/useBlockEditor'

interface Props {
  noteId: string
}

const props = defineProps<Props>()

const {
  blocks,
  activeBlockId,
  initEditor,
  createBlock,
  updateBlock,
  deleteBlock,
  moveBlock,
  changeBlockType,
  handleBlockFocus,
  handleBlockUpdate,
  handleBlockDelete,
  handleBlockEnter
} = useBlockEditor(props.noteId)

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

const handleUndo = () => {
  console.log('Undo')
}

const handleRedo = () => {
  console.log('Redo')
}

const handleExportMarkdown = () => {
  const markdown = blocks.value.map(block => {
    switch (block.type) {
      case 'heading':
        const level = block.metadata.level || 1
        return `${'#'.repeat(level)} ${block.content}`
      case 'code':
        return `\`\`\`${block.metadata.language || ''}\n${block.content}\n\`\`\``
      case 'quote':
        return `> ${block.content}`
      case 'divider':
        return '---'
      default:
        return block.content
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
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgb(0, 122, 255);
}

.toolbar-btn.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border-color: rgba(0, 122, 255, 0.2);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 8px;
}
</style>
