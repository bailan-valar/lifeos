export function useConfirm() {
  const showConfirm = async (options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmed = window.confirm(options.message)
      resolve(confirmed)
    })
  }

  return {
    showConfirm
  }
}
