import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'
import { v4 as uuidv4 } from 'uuid'
import type { Workspace, WorkspaceFormData } from '~/types/workspace'

PouchDB.plugin(PouchDBFind)

const ACTIVE_ID_KEY = 'lifeos:active-workspace-id'

const metaDBs = new Map<string, PouchDB.Database>()

function getMetaDBName(): string {
  const token = getToken()
  if (!token) return 'lifeos-meta-workspaces-guest'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return `lifeos-meta-workspaces-${payload.userId || 'guest'}`
  } catch {
    return 'lifeos-meta-workspaces-guest'
  }
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

function nowIso(): string {
  return new Date().toISOString()
}

function stripPouchFields<T extends { _id: string; _rev?: string }>(raw: T): Omit<T, '_id' | '_rev'> & { id: string } {
  const { _id, _rev, ...rest } = raw
  return { ...(rest as object), id: _id } as any
}

function isLoggedIn(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem('token')
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function dbPrefix(workspaceId: string): string {
  return `lifeos-${workspaceId}-`
}

async function listLocalWorkspaces(): Promise<Workspace[]> {
  const db = getMetaDB()
  const result = await db.allDocs({ include_docs: true })
  return result.rows
    .map((r) => r.doc)
    .filter((d): d is PouchDB.Core.ExistingDocument<Workspace & { _id: string }> => !!d && !d._id.startsWith('_'))
    .map((d) => stripPouchFields(d) as Workspace)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

async function syncRemoteToLocal(remoteList: any[]): Promise<void> {
  const db = getMetaDB()
  const remoteIds = new Set(remoteList.map((r) => r.localId).filter(Boolean))

  // 删除本地存在但服务端已移除的空间
  const localResult = await db.allDocs({ include_docs: true })
  for (const row of localResult.rows) {
    const doc = row.doc as any
    if (!doc || doc._id.startsWith('_')) continue
    if (!remoteIds.has(doc._id)) {
      await db.remove(doc._id, doc._rev)
    }
  }

  for (const remote of remoteList) {
    const localId = remote.localId
    if (!localId) continue

    const doc: any = {
      _id: localId,
      id: localId,
      name: remote.name,
      remoteUrl: remote.remoteUrl || undefined,
      remoteUsername: remote.remoteUsername || undefined,
      remotePassword: remote.remotePassword || undefined,
      remotePrefix: remote.remotePrefix || 'lifeos-',
      createdAt: remote.createdAt,
      updatedAt: remote.updatedAt,
      remoteId: remote.id,
    }

    try {
      const existing = await db.get(localId)
      doc._rev = existing._rev
    } catch (e: any) {
      if (e?.status !== 404) throw e
    }

    await db.put(doc)
  }
}

export async function listWorkspaces(): Promise<Workspace[]> {
  if (isLoggedIn()) {
    try {
      const token = getToken()
      if (token) {
        const remoteList = await $fetch('/api/workspaces', {
          headers: { Authorization: `Bearer ${token}` }
        }) as any[]
        await syncRemoteToLocal(remoteList)
      }
    } catch (e) {
      console.warn('[workspaces] 从服务端同步失败，使用本地数据', e)
    }
  }

  return await listLocalWorkspaces()
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const db = getMetaDB()
  try {
    const raw = await db.get(id)
    return stripPouchFields(raw as any) as Workspace
  } catch (e: any) {
    if (e?.status === 404) return null
    throw e
  }
}

export async function createWorkspace(input: WorkspaceFormData): Promise<Workspace> {
  const id = uuidv4()
  const ts = nowIso()
  const doc: Workspace = {
    id,
    name: input.name.trim() || '未命名空间',
    remoteUrl: input.remoteUrl?.trim() || undefined,
    remoteUsername: input.remoteUsername?.trim() || undefined,
    remotePassword: input.remotePassword?.length ? input.remotePassword : undefined,
    remotePrefix: input.remotePrefix?.trim() || 'lifeos-',
    createdAt: ts,
    updatedAt: ts,
  }

  const db = getMetaDB()
  await db.put({ ...doc, _id: id })

  if (isLoggedIn()) {
    try {
      const token = getToken()
      if (token) {
        const remote = await $fetch('/api/workspaces', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: doc.name,
            remoteUrl: doc.remoteUrl,
            remotePrefix: doc.remotePrefix,
            remoteUsername: doc.remoteUsername,
            remotePassword: doc.remotePassword,
            localId: id,
          }
        }) as any

        if (remote?.id) {
          doc.remoteId = remote.id
          const existing = await db.get(id)
          await db.put({ ...doc, _id: id, _rev: existing._rev })
        }
      }
    } catch (e) {
      console.warn('[workspaces] 同步到服务端失败', e)
    }
  }

  return doc
}

export async function updateWorkspace(id: string, patch: Partial<WorkspaceFormData>): Promise<Workspace> {
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
  if (typeof patch.remotePassword === 'string') merged.remotePassword = patch.remotePassword.length ? patch.remotePassword : undefined
  if (typeof patch.remotePrefix === 'string') merged.remotePrefix = patch.remotePrefix.trim() || 'lifeos-'

  const res = await db.put(merged)
  const result = stripPouchFields({ ...merged, _rev: res.rev }) as Workspace

  if (isLoggedIn() && result.remoteId) {
    try {
      const token = getToken()
      if (token) {
        await $fetch(`/api/workspaces/${result.remoteId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: result.name,
            remoteUrl: result.remoteUrl,
            remotePrefix: result.remotePrefix,
            remoteUsername: result.remoteUsername,
            remotePassword: result.remotePassword,
          }
        })
      }
    } catch (e) {
      console.warn('[workspaces] 同步更新到服务端失败', e)
    }
  }

  return result
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = getMetaDB()
  let remoteId: string | undefined

  try {
    const existing = await db.get(id)
    remoteId = (existing as any).remoteId
    await db.remove(existing)
  } catch (e: any) {
    if (e?.status !== 404) throw e
  }

  if (isLoggedIn() && remoteId) {
    try {
      const token = getToken()
      if (token) {
        await $fetch(`/api/workspaces/${remoteId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch (e) {
      console.warn('[workspaces] 同步删除到服务端失败', e)
    }
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
