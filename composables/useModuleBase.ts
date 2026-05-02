import type { ModuleBaseProps, ModuleBaseEmits } from '~/types/module'

export function useModuleBase(props: ModuleBaseProps, emit: ModuleBaseEmits) {
  const { noteId, moduleData, onDataChange } = toRefs(props)

  const internalData = ref<unknown>(moduleData?.value ?? {})
  const ready = ref(false)
  const error = ref<Error | null>(null)

  const handleDataChange = (newData: unknown) => {
    internalData.value = newData
    emit('data-change', newData)
    onDataChange?.value?.(newData)
  }

  const handleError = (err: Error) => {
    error.value = err
    emit('error', err)
    console.error('Module error:', err)
  }

  const markReady = () => {
    ready.value = true
    emit('ready')
  }

  const validateData = (data: unknown): boolean => {
    if (data === null || data === undefined) {
      return false
    }
    if (typeof data !== 'object') {
      return false
    }
    return true
  }

  return {
    internalData,
    ready,
    error,
    handleDataChange,
    handleError,
    markReady,
    validateData
  }
}
