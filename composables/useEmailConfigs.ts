import type { EmailConfig, EmailConfigFormData } from '~/types/email'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { encryptCredential, decryptCredential } from '~/services/crypto'
import { getActiveId } from '~/services/workspaces'

let _store: EmailConfigsStore | null = null
let _unsub: (() => void) | null = null

function startWatchingEmailConfigs() {
  if (_unsub) return
  _unsub = onCollectionChange('emailConfigs', () => {
    if (_store) _store.loadEmailConfigs()
  })
}

function stopWatchingEmailConfigs() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingEmailConfigs()
    startWatchingEmailConfigs()
    if (_store) _store.loadEmailConfigs()
  })
}

interface EmailConfigsStore {
  configs: Ref<EmailConfig[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadEmailConfigs: () => Promise<void>
  saveConfig: (data: EmailConfigFormData, id?: string) => Promise<EmailConfig>
  deleteConfig: (id: string) => Promise<void>
  getDecryptedPassword: (config: EmailConfig) => Promise<string>
}

function createStore(): EmailConfigsStore {
  const configs = ref<EmailConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadEmailConfigs() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const result = await db.emailConfigs.find({
        sort: [{ createdAt: 'desc' }]
      }).exec()
      configs.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load email configs:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(data: EmailConfigFormData, id?: string): Promise<EmailConfig> {
    const db = await getDB()
    const workspaceId = getActiveId()
    if (!workspaceId) {
      throw new Error('No active workspace')
    }

    const encryptedPassword = await encryptCredential(workspaceId, data.password)

    if (id) {
      const doc = await db.emailConfigs.findOne(id).exec()
      if (!doc) {
        throw new Error('Email config not found')
      }
      const patch: Partial<EmailConfig> = {
        name: data.name,
        provider: data.provider,
        host: data.host,
        port: data.port,
        username: data.username,
        encryptedPassword,
        tls: data.tls,
        updatedAt: now()
      }
      await doc.patch(patch)
      const idx = configs.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        configs.value[idx] = { ...configs.value[idx], ...patch }
      }
      return { ...configs.value[idx]!, ...patch } as EmailConfig
    } else {
      const config: EmailConfig = {
        id: generateId(),
        name: data.name,
        provider: data.provider,
        host: data.host,
        port: data.port,
        username: data.username,
        encryptedPassword,
        tls: data.tls,
        createdAt: now(),
        updatedAt: now()
      }
      await db.emailConfigs.insert({ ...config })
      configs.value.unshift(config)
      return config
    }
  }

  async function deleteConfig(id: string) {
    const db = await getDB()
    const doc = await db.emailConfigs.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    configs.value = configs.value.filter(c => c.id !== id)
  }

  async function getDecryptedPassword(config: EmailConfig): Promise<string> {
    const workspaceId = getActiveId()
    if (!workspaceId) {
      throw new Error('No active workspace')
    }
    return decryptCredential(workspaceId, config.encryptedPassword)
  }

  return {
    configs,
    loading,
    error,
    loadEmailConfigs,
    saveConfig,
    deleteConfig,
    getDecryptedPassword
  }
}

export function useEmailConfigs(): EmailConfigsStore {
  if (!_store) {
    _store = createStore()
  }
  startWatchingEmailConfigs()
  return _store
}
