import type { Account, AccountFormData } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'

let dbRef: any = null

async function getDb() {
  if (!dbRef) {
    dbRef = await getDB()
  }
  return dbRef
}

function clampDay(d: number | undefined): number | undefined {
  if (typeof d !== 'number' || isNaN(d)) return undefined
  return Math.max(1, Math.min(28, Math.floor(d)))
}

function withDefaultSubtype(raw: Account): Account {
  if (raw.type === 'personal' && !raw.subtype) {
    return { ...raw, subtype: 'cash' }
  }
  return raw
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
      accounts.value = result.map((doc: any) => withDefaultSubtype(doc.toJSON()))
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load accounts:', e)
    } finally {
      loading.value = false
    }
  }

  async function createAccount(data: AccountFormData): Promise<Account> {
    const db = await getDb()
    const isPersonal = data.type === 'personal'
    const isCredit = isPersonal && data.subtype === 'credit_card'
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
      isSynced: false,
      ...(isPersonal ? { subtype: data.subtype || 'cash' } : {}),
      ...(isCredit ? {
        creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : 0,
        billingDay: clampDay(data.billingDay) ?? 1,
        repaymentDay: clampDay(data.repaymentDay) ?? 1
      } : {})
    }
    await db.accounts.insert({ ...account })
    accounts.value.push(account)
    return account
  }

  async function updateAccount(id: string, data: Partial<AccountFormData>) {
    const db = await getDb()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    const patch: Record<string, any> = { ...data, updatedAt: now() }
    if (typeof patch.billingDay === 'number') patch.billingDay = clampDay(patch.billingDay)
    if (typeof patch.repaymentDay === 'number') patch.repaymentDay = clampDay(patch.repaymentDay)
    await doc.patch(patch)
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      accounts.value[idx] = { ...accounts.value[idx], ...patch }
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

  const cashAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'personal' && (a.subtype || 'cash') === 'cash')
  )

  const debitAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'personal' && a.subtype === 'debit_card')
  )

  const creditAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'personal' && a.subtype === 'credit_card')
  )

  const onlineAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'personal' && a.subtype === 'online_account')
  )

  return {
    accounts,
    personalAccounts,
    otherAccounts,
    cashAccounts,
    debitAccounts,
    creditAccounts,
    onlineAccounts,
    loading,
    error,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    updateBalance
  }
}
