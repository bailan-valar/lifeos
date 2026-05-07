<template>
  <div class="block-list">
    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      class="block-row"
      :class="{
        'is-dragging': draggingId === block.id,
        'drop-before': dropTarget === index && dropPosition === 'before' && draggingId !== block.id,
        'drop-after': dropTarget === index && dropPosition === 'after' && draggingId !== block.id
      }"
      @dragenter.prevent
      @dragover.prevent="onDragOver($event, index)"
      @drop.prevent="onDrop(index)"
    >
      <div
        class="block-handle"
        :class="{ 'is-open': menu.visible && menu.blockId === block.id }"
        role="button"
        tabindex="0"
        draggable="true"
        title="拖动排序，点击打开菜单"
        @mousedown.stop
        @dragstart="onDragStart(block.id, $event)"
        @dragend="onDragEnd"
        @click.stop="onHandleClick(block.id, $event)"
      >
        <Icon name="solar:hamburger-menu-linear" />
      </div>

      <div class="block-row-body">
        <component
          :is="getBlockComponent(block.type)"
          :block="block"
          :is-active="activeBlockId === block.id"
          :list-number="getListNumber(index)"
          @focus="handleBlockFocus"
          @update="handleBlockUpdate"
          @delete="handleBlockDelete"
          @enter="handleBlockEnter"
        />
      </div>
    </div>

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

    <div
      v-else-if="showTrailingZone"
      class="trailing-zone"
      role="button"
      tabindex="0"
      @click="onTrailingClick"
      @keydown.enter.prevent="onTrailingClick"
    >
      <span class="trailing-hint">继续书写...</span>
    </div>

    <Teleport to="body">
      <div
        v-if="menu.visible"
        class="block-menu"
        :style="{ left: `${menu.x}px`, top: `${menu.y}px`, zIndex: menuZIndex }"
        @click.stop
        @mousedown.stop
      >
        <button
          class="menu-item"
          :disabled="menu.index <= 0"
          @click="onMenuMove('up')"
          type="button"
        >
          <Icon name="solar:arrow-up-linear" />
          <span>上移</span>
        </button>
        <button
          class="menu-item"
          :disabled="menu.index < 0 || menu.index >= blocks.length - 1"
          @click="onMenuMove('down')"
          type="button"
        >
          <Icon name="solar:arrow-down-linear" />
          <span>下移</span>
        </button>
        <button
          class="menu-item"
          @click="onMenuDuplicate"
          type="button"
        >
          <Icon name="solar:copy-linear" />
          <span>复制</span>
        </button>
        <button
          class="menu-item"
          @click="openTransformPanel"
          type="button"
        >
          <Icon name="solar:sort-horizontal-linear" />
          <span>转换</span>
          <Icon name="solar:alt-arrow-right-linear" class="transform-arrow" />
        </button>
        <div class="menu-divider" />
        <button
          class="menu-item danger"
          :disabled="blocks.length <= 1"
          @click="onMenuDelete"
          type="button"
        >
          <Icon name="solar:trash-bin-trash-linear" />
          <span>删除</span>
        </button>

        <Transition name="transform-panel">
          <div
            v-if="transformPanel.visible"
            class="transform-panel"
            @click.stop
            @mousedown.stop
          >
            <button
              class="menu-item"
              @click="closeTransformPanel"
              type="button"
            >
              <Icon name="solar:alt-arrow-left-linear" />
              <span>返回</span>
            </button>
            <div class="menu-divider" />
            <button
              v-for="item in transformItems"
              :key="item.type + (item.metadata?.level || '')"
              class="menu-item"
              @click="onMenuTransform(item)"
              type="button"
            >
              <Icon :name="item.icon" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Block, BlockType, BlockMetadata } from '~/types/block'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import TextBlock from './blocks/TextBlock.vue'
import HeadingBlock from './blocks/HeadingBlock.vue'
import CodeBlock from './blocks/CodeBlock.vue'
import QuoteBlock from './blocks/QuoteBlock.vue'
import DividerBlock from './blocks/DividerBlock.vue'
import TodoBlock from './blocks/TodoBlock.vue'
import ListBlock from './blocks/ListBlock.vue'

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
  (e: 'reorder', id: string, newIndex: number): void
  (e: 'duplicate', id: string): void
  (e: 'transform', id: string, type: BlockType, metadata?: BlockMetadata): void
  (e: 'create', type: 'text' | 'heading' | 'code' | 'quote' | 'divider'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuZIndex = useZIndexOnOpen(() => menu.visible)

const getListNumber = (index: number): number => {
  const currentBlock = props.blocks[index]
  if (!currentBlock || currentBlock.type !== 'orderedList') return 1
  const currentIndent = currentBlock.metadata?.indent || 0
  let count = 1
  for (let i = 0; i < index; i++) {
    const block = props.blocks[i]
    if (block?.type === 'orderedList' && (block.metadata?.indent || 0) === currentIndent) {
      count++
    }
  }
  return count
}

const getBlockComponent = (type: string) => {
  const components: Record<string, any> = {
    text: TextBlock,
    heading: HeadingBlock,
    list: ListBlock,
    orderedList: ListBlock,
    todo: TodoBlock,
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
const createBlock = () => emit('create', 'text')
const onTrailingClick = () => emit('create', 'text')

const showTrailingZone = computed(() => {
  if (props.blocks.length === 0) return false
  const last = props.blocks[props.blocks.length - 1]
  if (last.type === 'divider') return true
  const text = last.content.replace(/<[^>]*>/g, '').trim()
  return text.length > 0
})

const draggingId = ref<string | null>(null)
const dropTarget = ref<number>(-1)
const dropPosition = ref<'before' | 'after'>('before')

const onDragStart = (id: string, e: DragEvent) => {
  draggingId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  closeMenu()
}

const onDragEnd = () => {
  draggingId.value = null
  dropTarget.value = -1
}

const onDragOver = (e: DragEvent, index: number) => {
  if (!draggingId.value) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const row = e.currentTarget as HTMLElement
  const rect = row.getBoundingClientRect()
  const isTop = e.clientY < rect.top + rect.height / 2
  dropTarget.value = index
  dropPosition.value = isTop ? 'before' : 'after'
}

const onDrop = (index: number) => {
  if (!draggingId.value) return
  const targetIndex = dropPosition.value === 'before' ? index : index + 1
  emit('reorder', draggingId.value, targetIndex)
  draggingId.value = null
  dropTarget.value = -1
}

const menu = reactive({
  visible: false,
  blockId: null as string | null,
  index: -1,
  x: 0,
  y: 0
})

const transformPanel = reactive({
  visible: false
})

interface TransformItem {
  type: BlockType
  label: string
  icon: string
  metadata?: BlockMetadata
}

const transformItems: TransformItem[] = [
  { type: 'text', label: '文本', icon: 'solar:text-linear' },
  { type: 'heading', label: '标题 1', icon: 'solar:text-field-linear', metadata: { level: 1 } },
  { type: 'heading', label: '标题 2', icon: 'solar:text-field-linear', metadata: { level: 2 } },
  { type: 'heading', label: '标题 3', icon: 'solar:text-field-linear', metadata: { level: 3 } },
  { type: 'list', label: '无序列表', icon: 'solar:list-linear' },
  { type: 'orderedList', label: '有序列表', icon: 'solar:sort-vertical-linear' },
  { type: 'todo', label: '待办', icon: 'solar:checklist-minimalistic-linear' },
  { type: 'quote', label: '引用', icon: 'solar:chat-square-linear' },
  { type: 'code', label: '代码块', icon: 'solar:code-2-linear' },
  { type: 'divider', label: '分割线', icon: 'solar:minus-circle-linear' }
]

const openTransformPanel = () => {
  transformPanel.visible = true
}

const closeTransformPanel = () => {
  transformPanel.visible = false
}

const onMenuTransform = (item: TransformItem) => {
  if (!menu.blockId) return
  emit('transform', menu.blockId, item.type, item.metadata)
  closeMenu()
}

const onHandleClick = (blockId: string, e: MouseEvent) => {
  if (menu.visible && menu.blockId === blockId) {
    closeMenu()
    return
  }
  const handleEl = e.currentTarget as HTMLElement
  const rect = handleEl.getBoundingClientRect()
  const idx = props.blocks.findIndex(b => b.id === blockId)
  menu.visible = true
  menu.blockId = blockId
  menu.index = idx
  menu.x = rect.right + 6
  menu.y = rect.top
  emit('focus', blockId)
}

const closeMenu = () => {
  menu.visible = false
  menu.blockId = null
  menu.index = -1
  transformPanel.visible = false
}

const onGlobalClick = () => {
  if (menu.visible) closeMenu()
}

const onGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && menu.visible) closeMenu()
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('keydown', onGlobalKeydown)
})

const onMenuMove = (direction: 'up' | 'down') => {
  if (!menu.blockId) return
  emit('move', menu.blockId, direction)
  closeMenu()
}

const onMenuDuplicate = () => {
  if (!menu.blockId) return
  emit('duplicate', menu.blockId)
  closeMenu()
}

const onMenuDelete = () => {
  if (!menu.blockId) return
  emit('delete', menu.blockId)
  closeMenu()
}
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

.block-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding-left: 32px;
  border-radius: 12px;
  transition: opacity 0.18s ease;
}

.block-row.is-dragging {
  opacity: 0.45;
}

.block-row.drop-before::before,
.block-row.drop-after::after {
  content: '';
  position: absolute;
  left: 32px;
  right: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgb(0, 122, 255) 0%, rgb(94, 92, 230) 100%);
  box-shadow: 0 0 8px rgba(0, 122, 255, 0.4);
  z-index: 4;
  pointer-events: none;
}

.block-row.drop-before::before {
  top: -2px;
}

.block-row.drop-after::after {
  bottom: -2px;
}

.block-row-body {
  flex: 1;
  min-width: 0;
}

.block-handle {
  position: absolute;
  left: 0;
  top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  font-size: 14px;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.18s ease, background-color 0.15s ease, color 0.15s ease;
  user-select: none;
  -webkit-user-drag: element;
}

.block-row:hover .block-handle,
.block-handle.is-open,
.block-handle:focus-visible {
  opacity: 1;
}

.block-handle:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}

.block-handle:active {
  cursor: grabbing;
  background: rgba(0, 122, 255, 0.14);
  color: rgb(0, 102, 230);
}

.block-handle.is-open {
  background: rgba(0, 122, 255, 0.16);
  color: rgb(0, 102, 230);
}

.block-menu {
  position: fixed;
  z-index: var(--z-dropdown);
  min-width: 160px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.14);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.16),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.7);
  animation: menuIn 0.15s ease;
}

@keyframes menuIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13.5px;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
  text-align: left;
}

.menu-item :deep(svg),
.menu-item :deep(.iconify) {
  font-size: 15px;
  flex-shrink: 0;
  color: rgba(60, 60, 67, 0.7);
}

.menu-item:hover:not(:disabled) {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
}

.menu-item:hover:not(:disabled) :deep(svg),
.menu-item:hover:not(:disabled) :deep(.iconify) {
  color: rgb(0, 102, 230);
}

.menu-item:disabled {
  opacity: 0.36;
  cursor: not-allowed;
}

.menu-item.danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}

.menu-item.danger:hover:not(:disabled) :deep(svg),
.menu-item.danger:hover:not(:disabled) :deep(.iconify) {
  color: rgb(255, 59, 48);
}

.menu-divider {
  height: 0.5px;
  margin: 4px 6px;
  background: rgba(60, 60, 67, 0.14);
}

.menu-item .transform-arrow {
  margin-left: auto;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.4);
}

.transform-panel {
  position: absolute;
  top: 0;
  left: calc(100% + 6px);
  min-width: 160px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.14);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.16),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.7);
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(60, 60, 67, 0.2) transparent;
}

.transform-panel::-webkit-scrollbar {
  width: 5px;
}

.transform-panel::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.transform-panel-enter-active,
.transform-panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.transform-panel-enter-from {
  opacity: 0;
  transform: translateX(-6px);
}

.transform-panel-leave-to {
  opacity: 0;
  transform: translateX(-6px);
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

.trailing-zone {
  margin-top: 8px;
  margin-left: 32px;
  padding: 10px 12px;
  min-height: 36px;
  border-radius: 12px;
  cursor: text;
  display: flex;
  align-items: center;
  color: rgba(60, 60, 67, 0.32);
  font-size: 14px;
  line-height: 1.6;
  transition: background-color 0.18s ease, color 0.18s ease;
  outline: none;
}

.trailing-zone:hover,
.trailing-zone:focus-visible {
  background-color: rgba(120, 120, 128, 0.06);
  color: rgba(60, 60, 67, 0.55);
}

.trailing-zone:focus-visible {
  box-shadow: inset 0 0 0 0.5px rgba(0, 122, 255, 0.18);
}

.trailing-hint {
  pointer-events: none;
}
</style>
