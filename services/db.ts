import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'
import { dbName, getActiveId } from '~/services/workspaces'

PouchDB.plugin(PouchDBFind)

// Silence PouchDB's deprecated db.type() warning used internally by pouchdb-find
const origType = (PouchDB.prototype as any).type
if (origType) {
  (PouchDB.prototype as any).type = function () {
    return (this as any)._adapter || (this as any).adapter
  }
}

type AnyDoc = Record<string, any> & { id: string }
type Selector = Record<string, any>
type SortSpec = Array<Record<string, 'asc' | 'desc'>>

interface FindOpts {
  selector?: Selector
  sort?: SortSpec
  limit?: number
  skip?: number
}

type ChangeListener = () => void

interface ChangeBus {
  feed: PouchDB.Core.Changes<{}> | null
  listeners: Map<string, Set<ChangeListener>>
  timers: Map<string, ReturnType<typeof setTimeout>>
}

const changeBuses = new Map<string, ChangeBus>()
const DEFAULT_DEBOUNCE_MS = 300

function ensureChangeBus(workspaceId: string): ChangeBus {
  let bus = changeBuses.get(workspaceId)
  if (!bus) {
    bus = { feed: null, listeners: new Map(), timers: new Map() }
    changeBuses.set(workspaceId, bus)
  }
  return bus
}

function notifyCollectionChange(workspaceId: string, collection: string) {
  const bus = changeBuses.get(workspaceId)
  if (!bus) return
  const listeners = bus.listeners.get(collection)
  if (!listeners || listeners.size === 0) return

  const existing = bus.timers.get(collection)
  if (existing) clearTimeout(existing)

  bus.timers.set(
    collection,
    setTimeout(() => {
      bus.timers.delete(collection)
      for (const fn of listeners) {
        try {
          fn()
        } catch (e) {
          console.warn('[db] change listener failed:', e)
        }
      }
    }, DEFAULT_DEBOUNCE_MS)
  )
}

function startGlobalChanges(workspaceId: string, pdb: PouchDB.Database) {
  const bus = ensureChangeBus(workspaceId)
  if (bus.feed) return

  try {
    bus.feed = pdb.changes({ live: true, since: 'now', include_docs: false })
    bus.feed.on('change', (change) => {
      const coll = change.id.includes('/') ? change.id.split('/')[0] : ''
      if (!coll) return
      notifyCollectionChange(workspaceId, coll)
    })
    bus.feed.on('error', (err) => {
      console.warn(`[db] changes feed error for ${workspaceId}:`, err)
    })
  } catch (e) {
    console.warn(`[db] failed to start changes feed for ${workspaceId}:`, e)
  }
}

interface RawPouchDoc {
  _id: string
  _rev: string
  collection?: string
  [key: string]: any
}

const COLLECTION_INDEXES: Record<string, string[][]> = {
  blocks: [['noteId', 'order']],
  notes: [['order'], ['updatedAt']],
  folders: [],
  tags: [],
  noteTags: [['noteId']],
  blockLinks: [],
  classes: [['order']],
  classFields: [['classId'], ['order']],
  noteClassBindings: [['noteId']],
  module_config: [['noteId', 'moduleId']],
  module_data: [['noteId', 'moduleId']],
  goals: [],
  accounts: [['createdAt']],
  billCategories: [['order']],
  bills: [['date'], ['noteId', 'date'], ['status', 'date']],
  budgets: [['createdAt']],
  statements: [['year', 'month'], ['accountId', 'year', 'month']],
  importRules: [['priority']],
  importRecords: [['createdAt'], ['noteId', 'createdAt']],
  balanceAdjustments: [['accountId', 'date']]
}

export const COLLECTION_NAMES = Object.keys(COLLECTION_INDEXES)

/**
 * 构建去重后的 Mango 索引列表。
 * 每个集合的索引以 collection 为首字段，确保按集合过滤后可利用后续字段排序。
 */
function buildAllIndexes(): string[][] {
  const seen = new Set<string>()
  const result: string[][] = []
  for (const indexes of Object.values(COLLECTION_INDEXES)) {
    for (const fields of indexes) {
      const fullFields = ['collection', ...fields]
      const key = fullFields.join(',')
      if (!seen.has(key)) {
        seen.add(key)
        result.push(fullFields)
      }
    }
  }
  return result
}

function stripPouchFields(raw: RawPouchDoc): AnyDoc {
  const { _id, _rev, collection: _coll, ...rest } = raw
  // 从 _id 中提取业务 ID（格式："{collection}/{businessId}"）
  const id = _id.includes('/') ? _id.substring(_id.indexOf('/') + 1) : _id
  return { ...rest, id } as AnyDoc
}

interface DBDoc {
  toJSON: () => AnyDoc
  get: (field: string) => any
  patch: (partial: Record<string, any>) => Promise<void>
  update: (op: { $set: Record<string, any> }) => Promise<void>
  remove: () => Promise<void>
  readonly id: string
  readonly [key: string]: any
}

function makeDoc(pdb: PouchDB.Database, raw: RawPouchDoc): DBDoc {
  let current = raw

  const proxy: any = {
    toJSON: () => stripPouchFields(current),
    get: (field: string) => current[field],
    patch: async (partial: Record<string, any>) => {
      const next = { ...current, ...partial }
      const res = await pdb.put(next)
      current = { ...next, _rev: res.rev }
      Object.assign(proxy, stripPouchFields(current))
    },
    update: async (op: { $set: Record<string, any> }) => {
      const next = { ...current, ...op.$set }
      const res = await pdb.put(next)
      current = { ...next, _rev: res.rev }
      Object.assign(proxy, stripPouchFields(current))
    },
    remove: async () => {
      await pdb.remove(current._id, current._rev)
    }
  }

  Object.assign(proxy, stripPouchFields(current))
  return proxy as DBDoc
}

class Query<T> {
  constructor(private resolver: () => Promise<T>) {}

  exec(): Promise<T> {
    return this.resolver()
  }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.resolver().then(onFulfilled, onRejected)
  }

  catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.resolver().catch(onRejected)
  }

  async remove(): Promise<void> {
    const result = await this.resolver()
    if (result && typeof (result as any).remove === 'function') {
      await (result as any).remove()
    }
  }
}

interface Collection {
  find: (opts?: FindOpts) => Query<DBDoc[]>
  findOne: (idOrOpts: string | FindOpts) => Query<DBDoc | null>
  insert: (data: AnyDoc) => Promise<void>
  upsert: (data: AnyDoc) => Promise<void>
}

/**
 * 创建集合 wrapper。
 * 所有集合共享同一个 PouchDB 实例（pdb），通过 collection 字段区分。
 * _id 格式："{collection}/{businessId}"，保证全局唯一。
 */
function createCollection(name: string, pdb: PouchDB.Database, indexesReady: Promise<void>): Collection {
  const runFind = async (opts: FindOpts): Promise<DBDoc[]> => {
    await indexesReady
    const selector: Selector = {
      collection: name,
      ...(opts.selector || {})
    }
    let sort = opts.sort
    if (sort && sort.length > 0) {
      // PouchDB-find 要求 sort 必须匹配索引前缀。
      // 所有索引都以 collection 为首字段，因此将 collection  prepend 到 sort 中，
      // 方向与第一个用户 sort 字段保持一致（同一方向才能命中索引）。
      const firstDirection = sort[0][Object.keys(sort[0])[0]]
      sort = [{ collection: firstDirection }, ...sort]

      // 将 sort 字段加入 selector（Mango 查询要求 sort 字段必须出现在 selector 中）
      for (const spec of sort) {
        const field = Object.keys(spec)[0]
        if (!(field in selector)) {
          selector[field] = { $gt: null }
        }
      }
    }
    const result = await pdb.find({
      selector,
      sort,
      limit: opts.limit || 100000,
      ...(opts.skip ? { skip: opts.skip } : {})
    })
    return result.docs.map((d) => makeDoc(pdb, d as RawPouchDoc))
  }

  const runGet = async (id: string): Promise<DBDoc | null> => {
    try {
      const raw = await pdb.get(`${name}/${id}`)
      return makeDoc(pdb, raw as RawPouchDoc)
    } catch (e: any) {
      if (e?.status === 404) return null
      throw e
    }
  }

  return {
    find(opts: FindOpts = {}) {
      return new Query<DBDoc[]>(() => runFind(opts))
    },
    findOne(idOrOpts: string | FindOpts) {
      return new Query<DBDoc | null>(async () => {
        if (typeof idOrOpts === 'string') {
          return runGet(idOrOpts)
        }
        const docs = await runFind({ ...idOrOpts, limit: 1 })
        return docs[0] || null
      })
    },
    async insert(data: AnyDoc) {
      await indexesReady
      await pdb.put({ ...data, _id: `${name}/${data.id}`, collection: name })
    },
    async upsert(data: AnyDoc) {
      await indexesReady
      const fullId = `${name}/${data.id}`
      try {
        const existing = await pdb.get(fullId)
        await pdb.put({
          ...existing, ...data,
          _id: fullId,
          _rev: existing._rev,
          collection: name
        })
      } catch (e: any) {
        if (e?.status === 404) {
          await pdb.put({ ...data, _id: fullId, collection: name })
          return
        }
        throw e
      }
    }
  }
}

type Database = Record<string, Collection>

interface WorkspaceDB {
  database: Database
  instance: PouchDB.Database
}

const databases = new Map<string, WorkspaceDB>()
const initPromises = new Map<string, Promise<WorkspaceDB>>()

function createNoopDB(): Database {
  const noopCollection: Collection = {
    find() { return new Query<DBDoc[]>(() => Promise.resolve([])) },
    findOne() { return new Query<DBDoc | null>(() => Promise.resolve(null)) },
    async insert() {},
    async upsert() {},
  }
  const db: Database = {}
  for (const name of Object.keys(COLLECTION_INDEXES)) {
    db[name] = noopCollection
  }
  return db
}

const NOOP_DB = createNoopDB()

function resolveWorkspaceId(workspaceId?: string): string {
  if (workspaceId) return workspaceId
  const activeId = getActiveId()
  if (!activeId) {
    throw new Error('[db] No active workspace; ensureBootstrapWorkspace must run first')
  }
  return activeId
}

async function doInitDB(workspaceId: string): Promise<WorkspaceDB> {
  const name = dbName(workspaceId)
  const pdb = new PouchDB(name)
  if (typeof (pdb as any).setMaxListeners === 'function') {
    ;(pdb as any).setMaxListeners(100)
  }

  const allIndexes = buildAllIndexes()
  const indexesReady = Promise.all(
    allIndexes.map((fields) =>
      pdb.createIndex({ index: { fields } }).catch((e) =>
        console.warn(`[db] failed to create index [${fields.join(',')}]:`, e)
      )
    )
  ).then(() => {})

  const dbs: Database = {}
  for (const collName of Object.keys(COLLECTION_INDEXES)) {
    dbs[collName] = createCollection(collName, pdb, indexesReady)
  }

  const result: WorkspaceDB = { database: dbs, instance: pdb }
  startGlobalChanges(workspaceId, pdb)
  return result
}

export async function initDB(workspaceId?: string): Promise<Database> {
  const id = resolveWorkspaceId(workspaceId)
  const cached = databases.get(id)
  if (cached) return cached.database
  const pending = initPromises.get(id)
  if (pending) return (await pending).database

  const promise = doInitDB(id)
  initPromises.set(id, promise)

  try {
    const result = await promise
    databases.set(id, result)
    return result.database
  } catch (error) {
    initPromises.delete(id)
    throw error
  } finally {
    initPromises.delete(id)
  }
}

export async function getDB(workspaceId?: string): Promise<Database> {
  try {
    const id = resolveWorkspaceId(workspaceId)
    const cached = databases.get(id)
    if (cached) return cached.database
    return initDB(id)
  } catch (e) {
    if (e instanceof Error && e.message.includes('No active workspace')) {
      return NOOP_DB
    }
    throw e
  }
}

export async function getRawPouchDB(workspaceId: string): Promise<PouchDB.Database | undefined> {
  const cached = databases.get(workspaceId)
  if (cached) return cached.instance
  await initDB(workspaceId)
  return databases.get(workspaceId)?.instance
}

export function listLoadedWorkspaceIds(): string[] {
  return Array.from(databases.keys())
}

export async function closeWorkspaceDB(workspaceId: string): Promise<void> {
  const cached = databases.get(workspaceId)
  if (!cached) return
  databases.delete(workspaceId)
  initPromises.delete(workspaceId)

  const bus = changeBuses.get(workspaceId)
  if (bus) {
    if (bus.feed) {
      try { bus.feed.cancel() } catch {}
      bus.feed = null
    }
    bus.timers.forEach(clearTimeout)
    bus.timers.clear()
    bus.listeners.clear()
    changeBuses.delete(workspaceId)
  }

  await cached.instance.close().catch((e) =>
    console.warn('[db] close failed', workspaceId, e)
  )
}

export async function destroyWorkspaceData(workspaceId: string): Promise<void> {
  const bus = changeBuses.get(workspaceId)
  if (bus) {
    if (bus.feed) {
      try { bus.feed.cancel() } catch {}
      bus.feed = null
    }
    bus.timers.forEach(clearTimeout)
    bus.timers.clear()
    bus.listeners.clear()
    changeBuses.delete(workspaceId)
  }

  const cached = databases.get(workspaceId)
  if (cached) {
    databases.delete(workspaceId)
    initPromises.delete(workspaceId)
    await cached.instance.destroy().catch((e) =>
      console.warn('[db] destroy failed', workspaceId, e)
    )
    return
  }
  try {
    await new PouchDB(dbName(workspaceId)).destroy()
  } catch (e) {
    console.warn('[db] destroy failed', dbName(workspaceId), e)
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`
}

export function now(): string {
  return new Date().toISOString()
}

export function onCollectionChange(
  collection: string,
  callback: ChangeListener,
  options?: { debounceMs?: number; workspaceId?: string }
): () => void {
  const workspaceId = options?.workspaceId || getActiveId() || ''
  if (!workspaceId) {
    console.warn('[db] onCollectionChange: no active workspace')
    return () => {}
  }

  const bus = ensureChangeBus(workspaceId)
  let set = bus.listeners.get(collection)
  if (!set) {
    set = new Set()
    bus.listeners.set(collection, set)
  }
  set.add(callback)

  const wsDB = databases.get(workspaceId)
  if (wsDB?.instance && !bus.feed) {
    startGlobalChanges(workspaceId, wsDB.instance)
  }

  return () => {
    const s = bus.listeners.get(collection)
    if (s) {
      s.delete(callback)
      if (s.size === 0) bus.listeners.delete(collection)
    }
  }
}

export type { Database, Collection, DBDoc, FindOpts, SortSpec }
