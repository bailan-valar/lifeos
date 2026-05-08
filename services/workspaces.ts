import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'
import { v4 as uuidv4 } from 'uuid'
import type { Workspace, WorkspaceFormData } from '~/types/workspace'
import { encryptCredential, decryptCredential } from '~/services/crypto'
import { useRuntimeConfig } from '#imports'

PouchDB.plugin(PouchDBFind)

const ACTIVE_ID_KEY = 'lifeos:active-workspace-id'
const USER_ID_KEY = 'lifeos:user-id'

const metaDBs = new Map<string, PouchDB.Database>()
let metaSyncHandle: PouchDB.Replication.Sync<{}> | null = null
let metaSyncStarting = false
let lastSyncedUserId: string | null = null
const metaChangeListeners = new Set<() => void>()

export function setCachedUserId(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_ID_KEY, userId)
}

export function clearCachedUserId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_ID_KEY)
}

export function getCachedUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

async function ensureEncryptedPassword(userId: string | null, password: string | undefined): Promise<string | undefined> {
  if (!password || !userId) return password
  try {
    await decryptCredential(userId, password)
    return password // 已经是密文，直接返回
  } catch {
    try {
      return await encryptCredential(userId, password)
    } catch {
      return password // 加密失败时保留明文
    }
  }
}

async function decryptWorkspacePassword(ws: Workspace): Promise<void> {
  const userId = getCachedUserId()
  if (!userId || !ws.remotePassword) return
  try {
    ws.remotePassword = await decryptCredential(userId, ws.remotePassword)
  } catch {
    // 解密失败时保留原值（可能是明文旧格式）
  }
}

function getMetaDBName(): string {
  const userId = getCachedUserId()
  return `lifeos-meta-workspaces-${userId || 'guest'}`
}

function getMetaDB(): PouchDB.Database {
  const name = getMetaDBName()
  let db = metaDBs.get(name)
  if (!db) {
    db = new PouchDB(name)
    ;(db as any).type = function () { return (this as any)._adapter || (this as any).adapter }
    metaDBs.set(name, db)
  }
  return db
}

export function clearMetaDBCache(): void {
  metaDBs.clear()
}

export async function closeMetaDB(): Promise<void> {
  for (const [name, db] of metaDBs.entries()) {
    try {
      await db.close()
    } catch (e) {
      console.warn('[workspaces] close meta DB failed', name, e)
    }
  }
  metaDBs.clear()
}

function nowIso(): string {
  return new Date().toISOString()
}

function stripPouchFields<T extends { _id: string; _rev?: string }>(raw: T): Omit<T, '_id' | '_rev'> & { id: string } {
  const { _id, _rev, ...rest } = raw
  return { ...(rest as object), id: _id } as any
}

function buildRemoteUrl(base: string, dbName: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return `${trimmed}/${encodeURIComponent(dbName)}`
}

function notifyMetaChange() {
  for (const fn of metaChangeListeners) {
    try {
      fn()
    } catch (e) {
      console.warn('[workspaces] meta change listener failed', e)
    }
  }
}

/**
 * 启动空间列表的 CouchDB 实时同步。
 * 每个用户在 CouchDB 上拥有独立的数据库：{prefix}meta-{userId}
 */
export async function startMetaSync(): Promise<void> {
  const userId = getCachedUserId()
  if (!userId) {
    console.log('[workspaces] meta sync skipped: no userId (guest mode)')
    return
  }

  // 避免重复启动：同一 userId 且正在运行中则跳过
  if (metaSyncHandle && lastSyncedUserId === userId) {
    return
  }

  // 防止并发启动导致多个 sync handle
  if (metaSyncStarting) {
    return
  }
  metaSyncStarting = true

  try {
    // 如果已有同步在运行（比如 userId 变了），先停止
    stopMetaSync()

    const config = useRuntimeConfig()
    const remoteUrl = (config.public.couchdbUrl as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_URL as string | undefined) || ''
    const remotePrefix = (config.public.couchdbPrefix as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_PREFIX as string | undefined) || 'lifeos-'
    const username = (config.public.couchdbUsername as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_USERNAME as string | undefined)
    const password = (config.public.couchdbPassword as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_PASSWORD as string | undefined)

    console.log('[workspaces] meta sync config:', { remoteUrl: remoteUrl || '(empty)', remotePrefix, username: username || '(empty)', password: password ? `[${password.length} chars]` : '(empty)' })

    if (!remoteUrl) {
      console.log('[workspaces] meta sync disabled: no couchdbUrl configured')
      return
    }

    const remoteDbName = `${remotePrefix}meta-${userId}`.toLowerCase()
    const remoteFullUrl = buildRemoteUrl(remoteUrl, remoteDbName)

    const localDB = getMetaDB()

    const remoteOpts: any = { skip_setup: false }
    if (username && password) {
      remoteOpts.auth = { username, password }
    }

    console.log('[workspaces] meta sync remoteOpts:', JSON.stringify({ ...remoteOpts, auth: remoteOpts.auth ? { username: remoteOpts.auth.username, passwordSet: !!remoteOpts.auth.password } : undefined }))
    console.log('[workspaces] starting meta sync to', remoteFullUrl)
    const remoteDB = new PouchDB(remoteFullUrl, remoteOpts)
    try {
      const info = await remoteDB.info()
      console.log('[workspaces] meta remoteDB.info() success:', info)
    } catch (infoErr: any) {
      console.warn('[workspaces] meta remoteDB.info() failed:', infoErr?.status, infoErr?.message || infoErr)
    }

    metaSyncHandle = localDB.sync(remoteDB, {
      live: true,
      retry: true,
      batch_size: 100,
      batches_limit: 2
    })

    lastSyncedUserId = userId

    metaSyncHandle.on('change', () => {
      notifyMetaChange()
    })

    metaSyncHandle.on('error', (err) => {
      console.warn('[workspaces] meta sync error:', err)
    })

    metaSyncHandle.on('paused', (err) => {
      if (err) {
        console.warn('[workspaces] meta sync paused with error:', err)
      } else {
        console.log('[workspaces] meta sync paused (idle)')
      }
    })
  } catch (e) {
    console.error('[workspaces] failed to start meta sync:', e)
  } finally {
    metaSyncStarting = false
  }
}

export function stopMetaSync(): void {
  if (metaSyncHandle) {
    try {
      metaSyncHandle.cancel()
    } catch (e) {
      console.warn('[workspaces] stop meta sync failed', e)
    }
    metaSyncHandle = null
  }
  lastSyncedUserId = null
}

export function onMetaChange(fn: () => void): () => void {
  metaChangeListeners.add(fn)
  return () => {
    metaChangeListeners.delete(fn)
  }
}

export function dbName(workspaceId: string): string {
  const userId = getCachedUserId()
  if (userId) {
    return `lifeos-${userId}-${workspaceId}`
  }
  return `lifeos-${workspaceId}`
}

async function listLocalWorkspaces(): Promise<Workspace[]> {
  const db = getMetaDB()
  const userId = getCachedUserId()
  const result = await db.allDocs({ include_docs: true })
  const workspaces = result.rows
    .map((r) => r.doc)
    .filter((d): d is PouchDB.Core.ExistingDocument<Workspace & { _id: string }> => !!d && !d._id.startsWith('_'))
    .map((d) => stripPouchFields(d) as Workspace)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  // 解密 CouchDB 凭据
  if (userId) {
    for (const ws of workspaces) {
      if (ws.remotePassword) {
        try {
          ws.remotePassword = await decryptCredential(userId, ws.remotePassword)
        } catch {
          // 如果解密失败，说明数据是明文旧格式，保留原值
        }
      }
    }
  }
  return workspaces
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return await listLocalWorkspaces()
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const db = getMetaDB()
  try {
    const raw = await db.get(id)
    const ws = stripPouchFields(raw as any) as Workspace
    await decryptWorkspacePassword(ws)
    return ws
  } catch (e: any) {
    if (e?.status === 404) return null
    throw e
  }
}

export async function createWorkspace(input: WorkspaceFormData): Promise<Workspace> {
  const id = uuidv4()
  const userId = getCachedUserId()
  const ts = nowIso()
  const encryptedPassword = await ensureEncryptedPassword(userId, input.remotePassword)
  const doc: Workspace = {
    id,
    name: input.name.trim() || '未命名空间',
    remoteUrl: input.remoteUrl?.trim() || undefined,
    remoteUsername: input.remoteUsername?.trim() || undefined,
    remotePassword: encryptedPassword,
    remotePrefix: input.remotePrefix?.trim() || 'lifeos-',
    createdAt: ts,
    updatedAt: ts,
  }

  const db = getMetaDB()
  await db.put({ ...doc, _id: id })
  return doc
}

export async function updateWorkspace(id: string, patch: Partial<WorkspaceFormData>): Promise<Workspace> {
  const userId = getCachedUserId()
  const db = getMetaDB()
  const existing = await db.get(id)
  const merged: any = {
    ...existing,
    ...patch,
    updatedAt: nowIso()
  }
  if (typeof patch.name === 'string') merged.name = patch.name.trim() || (existing as any).name
  if (typeof patch.remoteUrl === 'string') merged.remoteUrl = patch.remoteUrl.trim() || undefined
  if (typeof patch.remoteUsername === 'string') merged.remoteUsername = patch.remoteUsername.trim() || undefined
  if (typeof patch.remotePassword === 'string') {
    merged.remotePassword = await ensureEncryptedPassword(userId, patch.remotePassword)
  }
  if (typeof patch.remotePrefix === 'string') merged.remotePrefix = patch.remotePrefix.trim() || 'lifeos-'

  const res = await db.put(merged)
  return stripPouchFields({ ...merged, _rev: res.rev }) as Workspace
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = getMetaDB()
  try {
    const existing = await db.get(id)
    await db.remove(existing)
  } catch (e: any) {
    if (e?.status !== 404) throw e
  }
}

export function getActiveId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_ID_KEY)
}

export function setActiveId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_ID_KEY, id)
}

export function clearActiveId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_ID_KEY)
}

export async function ensureBootstrapWorkspace(): Promise<Workspace | null> {
  const list = await listWorkspaces()
  if (list.length === 0) {
    return null
  }
  const activeId = getActiveId()
  const active = activeId ? list.find((w) => w.id === activeId) : null
  if (active) return active
  setActiveId(list[0].id)
  return list[0]
}
