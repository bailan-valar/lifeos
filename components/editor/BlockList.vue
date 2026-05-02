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
            title="上移"
            type="button"
          >
            <Icon name="solar:arrow-up-linear" />
          </button>
          <button
            class="action-btn"
            @click.stop="moveBlock(block.id, 'down')"
            :disabled="block.order === blocks.length - 1"
            title="下移"
            type="button"
          >
            <Icon name="solar:arrow-down-linear" />
          </button>
          <button
            class="action-btn delete-btn"
            @click.stop="deleteBlock(block.id)"
            title="删除"
            type="button"
          >
            <Icon name="solar:trash-bin-trash-linear" />
          </button>
        </div>
      </template>
    </component>

    <div v-if="blocks.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon name="solar:document-add-linear" />
      </div>
      <p class="empty-title">这里空空如也</p>
      <p class="empty-hint">点击下方按钮开始书写，或输入 <kbd>/</kbd> 快速插入块</p>
      <button class="add-block-btn" @click="createBlock()" type="button">
        <Icon name="solar:add-circle-linear" />
        <span>添加文本块</span>
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

defineProps<Props>()
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
  gap: 2px;
  padding: 4px 0 24px;
  max-width: 760px;
  margin: 0 auto;
}

.block-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.14);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(0, 122, 255, 0.14);
  color: rgb(0, 102, 230);
}

.action-btn:active:not(:disabled) {
  transform: scale(0.92);
}

.action-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.14);
  color: rgb(255, 59, 48);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 4px 16px rgba(0, 0, 0, 0.04);
  color: rgb(0, 122, 255);
  font-size: 28px;
}

.empty-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgba(0, 0, 0, 0.86);
}

.empty-hint {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(60, 60, 67, 0.6);
  max-width: 320px;
}

.empty-hint kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.78);
}

.add-block-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 4px 14px rgba(0, 122, 255, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.add-block-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 6px 20px rgba(0, 122, 255, 0.4);
}

.add-block-btn:active {
  transform: scale(0.97);
}
</style>
