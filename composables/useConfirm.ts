import { ref, reactive } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  visible: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  danger: boolean
}

const state = reactive<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false
})

let resolveConfirm: ((value: boolean) => void) | null = null

export function useConfirm() {
  const confirm = async (options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options

    return new Promise<boolean>((resolve) => {
      Object.assign(state, {
        visible: true,
        title: opts.title || '',
        message: opts.message,
        confirmText: opts.confirmText || '确定',
        cancelText: opts.cancelText || '取消',
        danger: opts.danger || false
      })
      resolveConfirm = resolve
    })
  }

  const answer = (value: boolean) => {
    state.visible = false
    if (resolveConfirm) {
      resolveConfirm(value)
      resolveConfirm = null
    }
  }

  return {
    state,
    confirm,
    answer
  }
}
