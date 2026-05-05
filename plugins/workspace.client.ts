import { useWorkspaceStore } from '~/stores/workspace'
import { startSync, setSyncEnvDefaults } from '~/services/sync'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const pub = config.public as {
    couchdbUrl?: string
    couchdbUsername?: string
    couchdbPassword?: string
    couchdbPrefix?: string
  }
  setSyncEnvDefaults({
    remoteUrl: pub.couchdbUrl,
    remoteUsername: pub.couchdbUsername,
    remotePassword: pub.couchdbPassword,
    remotePrefix: pub.couchdbPrefix
  })

  const store = useWorkspaceStore()
  try {
    await store.init()
    if (store.currentId) {
      await startSync(store.currentId)
    }
  } catch (error) {
    console.error('Failed to initialize workspace store:', error)
  }
})
