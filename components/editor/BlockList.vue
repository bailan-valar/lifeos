<template>
  <div class="block-list">
    <component
      v-for="block in blocks"
      :key="block.id"
      :is="getBlockComponent(block.type)"
      :block="block"
      :is-active="activeBlockId === block.id"
      @focus="handleBlockFocus"
      @update="handleBlockUpdate"
      @delete="handleBlockDelete"
      @enter="handleBlockEnter"
    >
      <template #handle>
        <div class="block-actions">
          <button
            class="action-btn"
            @click.stop="moveBlock(block.id, 'up')"
            :disabled="block.order === 0"
          >
            <Icon name="solar:arrow-up-linear" />
          </button>
          <button
            class="action-btn"
            @click.stop="moveBlock(block.id, 'down')"
            :disabled="block.order === blocks.length - 1"
          >
            <Icon name="solar:arrow-down-linear" />
          </button>
          <button
            class="action-btn delete-btn"
            @click.stop="deleteBlock(block.id)"
          >
            <Icon name="solar:trash-bin-trash-linear" />
          </button>
        </div>
      </template>
    </component>

    <div v-if="blocks.length === 0" class="empty-state">
      <p>开始输入来创建你的第一个块...</p>
      <button class="add-block-btn" @click="createBlock()">
        <Icon name="solar:add-circle-linear" />
        添加文本块
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Block } from '~/types/block'
import TextBlock from './blocks/TextBlock.vue'
import HeadingBlock from './blocks/HeadingBlock.vue'
import CodeBlock from './blocks/CodeBlock.vue'
import QuoteBlock from './blocks/QuoteBlock.vue'
import DividerBlock from './blocks/DividerBlock.vue'

interface Props {
  blocks: Block[]
  activeBlockId: string | null
}

interface Emits {
  (e: 'focus', id: string): void
  (e: 'update', block: Block): void
  (e: 'delete', id: string): void
  (e: 'enter', afterId: string): void
  (e: 'move', id: string, direction: 'up' | 'down'): void
  (e: 'create', type: 'text' | 'heading' | 'code' | 'quote' | 'divider'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const getBlockComponent = (type: string) => {
  const components: Record<string, any> = {
    text: TextBlock,
    heading: HeadingBlock,
    list: TextBlock,
    code: CodeBlock,
    quote: QuoteBlock,
    divider: DividerBlock,
    image: TextBlock,
    callout: TextBlock
  }
  return components[type] || TextBlock
}

const handleBlockFocus = (id: string) => emit('focus', id)
const handleBlockUpdate = (block: Block) => emit('update', block)
const handleBlockDelete = (id: string) => emit('delete', id)
const handleBlockEnter = (id: string) => emit('enter', id)
const moveBlock = (id: string, direction: 'up' | 'down') => emit('move', id, direction)
const deleteBlock = (id: string) => emit('delete', id)
const createBlock = () => emit('create', 'text')
</script>

<style scoped>
.block-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
}

.block-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background: white;
  color: rgb(0, 122, 255);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: rgb(0, 122, 255);
  color: white;
  border-color: rgb(0, 122, 255);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-btn:hover {
  background: rgb(255, 59, 48);
  color: white;
  border-color: rgb(255, 59, 48);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: rgba(0, 0, 0, 0.4);
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 16px;
}

.add-block-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-block-btn:hover {
  background: rgb(0, 105, 217);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}
</style>
