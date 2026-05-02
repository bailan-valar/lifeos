import { reactive } from 'vue'

interface SlashState {
  visible: boolean
  blockId: string | null
  query: string
  position: { top: number; left: number }
  clearRequestId: number
}

const state = reactive<SlashState>({
  visible: false,
  blockId: null,
  query: '',
  position: { top: 0, left: 0 },
  clearRequestId: 0
})

export function useSlashCommand() {
  const open = (
    blockId: string,
    query: string,
    position: { top: number; left: number }
  ) => {
    state.blockId = blockId
    state.query = query
    state.position = position
    state.visible = true
  }

  const update = (
    query: string,
    position: { top: number; left: number }
  ) => {
    state.query = query
    state.position = position
  }

  const close = () => {
    state.visible = false
    state.blockId = null
    state.query = ''
  }

  const requestClear = () => {
    state.clearRequestId++
  }

  return { state, open, update, close, requestClear }
}
