import type { Block, BlockType, BlockMetadata } from '~/types/block'
import { getRxDB, generateId, now } from '~/services/rxdb'

export function useBlockEditor(noteId: string) {
  const blocks = ref<Block[]>([])
  const activeBlockId = ref<string | null>(null)
  let db: any = null

  const initEditor = async () => {
    db = await getRxDB()
    await loadBlocks()
  }

  const loadBlocks = async () => {
    if (!db) return

    const query = db.blocks.find({
      selector: {
        noteId
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
      noteId,
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

    await db.blocks.findOne(blockId).remove()

    blocks.value = blocks.value.filter(b => b.id !== blockId)

    if (activeBlockId.value === blockId) {
      const index = blocks.value.findIndex(b => b.id === blockId)
      if (index > 0) {
        activeBlockId.value = blocks.value[index - 1].id
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

  const changeBlockType = async (
    blockId: string,
    newType: BlockType,
    metadata?: BlockMetadata
  ) => {
    const block = blocks.value.find(b => b.id === blockId)
    if (!block) return

    const nextMetadata = metadata
      ? { ...(block.metadata || {}), ...metadata }
      : block.metadata

    await updateBlock({
      ...block,
      type: newType,
      metadata: nextMetadata
    })
  }

  const getBlockComponent = (type: BlockType) => {
    const components: Record<BlockType, string> = {
      text: 'TextBlock',
      heading: 'HeadingBlock',
      list: 'TextBlock',
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
    if (blocks.value.length > 1) {
      await deleteBlock(blockId)
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
    changeBlockType,
    getBlockComponent,
    handleBlockFocus,
    handleBlockUpdate,
    handleBlockDelete,
    handleBlockEnter
  }
}
