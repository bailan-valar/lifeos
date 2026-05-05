import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'
import { v4 as uuidv4 } from 'uuid'
import type { Workspace, WorkspaceFormData } from '~/types/workspace'

PouchDB.plugin(PouchDBFind)

const META_DB_NAME = 'lifeos-meta-workspaces'
const ACTIVE_ID_KEY = 'lifeos:active-workspace-id'

let metaDB: PouchDB.Database | null = null

function getMetaDB(): PouchDB.Database {
  if (!metaDB) {
    metaDB = new PouchDB(META_DB_NAME)
    ;(metaDB as any).type = function () { return (this as any)._adapter || (this as any).adapter }
  }
  return metaDB
}

function nowIso(): string {
  return new Date().toISOString()
}

function stripPouchFields<T extends { _id: string; _rev?: string }>(raw: T): Omit<T, '_id' | '_rev'> & { id: string } {
  const { _id, _rev, ...rest } = raw
  return { ...(rest as object), id: _id } as any
}

export function dbPrefix(workspaceId: string): string {
  return `lifeos-${workspaceId}-`
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const db = getMetaDB()
  const result = await db.allDocs({ include_docs: true })
  return result.rows
    .map((r) => r.doc)
    .filter((d): d is PouchDB.Core.ExistingDocument<Workspace & { _id: string }> => !!d && !d._id.startsWith('_'))
    .map((d) => stripPouchFields(d) as Workspace)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
  const db = getMetaDB()
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
    updatedAt: ts
  }
  await db.put({ ...doc, _id: id })
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

export async function ensureBootstrapWorkspace(defaults?: {
  remoteUrl?: string
  remoteUsername?: string
  remotePassword?: string
  remotePrefix?: string
}): Promise<Workspace> {
  const list = await listWorkspaces()
  if (list.length === 0) {
    const ws = await createWorkspace({
      name: '默认空间',
      remoteUrl: defaults?.remoteUrl?.trim() || undefined,
      remoteUsername: defaults?.remoteUsername?.trim() || undefined,
      remotePassword: defaults?.remotePassword || undefined,
      remotePrefix: defaults?.remotePrefix?.trim() || undefined
    })
    setActiveId(ws.id)
    return ws
  }
  const activeId = getActiveId()
  const active = activeId ? list.find((w) => w.id === activeId) : null
  if (active) return active
  setActiveId(list[0].id)
  return list[0]
}
