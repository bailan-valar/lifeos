import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workspace, WorkspaceFormData } from '~/types/workspace'
import {
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setActiveId,
  getActiveId
} from '~/services/workspaces'
import {
  initDB,
  closeWorkspaceDB,
  destroyWorkspaceData
} from '~/services/db'
import { startSync, stopSync } from '~/services/sync'
import { useRouteCache } from '~/composables/useRouteCache'

export const useWorkspaceStore = defineStore('workspace', () => {
  const list = ref<Workspace[]>([])
  const currentId = ref<string>('')
  const switching = ref(false)
  let switchPromise: Promise<void> | null = null

  const current = computed<Workspace | null>(
    () => list.value.find((w) => w.id === currentId.value) || null
  )

  async function reload() {
    list.value = await listWorkspaces()
  }

  function setCurrent(id: string) {
    currentId.value = id
    setActiveId(id)
  }

  async function init() {
    await reload()
    const stored = getActiveId()
    if (stored && list.value.some((w) => w.id === stored)) {
      currentId.value = stored
    } else if (list.value.length > 0) {
      setCurrent(list.value[0].id)
    }
  }

  async function switchTo(id: string) {
    if (id === currentId.value) return
    if (!list.value.some((w) => w.id === id)) {
      throw new Error(`工作空间不存在: ${id}`)
    }
    // 等待当前正在进行的切换完成，防止竞态条件
    if (switchPromise) {
      await switchPromise
    }

    let resolveLock!: () => void
    switchPromise = new Promise<void>((resolve) => {
      resolveLock = resolve
    })

    switching.value = true
    const previousId = currentId.value
    try {
      if (previousId) {
        await stopSync(previousId)
        await closeWorkspaceDB(previousId)
      }
      setCurrent(id)

      // 重置路由缓存栈
      const { resetStack } = useRouteCache()
      resetStack()

      // 广播空间切换事件，通知各业务模块清理状态
      if (import.meta.client) {
        window.dispatchEvent(new CustomEvent('workspace:changed', { detail: { from: previousId, to: id } }))
      }

      await initDB(id)
      console.log('[workspace] switchTo -> calling startSync for', id)
      await startSync(id)
    } finally {
      switching.value = false
      resolveLock()
      switchPromise = null
    }
  }

  async function create(input: WorkspaceFormData): Promise<Workspace> {
    const ws = await createWorkspace(input)
    await reload()
    return ws
  }

  async function update(id: string, patch: Partial<WorkspaceFormData>): Promise<Workspace> {
    const ws = await updateWorkspace(id, patch)
    await reload()
    if (id === currentId.value) {
      await stopSync(id)
      console.log('[workspace] update -> calling startSync for', id)
      await startSync(id)
    }
    return ws
  }

  async function remove(id: string) {
    if (id === currentId.value) {
      throw new Error('请先切换到其他空间再删除当前空间')
    }
    await stopSync(id)
    await destroyWorkspaceData(id)
    await deleteWorkspace(id)
    await reload()
  }

  return {
    list,
    currentId,
    current,
    switching,
    init,
    reload,
    switchTo,
    create,
    update,
    remove
  }
})
