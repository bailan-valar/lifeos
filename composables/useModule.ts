import type { Module, ModuleComposableReturn } from '~/types/module'
import { getModuleRegistry } from '~/services/ModuleRegistry'

export function useModule(noteId: MaybeRefOrGetter<string>, moduleId: MaybeRefOrGetter<string>): ModuleComposableReturn {
  const noteIdRef = toRef(noteId)
  const moduleIdRef = toRef(moduleId)

  const data = ref<unknown>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const registry = getModuleRegistry()
  let cleanupHooks: Array<() => void | Promise<void>> = []

  const init = async () => {
    const id = moduleIdRef.value
    const note = noteIdRef.value

    if (!id || !note) return

    loading.value = true
    error.value = null

    try {
      const module = registry.get(id)
      if (!module) {
        throw new Error(`Module ${id} not found`)
      }

      if (!module.loaded) {
        await module.hooks?.onLoad?.(note)
        module.loaded = true
        module.status = 'enabled'
      }

      const moduleData = await registry.getModuleData(id, note)
      data.value = moduleData

      const unwatch = watch(moduleIdRef, async (newId, oldId) => {
        if (newId !== oldId) {
          await destroy()
          await init()
        }
      })

      cleanupHooks.push(unwatch)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err.message
      console.error(`Failed to initialize module ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const destroy = async () => {
    const id = moduleIdRef.value
    const note = noteIdRef.value

    if (!id || !note) return

    try {
      const module = registry.get(id)
      if (module?.loaded) {
        await module.hooks?.onUnload?.(note)
      }

      for (const cleanup of cleanupHooks) {
        await cleanup()
      }
      cleanupHooks = []
    } catch (e) {
      console.error(`Failed to destroy module ${id}:`, e)
    }
  }

  const save = async (newData: unknown) => {
    const id = moduleIdRef.value
    const note = noteIdRef.value

    if (!id || !note) {
      throw new Error('Module ID or Note ID is missing')
    }

    loading.value = true
    error.value = null

    try {
      const module = registry.get(id)
      if (!module) {
        throw new Error(`Module ${id} not found`)
      }

      await registry.saveModuleData(id, note, newData)
      data.value = newData
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err.message
      console.error(`Failed to save module ${id} data:`, err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const refresh = async () => {
    const id = moduleIdRef.value
    const note = noteIdRef.value

    if (!id || !note) return

    loading.value = true
    error.value = null

    try {
      const moduleData = await registry.getModuleData(id, note)
      data.value = moduleData
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      error.value = err.message
      console.error(`Failed to refresh module ${id} data:`, err)
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    await init()
  })

  onBeforeUnmount(async () => {
    await destroy()
  })

  return {
    data,
    loading,
    error,
    init,
    destroy,
    save,
    refresh
  }
}

export function useModuleLoader() {
  const registry = getModuleRegistry()
  const loadingModules = ref<Set<string>>(new Set())

  const loadModule = async (module: Module, noteId: string) => {
    if (loadingModules.value.has(module.id)) {
      console.warn(`Module ${module.id} is already loading`)
      return
    }

    loadingModules.value.add(module.id)

    try {
      await module.hooks?.onLoad?.(noteId)
      module.loaded = true
      module.status = 'enabled'
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      module.status = 'error'
      module.error = err.message
      console.error(`Failed to load module ${module.id}:`, err)
      throw err
    } finally {
      loadingModules.value.delete(module.id)
    }
  }

  const unloadModule = async (module: Module, noteId: string) => {
    if (!module.loaded) return

    try {
      await module.hooks?.onUnload?.(noteId)
      module.loaded = false
      module.status = 'disabled'
      module.error = undefined
    } catch (e) {
      console.error(`Failed to unload module ${module.id}:`, e)
    }
  }

  const activateModule = async (module: Module, noteId: string) => {
    if (!module.loaded) {
      await loadModule(module, noteId)
    }
    await module.hooks?.onActivate?.(noteId)
  }

  const deactivateModule = async (module: Module, noteId: string) => {
    await module.hooks?.onDeactivate?.(noteId)
  }

  return {
    loadingModules,
    loadModule,
    unloadModule,
    activateModule,
    deactivateModule
  }
}
