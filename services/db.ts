import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'
import { dbPrefix, getActiveId } from '~/services/workspaces'

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

interface RawPouchDoc {
  _id: string
  _rev: string
  [key: string]: any
}

const COLLECTION_INDEXES: Record<string, string[][]> = {
  blocks: [['noteId'], ['noteId', 'order']],
  notes: [['order'], ['createdAt'], ['updatedAt']],
  folders: [],
  tags: [['name']],
  noteTags: [['noteId'], ['tagId'], ['noteId', 'tagId']],
  blockLinks: [['sourceBlockId'], ['targetBlockId'], ['sourceBlockId', 'targetBlockId']],
  classes: [['order']],
  classFields: [['classId'], ['order']],
  noteClassBindings: [['noteId'], ['classId'], ['noteId', 'classId'], ['order']],
  module_config: [['noteId'], ['moduleId'], ['noteId', 'moduleId']],
  module_data: [['noteId'], ['moduleId'], ['noteId', 'moduleId']],
  goals: [['status'], ['priority'], ['type'], ['plannedEndAt'], ['createdAt']],
  accounts: [['type'], ['subtype'], ['createdAt']],
  billCategories: [['type'], ['parentId'], ['order']],
  bills: [['noteId'], ['type'], ['date'], ['noteId', 'date'], ['status', 'date'], ['fromAccountId'], ['toAccountId'], ['categoryId'], ['importBatchId']],
  budgets: [
    ['noteId'],
    ['categoryId'],
    ['categoryId', 'effectiveFromYear', 'effectiveFromMonth'],
    ['cycleType'],
    ['createdAt']
  ],
  statements: [['accountId'], ['year'], ['month'], ['year', 'month'], ['accountId', 'year', 'month'], ['status']],
  importRules: [['source'], ['matchField'], ['matchMode'], ['priority'], ['enabled'], ['accountId']],
  importRecords: [['noteId'], ['createdAt'], ['source'], ['status'], ['noteId', 'createdAt']]
}

export const COLLECTION_NAMES = Object.keys(COLLECTION_INDEXES)

function stripPouchFields(raw: RawPouchDoc): AnyDoc {
  const { _id, _rev, ...rest } = raw
  return rest as AnyDoc
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

function ensureSelectorForSort(selector: Selector, sort?: SortSpec): Selector {
  if (!sort || sort.length === 0) return selector
  const next: Selector = { ...selector }
  for (const spec of sort) {
    const field = Object.keys(spec)[0]
    if (!(field in next)) {
      next[field] = { $gt: null }
    }
  }
  return next
}

function nonEmptySelector(selector: Selector): Selector {
  return Object.keys(selector).length > 0 ? selector : { _id: { $gt: null } }
}

function createCollection(name: string, prefix: string, instances: Map<string, PouchDB.Database>): Collection {
  const pdb = new PouchDB(prefix + name)
  instances.set(name, pdb)
  const indexes = COLLECTION_INDEXES[name] || []

  const indexesReady = (async () => {
    for (const fields of indexes) {
      try {
        await pdb.createIndex({ index: { fields } })
      } catch (e) {
        console.warn(`[db] failed to create index on ${name}:${fields.join(',')}`, e)
      }
    }
  })()

  const runFind = async (opts: FindOpts): Promise<DBDoc[]> => {
    await indexesReady
    const baseSelector = ensureSelectorForSort(opts.selector || {}, opts.sort)
    const selector = nonEmptySelector(baseSelector)
    const result = await pdb.find({
      selector,
      sort: opts.sort,
      limit: opts.limit || 100000,
      ...(opts.skip ? { skip: opts.skip } : {})
    })
    return result.docs.map((d) => makeDoc(pdb, d as RawPouchDoc))
  }

  const runGet = async (id: string): Promise<DBDoc | null> => {
    try {
      const raw = await pdb.get(id)
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
      await pdb.put({ ...data, _id: data.id })
    },
    async upsert(data: AnyDoc) {
      await indexesReady
      try {
        const existing = await pdb.get(data.id)
        await pdb.put({ ...existing, ...data, _id: data.id, _rev: existing._rev })
      } catch (e: any) {
        if (e?.status === 404) {
          await pdb.put({ ...data, _id: data.id })
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
  instances: Map<string, PouchDB.Database>
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
  const prefix = dbPrefix(workspaceId)
  const instances = new Map<string, PouchDB.Database>()
  const dbs: Database = {}
  for (const name of Object.keys(COLLECTION_INDEXES)) {
    dbs[name] = createCollection(name, prefix, instances)
  }
  return { database: dbs, instances }
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

export async function getRawPouchDB(workspaceId: string, collection: string): Promise<PouchDB.Database | undefined> {
  const cached = databases.get(workspaceId)
  if (cached) return cached.instances.get(collection)
  await initDB(workspaceId)
  return databases.get(workspaceId)?.instances.get(collection)
}

export function listLoadedWorkspaceIds(): string[] {
  return Array.from(databases.keys())
}

export async function closeWorkspaceDB(workspaceId: string): Promise<void> {
  const cached = databases.get(workspaceId)
  if (!cached) return
  databases.delete(workspaceId)
  initPromises.delete(workspaceId)
  await Promise.all(
    Array.from(cached.instances.values()).map((db) =>
      db.close().catch((e) => console.warn('[db] close failed', workspaceId, e))
    )
  )
}

export async function destroyWorkspaceData(workspaceId: string): Promise<void> {
  const prefix = dbPrefix(workspaceId)
  const cached = databases.get(workspaceId)
  if (cached) {
    databases.delete(workspaceId)
    initPromises.delete(workspaceId)
    await Promise.all(
      Array.from(cached.instances.values()).map((db) =>
        db.destroy().catch((e) => console.warn('[db] destroy failed', workspaceId, e))
      )
    )
    return
  }
  for (const name of Object.keys(COLLECTION_INDEXES)) {
    try {
      await new PouchDB(prefix + name).destroy()
    } catch (e) {
      console.warn('[db] destroy failed', prefix + name, e)
    }
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function now(): string {
  return new Date().toISOString()
}

export type { Database, Collection, DBDoc, FindOpts, SortSpec }
