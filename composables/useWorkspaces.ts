import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '~/stores/workspace'

export function useWorkspaces() {
  const store = useWorkspaceStore()
  const { list, currentId, current, switching } = storeToRefs(store)

  return {
    list,
    currentId,
    current,
    switching,
    init: store.init,
    reload: store.reload,
    switchTo: store.switchTo,
    create: store.create,
    update: store.update,
    remove: store.remove
  }
}
