import { ref, computed } from 'vue'

// ==================== 类型定义 ====================

export interface BillDragState {
  isDragging: boolean
  billIds: string[]
  sourceNoteId: string
  dropTargetNoteId: string | null
}

// ==================== Composable ====================

export function useBillDragDrop() {
  const dragState = ref<BillDragState>({
    isDragging: false,
    billIds: [],
    sourceNoteId: '',
    dropTargetNoteId: null
  })

  const isDragging = computed(() => dragState.value.isDragging)

  function isDraggingOver(noteId: string): boolean {
    return dragState.value.isDragging && dragState.value.dropTargetNoteId === noteId
  }

  /**
   * 开始拖拽账单
   */
  function startBillDrag(billIds: string[], sourceNoteId: string, event: DragEvent): void {
    event.stopPropagation()

    dragState.value = {
      isDragging: true,
      billIds,
      sourceNoteId,
      dropTargetNoteId: null
    }

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'bill-drag',
        billIds,
        sourceNoteId
      }))

      const dragImage = createDragImage(billIds.length === 1 ? '' : `${billIds.length} 笔账单`)
      event.dataTransfer.setDragImage(dragImage, 0, 0)
    }
  }

  /**
   * 拖拽结束
   */
  function endBillDrag(): void {
    resetDragState()
  }

  /**
   * 目标 dragover
   */
  function onNoteDragOver(noteId: string, event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()

    if (!dragState.value.isDragging) return

    dragState.value = {
      ...dragState.value,
      dropTargetNoteId: noteId
    }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  /**
   * 目标 dragleave
   */
  function onNoteDragLeave(event: DragEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement
    const currentTarget = event.currentTarget as HTMLElement

    if (relatedTarget && currentTarget.contains(relatedTarget)) return

    if (dragState.value.isDragging) {
      dragState.value = {
        ...dragState.value,
        dropTargetNoteId: null
      }
    }
  }

  /**
   * 目标 drop，返回 billIds 或 null
   */
  function onNoteDrop(targetNoteId: string, event: DragEvent): string[] | null {
    event.preventDefault()
    event.stopPropagation()

    if (!dragState.value.isDragging) return null

    const { billIds, sourceNoteId } = dragState.value

    // 同一项目不处理
    if (sourceNoteId === targetNoteId) {
      resetDragState()
      return null
    }

    resetDragState()
    return billIds
  }

  function resetDragState(): void {
    dragState.value = {
      isDragging: false,
      billIds: [],
      sourceNoteId: '',
      dropTargetNoteId: null
    }
  }

  /**
   * 创建拖拽预览图像
   */
  function createDragImage(text: string): HTMLElement {
    const element = document.createElement('div')
    element.className = 'bill-drag-preview'
    element.textContent = text || '拖拽中...'

    element.style.cssText = `
      position: absolute; top: -9999px; left: -9999px;
      padding: 6px 14px;
      background: rgba(0, 122, 255, 0.9);
      color: #fff; font-size: 13px; font-weight: 500;
      border-radius: 8px; white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `
    document.body.appendChild(element)
    setTimeout(() => { document.body.removeChild(element) }, 0)
    return element
  }

  return {
    dragState,
    isDragging,
    isDraggingOver,
    startBillDrag,
    endBillDrag,
    onNoteDragOver,
    onNoteDragLeave,
    onNoteDrop,
    resetDragState
  }
}
