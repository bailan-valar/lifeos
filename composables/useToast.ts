import { reactive, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

export interface ToastItem extends ToastOptions {
  id: string
  createdAt: number
}

const toasts = reactive<ToastItem[]>([])

let idCounter = 0

export function useToast() {
  function show(options: ToastOptions) {
    const id = `${Date.now()}-${++idCounter}`
    const toast: ToastItem = {
      type: 'info',
      duration: 3000,
      ...options,
      id,
      createdAt: Date.now(),
    }
    toasts.push(toast)
    return id
  }

  function success(message: string, duration?: number) {
    return show({ message, type: 'success', duration })
  }

  function error(message: string, duration?: number) {
    return show({ message, type: 'error', duration })
  }

  function warning(message: string, duration?: number) {
    return show({ message, type: 'warning', duration })
  }

  function info(message: string, duration?: number) {
    return show({ message, type: 'info', duration })
  }

  function dismiss(id: string) {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.splice(idx, 1)
    }
  }

  function clear() {
    toasts.splice(0, toasts.length)
  }

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    clear,
  }
}
