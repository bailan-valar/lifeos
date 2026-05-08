import PouchDB from 'pouchdb-browser'

// Must match COLLECTION_INDEXES keys in db.ts
const COLLECTIONS = [
  'blocks', 'notes', 'folders', 'tags', 'noteTags', 'blockLinks',
  'classes', 'classFields', 'noteClassBindings', 'module_config',
  'module_data', 'goals', 'accounts', 'billCategories', 'bills',
  'budgets', 'statements', 'importRules', 'importRecords'
]

const MIGRATION_FLAG_PREFIX = 'lifeos:migrated-ws:'
const FIXUP_FLAG_PREFIX = 'lifeos:fixup-collection-ws:'

/**
 * 将旧的「每个集合一个 PouchDB 实例」格式迁移到「一个工作空间一个实例」格式。
 *
 * 旧格式文档：{ _id: '{businessId}', ... }，存储在 lifeos-{wsId}-{collection} 中
 * 新格式文档：{ _id: '{collection}/{businessId}', collection: '{collection}', ... }，存储在 lifeos-{wsId} 中
 *
 * 幂等：通过 per-workspace localStorage 标志位控制，已迁移的空间直接跳过。
 */
export async function migrateWorkspaceIfNeeded(workspaceId: string): Promise<void> {
  if (typeof window === 'undefined') return

  const flag = `${MIGRATION_FLAG_PREFIX}${workspaceId}`
  if (localStorage.getItem(flag) === '1') return

  // 检查是否存在旧格式的数据库
  let hasOldData = false
  for (const collection of COLLECTIONS) {
    const oldName = `lifeos-${workspaceId}-${collection}`
    try {
      const oldDb = new PouchDB(oldName)
      const info = await oldDb.info()
      await oldDb.close()
      if (info.doc_count > 0) {
        hasOldData = true
        break
      }
    } catch {
      continue
    }
  }

  if (!hasOldData) {
    // 无旧数据，设置标志并清理空数据库
    localStorage.setItem(flag, '1')
    for (const collection of COLLECTIONS) {
      try {
        await new PouchDB(`lifeos-${workspaceId}-${collection}`).destroy()
      } catch { /* ignore */ }
    }
    return
  }

  console.log(`[migration] 开始迁移工作空间 ${workspaceId} 的数据...`)

  const newDbName = `lifeos-${workspaceId}`
  const newDb = new PouchDB(newDbName)

  try {
    for (const collection of COLLECTIONS) {
      const oldName = `lifeos-${workspaceId}-${collection}`
      let oldDb: PouchDB.Database
      try {
        oldDb = new PouchDB(oldName)
        const info = await oldDb.info()
        if (info.doc_count === 0) {
          await oldDb.destroy()
          continue
        }
      } catch {
        continue
      }

      // 读取旧数据库所有文档
      const result = await oldDb.allDocs({ include_docs: true })
      const docs = result.rows
        .map(r => r.doc)
        .filter(d => d && !d._id.startsWith('_'))
        .map(d => {
          const { _rev, ...rest } = d!
          return {
            ...rest,
            _id: `${collection}/${d!._id}`,
            collection: collection
          }
        })

      if (docs.length > 0) {
        // 批量写入新数据库，忽略已存在的冲突文档
        const results = await newDb.bulkDocs(docs)
        let migrated = 0
        let skipped = 0
        for (const r of results) {
          if ((r as any).error) {
            if ((r as any).status === 409) {
              skipped++
            } else {
              console.warn(`[migration] 迁移文档失败 ${(r as any).id}:`, r)
            }
          } else {
            migrated++
          }
        }
        if (migrated > 0 || skipped > 0) {
          console.log(`[migration] ${collection}: ${migrated} 个文档已迁移, ${skipped} 个已存在跳过`)
        }
      }

      // 销毁旧数据库
      await oldDb.destroy()
    }

    localStorage.setItem(flag, '1')
    console.log(`[migration] 工作空间 ${workspaceId} 迁移完成`)
  } catch (e) {
    console.error(`[migration] 工作空间 ${workspaceId} 迁移失败:`, e)
    await newDb.close()
    // 不设置标志位，下次启动时会重试
  }
}

/**
 * 修复已迁移但使用了错误 _collection 字段名的文档。
 * 将 _collection 重命名为 collection（PouchDB 不允许自定义 _ 前缀字段）。
 */
export async function fixupCollectionField(workspaceId: string): Promise<void> {
  if (typeof window === 'undefined') return

  const flag = `${FIXUP_FLAG_PREFIX}${workspaceId}`
  if (localStorage.getItem(flag) === '1') return

  const dbName = `lifeos-${workspaceId}`
  let db: PouchDB.Database
  try {
    db = new PouchDB(dbName)
    const info = await db.info()
    if (info.doc_count === 0) {
      await db.close()
      localStorage.setItem(flag, '1')
      return
    }
  } catch {
    localStorage.setItem(flag, '1')
    return
  }

  try {
    // 查找含有 _collection 字段的文档
    const result = await db.allDocs({ include_docs: true })
    const toFix = result.rows
      .map(r => r.doc)
      .filter(d => d && d._collection !== undefined) as any[]

    if (toFix.length > 0) {
      console.log(`[migration] 修复 ${toFix.length} 个文档的 _collection → collection`)
      const fixed = toFix.map(d => {
        const { _collection, ...rest } = d
        return { ...rest, collection: _collection }
      })
      await db.bulkDocs(fixed)
    }

    localStorage.setItem(flag, '1')
    await db.close()
  } catch (e) {
    console.warn('[migration] fixup failed:', e)
    try { await db.close() } catch {}
  }
}


