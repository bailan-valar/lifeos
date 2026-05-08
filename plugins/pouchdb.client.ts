import { initDB } from '~/services/db'
import { ensureBootstrapWorkspace } from '~/services/workspaces'

const CLEANUP_FLAG = 'lifeos:legacy-rxdb-cleared'

// 无工作空间前缀的旧集合名（RxDB 时代遗留）
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
      // 清理残留的旧格式 per-collection 数据库（lifeos-{uuid}-{collection}）
      // 正常情况下由 migration.ts 迁移后销毁，这里兜底清理无工作空间引用的孤立库
      if (name.startsWith('lifeos-')) {
        // 匹配 lifeos-{uuid}-{collection} 模式（UUID v4 格式）
        const match = name.match(/^lifeos-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)$/i)
        if (match && LEGACY_COLLECTIONS.includes(match[2])) {
          indexedDB.deleteDatabase(name)
        }
      }
    }
  } catch (e) {
    console.warn('[pouchdb] legacy cleanup failed', e)
  } finally {
    localStorage.setItem(CLEANUP_FLAG, '1')
  }
}

export default defineNuxtPlugin({
  name: 'pouchdb-init',
  dependsOn: ['auth-init'],
  async setup() {
    await clearLegacyDatabases()
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
