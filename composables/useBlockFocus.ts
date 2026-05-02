import { reactive } from 'vue'

interface BlockFocusState {
  targetId: string | null
  endRequestId: number
}

const state = reactive<BlockFocusState>({
  targetId: null,
  endRequestId: 0
})

export function useBlockFocus() {
  const focusEnd = (blockId: string) => {
    state.targetId = blockId
    state.endRequestId++
  }

  return { state, focusEnd }
}
