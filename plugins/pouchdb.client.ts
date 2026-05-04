import { initDB, getDB, now } from '~/services/db'

const CLEANUP_FLAG = 'lifeos:legacy-rxdb-cleared'
const ACCOUNT_TYPE_MIGRATION_FLAG = 'lifeos:account-type-migrated-v2'

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

/**
 * 一次性迁移:把旧的 type='other' 账户默认改为 'merchant'。
 * 用户可在账户管理页将借贷对方手动改为 'contact'。
 */
async function migrateAccountTypes() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(ACCOUNT_TYPE_MIGRATION_FLAG) === '1') return

  try {
    const db = await getDB()
    const docs = await db.accounts.find({ selector: { type: 'other' } }).exec()
    for (const doc of docs) {
      await doc.patch({ type: 'merchant', updatedAt: now() })
    }
    if (docs.length > 0) {
      console.info(`[pouchdb] migrated ${docs.length} account(s) from "other" to "merchant"`)
    }
  } catch (e) {
    console.warn('[pouchdb] account type migration failed', e)
  } finally {
    localStorage.setItem(ACCOUNT_TYPE_MIGRATION_FLAG, '1')
  }
}

export default defineNuxtPlugin(async () => {
  await clearLegacyDatabases()
  try {
    await initDB()
    await migrateAccountTypes()
  } catch (error) {
    console.error('Failed to initialize PouchDB:', error)
  }
})
