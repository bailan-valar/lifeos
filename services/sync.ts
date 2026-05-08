import PouchDB from 'pouchdb-browser'
import type { Workspace, WorkspaceSyncStatus } from '~/types/workspace'
import { emptySyncStatus } from '~/types/workspace'
import { getRawPouchDB } from '~/services/db'
import { getWorkspace, getCachedUserId } from '~/services/workspaces'
import { useRuntimeConfig } from '#imports'
import { useAuthStore } from '~/stores/auth'

interface SyncBundle {
  workspaceId: string
  handle: PouchDB.Replication.Sync<{}> | null
  status: WorkspaceSyncStatus
  listeners: Set<(s: WorkspaceSyncStatus) => void>
}

const bundles = new Map<string, SyncBundle>()

function ensureBundle(workspaceId: string): SyncBundle {
  let bundle = bundles.get(workspaceId)
  if (!bundle) {
    bundle = {
      workspaceId,
      handle: null,
      status: emptySyncStatus(workspaceId),
      listeners: new Set()
    }
    bundles.set(workspaceId, bundle)
  }
  return bundle
}

function notify(bundle: SyncBundle) {
  for (const fn of bundle.listeners) {
    try {
      fn(bundle.status)
    } catch (e) {
      console.warn('[sync] listener failed', e)
    }
  }
}

function buildRemoteUrl(base: string, dbName: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return `${trimmed}/${encodeURIComponent(dbName)}`
}

export async function startSync(workspaceId: string, override?: { remoteUrl?: string; remotePrefix?: string; remoteUsername?: string; remotePassword?: string }): Promise<void> {
  console.log('[sync] startSync called for workspace:', workspaceId)
  await stopSync(workspaceId)

  const config = useRuntimeConfig()
  const defaultUrl = (config.public.couchdbUrl as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_URL as string | undefined) || ''
  const defaultPrefix = (config.public.couchdbPrefix as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_PREFIX as string | undefined) || 'lifeos-'
  const defaultUsername = (config.public.couchdbUsername as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_USERNAME as string | undefined) || undefined
  const defaultPassword = (config.public.couchdbPassword as string | undefined) || (import.meta.env.NUXT_PUBLIC_COUCHDB_PASSWORD as string | undefined) || undefined

  console.log('[sync] runtimeConfig defaultUrl:', defaultUrl || '(empty)')
  console.log('[sync] runtimeConfig defaultPrefix:', defaultPrefix)
  console.log('[sync] runtimeConfig defaultUsername:', defaultUsername || '(empty)')
  console.log('[sync] runtimeConfig defaultPassword:', defaultPassword ? `[${defaultPassword.length} chars]` : '(empty)')

  const ws: Workspace | null = await getWorkspace(workspaceId)
  if (!ws) {
    console.warn('[sync] getWorkspace returned null, aborting')
    return
  }

  const authStore = useAuthStore()
  const isLoggedIn = !!authStore.token

  console.log('[sync] isLoggedIn:', isLoggedIn)
  console.log('[sync] ws.remoteUrl:', ws.remoteUrl || '(undefined/empty)')
  console.log('[sync] ws.remotePrefix:', ws.remotePrefix || '(undefined)')
  console.log('[sync] ws.remoteUsername:', ws.remoteUsername || '(undefined)')

  const remoteUrl = (
    override?.remoteUrl ?? ws.remoteUrl ?? (isLoggedIn ? defaultUrl : '')
  ).trim()
  const remotePrefix = (override?.remotePrefix ?? ws.remotePrefix ?? defaultPrefix).trim()
  const username = override?.remoteUsername ?? ws.remoteUsername ?? defaultUsername
  // 密码回退逻辑：优先用 override，其次用 workspace 配置（需非空），最后用默认配置
  const password = override?.remotePassword ??
    ((ws.remotePassword && ws.remotePassword.trim() ? ws.remotePassword : undefined) ??
      defaultPassword)

  console.log('[sync] resolved remoteUrl:', remoteUrl || '(empty)')
  console.log('[sync] resolved remotePrefix:', remotePrefix)
  console.log('[sync] resolved username:', username || '(empty)')
  console.log('[sync] resolved password:', password ? `[${password.length} chars, startsWith=${password.slice(0, 2)}]` : '(empty)')

  const bundle = ensureBundle(workspaceId)
  bundle.status = { ...emptySyncStatus(workspaceId) }

  if (!remoteUrl) {
    console.warn('[sync] remoteUrl is empty -> state: disabled')
    console.warn('[sync] reason: no override, no ws.remoteUrl, and (not logged in or no defaultUrl)')
    bundle.status = { ...bundle.status, state: 'disabled' }
    notify(bundle)
    return
  }

  const localPdb = await getRawPouchDB(workspaceId)
  if (!localPdb) return

  // 远端数据库名：<remotePrefix>{userId}-<workspaceId>（登录用户）或 <remotePrefix><workspaceId>（Guest）
  const userId = getCachedUserId()
  const remoteDbName = userId
    ? `${remotePrefix}${userId}-${workspaceId}`.toLowerCase()
    : `${remotePrefix}${workspaceId}`.toLowerCase()
  const remoteFullUrl = buildRemoteUrl(remoteUrl, remoteDbName)

  const remoteOpts: any = { skip_setup: false }
  if (username && password) {
    remoteOpts.auth = { username, password }
  }

  console.log('[sync] remoteOpts:', JSON.stringify({ ...remoteOpts, auth: remoteOpts.auth ? { username: remoteOpts.auth.username, passwordSet: !!remoteOpts.auth.password } : undefined }))

  try {
    console.log('[sync] creating remote PouchDB:', remoteFullUrl)
    const remotePdb = new PouchDB(remoteFullUrl, remoteOpts)
    console.log('[sync] probing remotePdb.info()...')
    try {
      const info = await remotePdb.info()
      console.log('[sync] remotePdb.info() success:', info)
    } catch (infoErr: any) {
      console.warn('[sync] remotePdb.info() failed:', infoErr?.status, infoErr?.message || infoErr)
    }
    console.log('[sync] starting sync live=true retry=true')
    const handle = (localPdb as any).sync(remotePdb, {
      live: true,
      retry: true,
      batch_size: 500,
      batches_limit: 5
    }) as PouchDB.Replication.Sync<{}>
    bundle.handle = handle

    console.log('[sync] sync started successfully, state: idle')
    bundle.status = { ...bundle.status, state: 'idle' }
    notify(bundle)

    handle.on('active', () => {
      console.log('[sync] event: active')
      bundle.status = { ...bundle.status, state: 'active' }
      notify(bundle)
    })

    handle.on('paused', (err) => {
      if (err) {
        const message = (err as any)?.message || String(err)
        console.warn('[sync] event: paused with error:', message)
        bundle.status = {
          ...bundle.status,
          state: 'error',
          lastError: message,
          lastChangeAt: new Date().toISOString()
        }
      } else {
        console.log('[sync] event: paused (idle)')
        bundle.status = { ...bundle.status, state: 'paused' }
      }
      notify(bundle)
    })

    handle.on('change', (info: any) => {
      const direction = info?.direction
      const docs = info?.change?.docs?.length || 0
      if (docs > 0) {
        bundle.status = {
          ...bundle.status,
          lastChangeAt: new Date().toISOString(),
          pendingPush: direction === 'push' ? (bundle.status.pendingPush || 0) + docs : (bundle.status.pendingPush || 0),
          pendingPull: direction === 'pull' ? (bundle.status.pendingPull || 0) + docs : (bundle.status.pendingPull || 0)
        }
        notify(bundle)
      }
    })

    // 当同步进入 paused（空闲）状态时，重置待处理计数器
    handle.on('paused', () => {
      if (bundle.status.state !== 'error') {
        bundle.status = {
          ...bundle.status,
          pendingPush: 0,
          pendingPull: 0
        }
        notify(bundle)
      }
    })

    handle.on('denied', (err: any) => {
      const message = err?.message || String(err)
      console.warn('[sync] event: denied:', message)
      bundle.status = {
        ...bundle.status,
        state: 'error',
        lastError: `权限拒绝: ${message}`,
        lastChangeAt: new Date().toISOString()
      }
      notify(bundle)
    })

    handle.on('error', (err: any) => {
      const message = err?.message || String(err)
      console.warn('[sync] event: error:', message)
      bundle.status = {
        ...bundle.status,
        state: 'error',
        lastError: message,
        lastChangeAt: new Date().toISOString()
      }
      notify(bundle)
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[sync] startSync exception:', message)
    bundle.status = {
      ...bundle.status,
      state: 'error',
      lastError: message,
      lastChangeAt: new Date().toISOString()
    }
    notify(bundle)
  }
}

export async function stopSync(workspaceId: string): Promise<void> {
  const bundle = bundles.get(workspaceId)
  if (!bundle) return
  if (bundle.handle) {
    try {
      bundle.handle.cancel()
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (!settled) {
            settled = true
            resolve()
          }
        }
        bundle.handle!.on('complete', finish)
        bundle.handle!.on('error', finish)
        setTimeout(finish, 1000)
      })
    } catch (e) {
      console.warn('[sync] cancel failed', workspaceId, e)
    }
    bundle.handle = null
  }
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
