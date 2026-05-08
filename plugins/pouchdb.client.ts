import { initDB } from '~/services/db'
import { ensureBootstrapWorkspace } from '~/services/workspaces'

export default defineNuxtPlugin({
  name: 'pouchdb-init',
  dependsOn: ['auth-init'],
  async setup() {
    try {
      const ws = await ensureBootstrapWorkspace()
      if (ws) {
        await initDB(ws.id)
      }
    } catch (error) {
      console.error('Failed to initialize PouchDB:', error)
    }
  }
})
