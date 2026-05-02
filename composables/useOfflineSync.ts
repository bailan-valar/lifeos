import { getRxDB } from '~/services/rxdb'
import type { Block, Note, Folder, Tag } from '~/types/block'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncAt: Date | null
  pendingOperations: number
  hasConflicts: boolean
}

export function useOfflineSync(userId: string) {
  let db: any = null
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
    db = await getRxDB()

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
    if (!db) return

    const [
      unisSyncedBlocks,
      unisSyncedNotes,
      unisSyncedFolders,
      unisSyncedTags
    ] = await Promise.all([
      db.blocks.find({ selector: { isSynced: false } }).exec(),
      db.notes.find({ selector: { isSynced: false } }).exec(),
      db.folders.find({ selector: { isSynced: false } }).exec(),
      db.tags.find({ selector: { isSynced: false } }).exec()
    ])

    pendingOperations.value =
      unisSyncedBlocks.length +
      unisSyncedNotes.length +
      unisSyncedFolders.length +
      unisSyncedTags.length
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
    if (!db) return

    const collections = ['blocks', 'notes', 'folders', 'tags'] as const

    for (const collectionName of collections) {
      const collection = db[collectionName]
      const unisSyncedDocs = await collection.find({ selector: { isSynced: false } }).exec()

      for (const doc of unisSyncedDocs) {
        const data = doc.toJSON()
        try {
          const response = await $fetch(`/api/${collectionName}/${data.id}`, {
            method: 'PUT',
            body: data
          })

          await doc.update({
            $set: {
              isSynced: true,
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
    if (!db) return

    const lastSync = lastSyncAt.value || new Date(0)
    const collections = ['blocks', 'notes', 'folders', 'tags'] as const

    for (const collectionName of collections) {
      try {
        const remoteDocs = await $fetch<any[]>(`/api/${collectionName}`, {
          query: {
            userId,
            updatedAt: lastSync.toISOString()
          }
        })

        for (const remoteDoc of remoteDocs) {
          const localDoc = await db[collectionName].findOne(remoteDoc.id).exec()

          if (localDoc) {
            if (remoteDoc.version > localDoc.version) {
              await localDoc.update({
                $set: {
                  ...remoteDoc,
                  isSynced: true
                }
              })
            } else if (remoteDoc.version < localDoc.version) {
              hasConflicts.value = true
            }
          } else {
            await db[collectionName].insert({
              ...remoteDoc,
              isSynced: true
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
