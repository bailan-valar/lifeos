import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'

PouchDB.plugin(PouchDBFind)

type AnyDoc = Record<string, any> & { id: string }
type Selector = Record<string, any>
type SortSpec = Array<Record<string, 'asc' | 'desc'>>

interface FindOpts {
  selector?: Selector
  sort?: SortSpec
}

interface RawPouchDoc {
  _id: string
  _rev: string
  [key: string]: any
}

const COLLECTION_INDEXES: Record<string, string[][]> = {
  blocks: [['noteId'], ['noteId', 'order'], ['isSynced']],
  notes: [['userId'], ['createdAt'], ['updatedAt'], ['isSynced']],
  folders: [['userId'], ['isSynced']],
  tags: [['name'], ['isSynced']],
  noteTags: [['noteId'], ['tagId'], ['noteId', 'tagId'], ['isSynced']],
  blockLinks: [['sourceBlockId'], ['targetBlockId'], ['sourceBlockId', 'targetBlockId'], ['isSynced']],
  classes: [['userId'], ['order'], ['isSynced']],
  classFields: [['classId'], ['order'], ['isSynced']],
  noteClassBindings: [['noteId'], ['classId'], ['noteId', 'classId'], ['order'], ['isSynced']],
  module_config: [['noteId'], ['moduleId'], ['noteId', 'moduleId'], ['isSynced']],
  module_data: [['noteId'], ['moduleId'], ['noteId', 'moduleId'], ['isSynced']],
  goals: [['status'], ['priority'], ['type'], ['plannedEndAt'], ['createdAt'], ['isSynced']],
  accounts: [['type'], ['subtype'], ['createdAt'], ['isSynced']],
  billCategories: [['type'], ['parentId'], ['order'], ['isSynced']],
  bills: [['noteId'], ['type'], ['date'], ['fromAccountId'], ['toAccountId'], ['categoryId'], ['isSynced']],
  budgets: [['categoryId'], ['period'], ['year'], ['month'], ['createdAt'], ['isSynced']],
  statements: [['accountId'], ['year'], ['month'], ['year', 'month'], ['accountId', 'year', 'month'], ['status'], ['isSynced']]
}

const DB_PREFIX = 'lifeos-'

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

function createCollection(name: string): Collection {
  const pdb = new PouchDB(DB_PREFIX + name)
  // Silence pouchdb-find's internal deprecation warning by overriding db.type()
  ;(pdb as any).type = function () { return (this as any)._adapter || (this as any).adapter }
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

  const runFind = async (opts: FindOpts, limit?: number): Promise<DBDoc[]> => {
    await indexesReady
    const baseSelector = ensureSelectorForSort(opts.selector || {}, opts.sort)
    const selector = nonEmptySelector(baseSelector)
    const result = await pdb.find({
      selector,
      sort: opts.sort,
      ...(limit ? { limit } : {})
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
        const docs = await runFind(idOrOpts, 1)
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

let database: Database | null = null
let initPromise: Promise<Database> | null = null

async function doInitDB(): Promise<Database> {
  const dbs: Database = {}
  for (const name of Object.keys(COLLECTION_INDEXES)) {
    dbs[name] = createCollection(name)
  }
  return dbs
}

export async function initDB(): Promise<Database> {
  if (database) return database
  if (initPromise) return initPromise

  initPromise = doInitDB()

  try {
    database = await initPromise
    return database
  } catch (error) {
    initPromise = null
    throw error
  }
}

export async function getDB(): Promise<Database> {
  if (!database) {
    database = await initDB()
  }
  return database
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function now(): string {
  return new Date().toISOString()
}

export type { Database, Collection, DBDoc, FindOpts, SortSpec }
