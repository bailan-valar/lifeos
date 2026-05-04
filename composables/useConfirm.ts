import { reactive, readonly } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  resolve: null,
})

export function useConfirm() {
  function confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { message: options } : options

    return new Promise((resolve) => {
      state.title = opts.title || ''
      state.message = opts.message
      state.confirmText = opts.confirmText || '确定'
      state.cancelText = opts.cancelText || '取消'
      state.danger = opts.danger || false
      state.resolve = resolve
      state.visible = true
    })
  }

  function answer(value: boolean) {
    state.visible = false
    state.resolve?.(value)
    state.resolve = null
  }

  return {
    state: readonly(state) as Readonly<ConfirmState>,
    confirm,
    answer,
  }
}
