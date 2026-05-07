import PouchDB from 'pouchdb-browser'
import type { Workspace, WorkspaceSyncState, WorkspaceSyncStatus } from '~/types/workspace'
import { emptySyncStatus } from '~/types/workspace'
import { getRawPouchDB, initDB, COLLECTION_NAMES } from '~/services/db'
import { getWorkspace } from '~/services/workspaces'
import { useRuntimeConfig } from '#imports'
import { useAuthStore } from '~/stores/auth'

interface SyncBundle {
  workspaceId: string
  handles: Map<string, PouchDB.Replication.Sync<{}>>
  status: WorkspaceSyncStatus
  listeners: Set<(s: WorkspaceSyncStatus) => void>
  collectionStates: Map<string, WorkspaceSyncState>
  lastErrorByCollection: Map<string, string>
}

const bundles = new Map<string, SyncBundle>()

function ensureBundle(workspaceId: string): SyncBundle {
  let bundle = bundles.get(workspaceId)
  if (!bundle) {
    bundle = {
      workspaceId,
      handles: new Map(),
      status: emptySyncStatus(workspaceId),
      listeners: new Set(),
      collectionStates: new Map(),
      lastErrorByCollection: new Map()
    }
    bundles.set(workspaceId, bundle)
  }
  return bundle
}

function aggregateState(bundle: SyncBundle): WorkspaceSyncState {
  const states = Array.from(bundle.collectionStates.values())
  if (states.length === 0) return 'disabled'
  if (states.includes('error')) return 'error'
  if (states.includes('active')) return 'active'
  if (states.every((s) => s === 'paused' || s === 'idle')) {
    return states.every((s) => s === 'idle') ? 'idle' : 'paused'
  }
  return 'idle'
}

function notify(bundle: SyncBundle) {
  bundle.status = {
    ...bundle.status,
    state: aggregateState(bundle)
  }
  for (const fn of bundle.listeners) {
    try {
      fn(bundle.status)
    } catch (e) {
      console.warn('[sync] listener failed', e)
    }
  }
}

function setCollectionState(bundle: SyncBundle, collection: string, state: WorkspaceSyncState, opts: { error?: string } = {}) {
  bundle.collectionStates.set(collection, state)
  if (state === 'error' && opts.error) {
    bundle.lastErrorByCollection.set(collection, opts.error)
    bundle.status = {
      ...bundle.status,
      lastError: opts.error,
      lastChangeAt: new Date().toISOString()
    }
  } else if (state !== 'error') {
    bundle.lastErrorByCollection.delete(collection)
    if (bundle.lastErrorByCollection.size === 0) {
      bundle.status = { ...bundle.status, lastError: undefined }
    }
  }
  notify(bundle)
}

function buildRemoteUrl(base: string, dbName: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return `${trimmed}/${encodeURIComponent(dbName)}`
}

function attachHandlers(bundle: SyncBundle, collection: string, handle: PouchDB.Replication.Sync<{}>) {
  setCollectionState(bundle, collection, 'idle')

  handle.on('active', () => {
    setCollectionState(bundle, collection, 'active')
  })

  handle.on('paused', (err) => {
    if (err) {
      const message = (err as any)?.message || String(err)
      setCollectionState(bundle, collection, 'error', { error: `${collection}: ${message}` })
    } else {
      setCollectionState(bundle, collection, 'idle')
    }
  })

  handle.on('change', (info: any) => {
    const direction = info?.direction
    const docs = info?.change?.docs?.length || 0
    if (docs > 0) {
      bundle.status = {
        ...bundle.status,
        lastChangeAt: new Date().toISOString(),
        pendingPush: direction === 'push' ? bundle.status.pendingPush + docs : bundle.status.pendingPush,
        pendingPull: direction === 'pull' ? bundle.status.pendingPull + docs : bundle.status.pendingPull
      }
      notify(bundle)
    }
  })

  handle.on('denied', (err: any) => {
    const message = err?.message || String(err)
    setCollectionState(bundle, collection, 'error', { error: `${collection} 权限拒绝: ${message}` })
  })

  handle.on('error', (err: any) => {
    const message = err?.message || String(err)
    setCollectionState(bundle, collection, 'error', { error: `${collection}: ${message}` })
  })
}

export async function startSync(workspaceId: string, override?: { remoteUrl?: string; remotePrefix?: string; remoteUsername?: string; remotePassword?: string }): Promise<void> {
  await stopSync(workspaceId)

  const config = useRuntimeConfig()
  const defaultUrl = (config.public.couchdbUrl as string | undefined) || ''
  const defaultPrefix = (config.public.couchdbPrefix as string | undefined) || 'lifeos-'
  const defaultUsername = (config.public.couchdbUsername as string | undefined) || undefined
  const defaultPassword = (config.public.couchdbPassword as string | undefined) || undefined

  const ws: Workspace | null = await getWorkspace(workspaceId)
  if (!ws) return

  const authStore = useAuthStore()
  const isLoggedIn = !!authStore.token

  const remoteUrl = (
    override?.remoteUrl ?? ws.remoteUrl ?? (isLoggedIn ? defaultUrl : '')
  ).trim()
  const remotePrefix = (override?.remotePrefix ?? ws.remotePrefix ?? defaultPrefix).trim()
  const username = override?.remoteUsername ?? ws.remoteUsername ?? defaultUsername
  const password = override?.remotePassword ?? ws.remotePassword ?? defaultPassword

  const bundle = ensureBundle(workspaceId)
  bundle.status = { ...emptySyncStatus(workspaceId) }
  bundle.collectionStates.clear()
  bundle.lastErrorByCollection.clear()

  if (!remoteUrl) {
    bundle.status = { ...bundle.status, state: 'disabled' }
    notify(bundle)
    return
  }

  await initDB(workspaceId)

  const remoteOpts: any = { skip_setup: false }
  if (username && password) {
    remoteOpts.auth = { username, password }
  }

  for (const collection of COLLECTION_NAMES) {
    const localPdb = await getRawPouchDB(workspaceId, collection)
    if (!localPdb) continue
    const remoteDbName = `${remotePrefix}${collection}`.toLowerCase()
    const remoteFullUrl = buildRemoteUrl(remoteUrl, remoteDbName)
    try {
      const remotePdb = new PouchDB(remoteFullUrl, remoteOpts)
      const handle = (localPdb as any).sync(remotePdb, {
        live: true,
        retry: true,
        batch_size: 500,
        batches_limit: 5
      }) as PouchDB.Replication.Sync<{}>
      bundle.handles.set(collection, handle)
      attachHandlers(bundle, collection, handle)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setCollectionState(bundle, collection, 'error', { error: `${collection}: ${message}` })
    }
  }

  notify(bundle)
}

export async function stopSync(workspaceId: string): Promise<void> {
  const bundle = bundles.get(workspaceId)
  if (!bundle) return
  const cancelations: Promise<unknown>[] = []
  for (const [, handle] of bundle.handles) {
    try {
      handle.cancel()
      cancelations.push(
        new Promise<void>((resolve) => {
          let settled = false
          const finish = () => {
            if (!settled) {
              settled = true
              resolve()
            }
          }
          handle.on('complete', finish)
          handle.on('error', finish)
          setTimeout(finish, 1000)
        })
      )
    } catch (e) {
      console.warn('[sync] cancel failed', workspaceId, e)
    }
  }
  await Promise.all(cancelations)
  bundle.handles.clear()
  bundle.collectionStates.clear()
  bundle.lastErrorByCollection.clear()
  bundle.status = { ...emptySyncStatus(workspaceId), state: 'disabled' }
  notify(bundle)
}

export function subscribeStatus(workspaceId: string, fn: (s: WorkspaceSyncStatus) => void): () => void {
  const bundle = ensureBundle(workspaceId)
  bundle.listeners.add(fn)
  fn(bundle.status)
  return () => {
    bundle.listeners.delete(fn)
  }
}

export function getStatus(workspaceId: string): WorkspaceSyncStatus {
  const bundle = bundles.get(workspaceId)
  return bundle ? { ...bundle.status } : emptySyncStatus(workspaceId)
}

export async function testRemote(
  remoteUrl: string,
  opts?: { username?: string; password?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!remoteUrl.trim()) return { ok: false, error: '请输入 CouchDB 地址' }
  const base = remoteUrl.replace(/\/+$/, '')
  const auth = opts?.username && opts?.password
    ? { username: opts.username, password: opts.password }
    : undefined
  try {
    const probe = new PouchDB(`${base}/_users`, auth
      ? ({ auth, skip_setup: true } as any)
      : ({ skip_setup: true } as any))
    await probe.info()
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}
