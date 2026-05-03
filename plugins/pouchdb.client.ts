import { initDB } from '~/services/db'

const CLEANUP_FLAG = 'lifeos:legacy-rxdb-cleared'

async function clearLegacyDatabases() {
  if (typeof window === 'undefined' || !window.indexedDB) return
  if (localStorage.getItem(CLEANUP_FLAG) === '1') return

  try {
    const list = await indexedDB.databases?.()
    if (!list) {
      localStorage.setItem(CLEANUP_FLAG, '1')
      return
    }
    for (const { name } of list) {
      if (!name) continue
      if (name.startsWith('_pouch_')) continue
      if (name.startsWith('rxdb-dexie-') || name.startsWith('lifeos-notes-')) {
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
    await initDB()
  } catch (error) {
    console.error('Failed to initialize PouchDB:', error)
  }
})
