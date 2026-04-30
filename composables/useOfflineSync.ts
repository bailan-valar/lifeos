import { getRxDB } from './rxdb'
import type { Block, Note, Folder, Tag } from '~/types/block'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt: Date | null
  pendingOperations: number
  hasConflicts: boolean
}

export function useOfflineSync(userId: string) {
  const db = ref<any>(null)
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const lastSyncAt = ref<Date | null>(null)
  const pendingOperations = ref(0)
  const hasConflicts = ref(false)

  const syncStatus = computed<SyncStatus>(() => ({
    isOnline: isOnline.value,
    isSyncing: isSyncing.value,
    lastSyncAt: lastSyncAt.value,
    pendingOperations: pendingOperations.value,
    hasConflicts: hasConflicts.value
  }))

  const init = async () => {
    db.value = await getRxDB()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    await countPendingOperations()
  }

  const handleOnline = async () => {
    isOnline.value = true
    await sync()
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  const countPendingOperations = async () => {
    if (!db.value) return

    const [
      unsyncedBlocks,
      unsyncedNotes,
      unsyncedFolders,
      unsyncedTags
    ] = await Promise.all([
      db.value.blocks.find({ selector: { synced: false } }).exec(),
      db.value.notes.find({ selector: { synced: false } }).exec(),
      db.value.folders.find({ selector: { synced: false } }).exec(),
      db.value.tags.find({ selector: { synced: false } }).exec()
    ])

    pendingOperations.value =
      unsyncedBlocks.length +
      unsyncedNotes.length +
      unsyncedFolders.length +
      unsyncedTags.length
  }

  const sync = async () => {
    if (!isOnline.value || isSyncing.value) return

    isSyncing.value = true

    try {
      await pushLocalChanges()
      await pullRemoteChanges()
      lastSyncAt.value = new Date()
      await countPendingOperations()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      isSyncing.value = false
    }
  }

  const pushLocalChanges = async () => {
    if (!db.value) return

    const collections = ['blocks', 'notes', 'folders', 'tags'] as const

    for (const collectionName of collections) {
      const collection = db.value[collectionName]
      const unsyncedDocs = await collection.find({ selector: { synced: false } }).exec()

      for (const doc of unsyncedDocs) {
        const data = doc.toJSON()
        try {
          const response = await $fetch(`/api/${collectionName}/${data.id}`, {
            method: 'PUT',
            body: data
          })

          await doc.update({
            $set: {
              synced: true,
              version: (data.version || 0) + 1
            }
          })
        } catch (error) {
          console.error(`Failed to sync ${collectionName} ${data.id}:`, error)
        }
      }
    }
  }

  const pullRemoteChanges = async () => {
    if (!db.value) return

    const lastSync = lastSyncAt.value || new Date(0)
    const collections = ['blocks', 'notes', 'folders', 'tags'] as const

    for (const collectionName of collections) {
      try {
        const remoteDocs = await $fetch(`/api/${collectionName}`, {
          query: {
            userId,
            updatedAt: lastSync.toISOString()
          }
        })

        for (const remoteDoc of remoteDocs) {
          const localDoc = await db.value[collectionName].findOne(remoteDoc.id).exec()

          if (localDoc) {
            if (remoteDoc.version > localDoc.version) {
              await localDoc.update({
                $set: {
                  ...remoteDoc,
                  synced: true
                }
              })
            } else if (remoteDoc.version < localDoc.version) {
              hasConflicts.value = true
            }
          } else {
            await db.value[collectionName].insert({
              ...remoteDoc,
              synced: true
            })
          }
        }
      } catch (error) {
        console.error(`Failed to pull ${collectionName}:`, error)
      }
    }
  }

  const forceSync = async () => {
    await sync()
  }

  const clearConflicts = () => {
    hasConflicts.value = false
  }

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    syncStatus,
    init,
    sync,
    forceSync,
    clearConflicts
  }
}
