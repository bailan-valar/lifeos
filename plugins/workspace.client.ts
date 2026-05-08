import { useWorkspaceStore } from '~/stores/workspace'
import { startSync } from '~/services/sync'

export default defineNuxtPlugin({
  name: 'workspace-init',
  dependsOn: ['pouchdb-init'],
  async setup() {
    const store = useWorkspaceStore()
    try {
      await store.init()
      if (store.currentId) {
        await startSync(store.currentId)
      }
    } catch (error) {
      console.error('Failed to initialize workspace store:', error)
    }
  }
})
