import type { Block, BlockType, BlockMetadata } from '~/types/block'
import { getRxDB, generateId, now } from '~/services/rxdb'
import type { MaybeRef } from 'vue'
import { useBlockFocus } from '~/composables/useBlockFocus'

const NON_FOCUSABLE_TYPES: ReadonlySet<BlockType> = new Set(['divider'])

const stripTypeSpecificMetadata = (
  metadata: BlockMetadata | undefined
): BlockMetadata | undefined => {
  if (!metadata) return undefined
  const { level, language, checked, ...rest } = metadata
  return Object.keys(rest).length > 0 ? rest : undefined
}

export function useBlockEditor(noteId: MaybeRef<string>) {
  const _noteId = () => toValue(noteId)
  const blocks = ref<Block[]>([])
  const activeBlockId = ref<string | null>(null)
  const focusBus = useBlockFocus()
  let db: any = null

  const initEditor = async () => {
    db = await getRxDB()
    await loadBlocks()
  }

  const loadBlocks = async () => {
    if (!db) return

    const query = db.blocks.find({
      selector: {
        noteId: _noteId()
      },
      sort: [{ order: 'asc' }]
    })

    const result = await query.exec()
    blocks.value = result.map((doc: any) => doc.toJSON())
  }

  const createBlock = async (type: BlockType = 'text', afterId?: string): Promise<Block> => {
    if (!db) throw new Error('Database not initialized')

    const newOrder = afterId
      ? (blocks.value.find(b => b.id === afterId)?.order || 0) + 1
      : blocks.value.length

    const newBlock: Block = {
      id: generateId(),
      noteId: _noteId(),
      type,
      content: '',
      order: newOrder,
      createdAt: now(),
      updatedAt: now(),
      version: 1,
      isSynced: false
    }

    await db.blocks.insert(newBlock)

    const newBlocks = [...blocks.value]
    const insertIndex = afterId
      ? newBlocks.findIndex(b => b.id === afterId) + 1
      : newBlocks.length
    newBlocks.splice(insertIndex, 0, newBlock)

    blocks.value = newBlocks
    activeBlockId.value = newBlock.id

    return newBlock
  }

  const updateBlock = async (block: Block) => {
    if (!db) return

    await db.blocks.upsert({
      ...block,
      updatedAt: now()
    })

    const index = blocks.value.findIndex(b => b.id === block.id)
    if (index !== -1) {
      blocks.value[index] = block
    }
  }

  const deleteBlock = async (blockId: string) => {
    if (!db) return

    const oldIndex = blocks.value.findIndex(b => b.id === blockId)
    if (oldIndex === -1) return

    await db.blocks.findOne(blockId).remove()

    blocks.value = blocks.value.filter(b => b.id !== blockId)

    if (activeBlockId.value === blockId) {
      if (oldIndex > 0 && blocks.value[oldIndex - 1]) {
        activeBlockId.value = blocks.value[oldIndex - 1].id
      } else if (blocks.value.length > 0) {
        activeBlockId.value = blocks.value[0].id
      } else {
        activeBlockId.value = null
      }
    }
  }

  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.value.findIndex(b => b.id === blockId)
    if (index === -1) return

    const newBlocks = [...blocks.value]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newBlocks.length) return

    const [movedBlock] = newBlocks.splice(index, 1)
    newBlocks.splice(targetIndex, 0, movedBlock)

    newBlocks.forEach((block, i) => {
      block.order = i
    })

    blocks.value = newBlocks

    for (const block of newBlocks) {
      await updateBlock(block)
    }
  }

  const reorderBlock = async (blockId: string, newIndex: number) => {
    const oldIndex = blocks.value.findIndex(b => b.id === blockId)
    if (oldIndex === -1) return

    const insertIndex = oldIndex < newIndex ? newIndex - 1 : newIndex
    if (insertIndex === oldIndex || insertIndex < 0) return

    const newBlocks = [...blocks.value]
    const [moved] = newBlocks.splice(oldIndex, 1)
    newBlocks.splice(insertIndex, 0, moved)

    newBlocks.forEach((block, i) => {
      block.order = i
    })

    blocks.value = newBlocks

    for (const block of newBlocks) {
      await updateBlock(block)
    }
  }

  const duplicateBlock = async (blockId: string) => {
    if (!db) return
    const source = blocks.value.find(b => b.id === blockId)
    if (!source) return

    const sourceIndex = blocks.value.findIndex(b => b.id === blockId)
    const cloned: Block = {
      id: generateId(),
      noteId: _noteId(),
      type: source.type,
      content: source.content,
      metadata: source.metadata ? { ...source.metadata } : undefined,
      order: sourceIndex + 1,
      createdAt: now(),
      updatedAt: now(),
      version: 1,
      isSynced: false
    }

    await db.blocks.insert(cloned)

    const newBlocks = [...blocks.value]
    newBlocks.splice(sourceIndex + 1, 0, cloned)
    newBlocks.forEach((block, i) => {
      block.order = i
    })
    blocks.value = newBlocks

    for (const block of newBlocks) {
      if (block.id !== cloned.id) {
        await updateBlock(block)
      }
    }

    activeBlockId.value = cloned.id
  }

  const changeBlockType = async (
    blockId: string,
    newType: BlockType,
    metadata?: BlockMetadata,
    content?: string
  ) => {
    const block = blocks.value.find(b => b.id === blockId)
    if (!block) return

    const nextMetadata = metadata
      ? { ...(block.metadata || {}), ...metadata }
      : block.metadata

    await updateBlock({
      ...block,
      type: newType,
      metadata: nextMetadata,
      ...(content !== undefined ? { content } : {})
    })
  }

  const getBlockComponent = (type: BlockType) => {
    const components: Record<BlockType, string> = {
      text: 'TextBlock',
      heading: 'HeadingBlock',
      list: 'TextBlock',
      todo: 'TodoBlock',
      code: 'CodeBlock',
      quote: 'QuoteBlock',
      divider: 'DividerBlock',
      image: 'TextBlock',
      callout: 'TextBlock'
    }
    return components[type] || 'TextBlock'
  }

  const handleBlockFocus = (blockId: string) => {
    activeBlockId.value = blockId
  }

  const handleBlockUpdate = async (block: Block) => {
    await updateBlock(block)
  }

  const handleBlockDelete = async (blockId: string) => {
    const block = blocks.value.find(b => b.id === blockId)
    if (!block) return

    if (block.type !== 'text') {
      const nextMetadata = stripTypeSpecificMetadata(block.metadata)
      await updateBlock({
        ...block,
        type: 'text',
        metadata: nextMetadata
      })
      activeBlockId.value = blockId
      return
    }

    if (blocks.value.length <= 1) return

    const oldIndex = blocks.value.findIndex(b => b.id === blockId)
    let targetId: string | null = null
    for (let i = oldIndex - 1; i >= 0; i--) {
      const candidate = blocks.value[i]
      if (!NON_FOCUSABLE_TYPES.has(candidate.type)) {
        targetId = candidate.id
        break
      }
    }
    if (!targetId) {
      for (let i = oldIndex + 1; i < blocks.value.length; i++) {
        const candidate = blocks.value[i]
        if (!NON_FOCUSABLE_TYPES.has(candidate.type)) {
          targetId = candidate.id
          break
        }
      }
    }

    await deleteBlock(blockId)

    if (targetId) {
      activeBlockId.value = targetId
      focusBus.focusEnd(targetId)
    }
  }

  const handleBlockEnter = async (afterId: string) => {
    await createBlock('text', afterId)
  }

  return {
    blocks,
    activeBlockId,
    initEditor,
    createBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlock,
    duplicateBlock,
    changeBlockType,
    getBlockComponent,
    handleBlockFocus,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockEnter
  }
}
