import { initDB } from '~/services/db'
import { ensureBootstrapWorkspace } from '~/services/workspaces'

const CLEANUP_FLAG = 'lifeos:legacy-rxdb-cleared'

const LEGACY_COLLECTIONS = [
  'blocks',
  'notes',
  'folders',
  'tags',
  'noteTags',
  'blockLinks',
  'classes',
  'classFields',
  'noteClassBindings',
  'module_config',
  'module_data',
  'goals',
  'accounts',
  'billCategories',
  'bills',
  'budgets',
  'statements',
  'importRules',
  'importRecords'
]

async function clearLegacyDatabases() {
  if (typeof window === 'undefined' || !window.indexedDB) return
  if (localStorage.getItem(CLEANUP_FLAG) === '1') return

  const legacyExact = new Set(LEGACY_COLLECTIONS.map((name) => `lifeos-${name}`))

  try {
    const list = await indexedDB.databases?.()
    if (!list) {
      localStorage.setItem(CLEANUP_FLAG, '1')
      return
    }
    for (const { name } of list) {
      if (!name) continue
      if (name.startsWith('_pouch_')) continue
      if (
        name.startsWith('rxdb-dexie-') ||
        name.startsWith('lifeos-notes-') ||
        legacyExact.has(name)
      ) {
        indexedDB.deleteDatabase(name)
      }
    }
  } catch (e) {
    console.warn('[pouchdb] legacy cleanup failed', e)
  } finally {
    localStorage.setItem(CLEANUP_FLAG, '1')
  }
}

export default defineNuxtPlugin(async () => {
  await clearLegacyDatabases()
  try {
    const ws = await ensureBootstrapWorkspace()
    if (ws) {
      await initDB(ws.id)
    }
  } catch (error) {
    console.error('Failed to initialize PouchDB:', error)
  }
})
