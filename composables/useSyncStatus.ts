import { ref, computed, watch, onUnmounted, unref, type MaybeRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkspaceStore } from '~/stores/workspace'
import { getStatus, subscribeStatus } from '~/services/sync'
import { emptySyncStatus, type WorkspaceSyncStatus } from '~/types/workspace'

export function useSyncStatus(workspaceId?: MaybeRef<string>) {
  const store = useWorkspaceStore()
  const { currentId } = storeToRefs(store)

  const targetId = computed(() => unref(workspaceId) || currentId.value)
  const status = ref<WorkspaceSyncStatus>(
    targetId.value ? getStatus(targetId.value) : emptySyncStatus('')
  )

  let unsubscribe: (() => void) | null = null

  const stop = watch(
    targetId,
    (id) => {
      unsubscribe?.()
      unsubscribe = null
      if (!id) {
        status.value = emptySyncStatus('')
        return
      }
      unsubscribe = subscribeStatus(id, (s) => {
        status.value = s
      })
    },
    { immediate: true }
  )

  onUnmounted(() => {
    unsubscribe?.()
    stop()
  })

  return { status }
}
