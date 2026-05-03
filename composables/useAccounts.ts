import type { Account, AccountFormData } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

export function useAccounts() {
  const accounts = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAccounts() {
    loading.value = true
    error.value = null
    try {
      const db = await getDb()
      const result = await db.accounts.find({
        sort: [{ createdAt: 'asc' }]
      }).exec()
      accounts.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load accounts:', e)
    } finally {
      loading.value = false
    }
  }

  async function createAccount(data: AccountFormData): Promise<Account> {
    const db = await getDb()
    const account: Account = {
      id: generateId(),
      name: data.name,
      type: data.type,
      balance: 0,
      currency: data.currency,
      icon: data.icon || '',
      color: data.color || '',
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.accounts.insert({ ...account })
    accounts.value.push(account)
    return account
  }

  async function updateAccount(id: string, data: Partial<AccountFormData>) {
    const db = await getDb()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    await doc.patch({ ...data, updatedAt: now() })
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      accounts.value[idx] = { ...accounts.value[idx], ...data, updatedAt: now() }
    }
  }

  async function deleteAccount(id: string) {
    const db = await getDb()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    accounts.value = accounts.value.filter(a => a.id !== id)
  }

  async function updateBalance(id: string, delta: number) {
    const db = await getDb()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    const newBalance = (doc.get('balance') as number) + delta
    await doc.patch({ balance: newBalance, updatedAt: now() })
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      accounts.value[idx].balance = newBalance
      accounts.value[idx].updatedAt = now()
    }
  }

  const personalAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'personal')
  )

  const otherAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'other')
  )

  return {
    accounts,
    personalAccounts,
    otherAccounts,
    loading,
    error,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    updateBalance
  }
}
