import type { Account, AccountFormData } from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { add } from '~/utils/decimal'

let _store: AccountsStore | null = null
let _unsub: (() => void) | null = null

function startWatchingAccounts() {
  if (_unsub) return
  _unsub = onCollectionChange('accounts', () => {
    if (_store) _store.loadAccounts()
  })
}

function stopWatchingAccounts() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingAccounts()
    startWatchingAccounts()
    if (_store) _store.loadAccounts()
  })
}

function clampDay(d: number | undefined): number | undefined {
  if (typeof d !== 'number' || isNaN(d)) return undefined
  return Math.max(1, Math.min(28, Math.floor(d)))
}

function sanitizeAliases(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(v => v.length > 0)
}

function withDefaultSubtype(raw: Account): Account {
  if (raw.type === 'personal' && !raw.subtype) {
    return { ...raw, subtype: 'cash' }
  }
  return raw
}

interface AccountsStore {
  accounts: Ref<Account[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadAccounts: () => Promise<void>
  createAccount: (data: AccountFormData) => Promise<Account>
  updateAccount: (id: string, data: Partial<AccountFormData>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  updateBalance: (id: string, delta: number) => Promise<void>
  personalAccounts: ComputedRef<Account[]>
  merchantAccounts: ComputedRef<Account[]>
  contactAccounts: ComputedRef<Account[]>
  otherAccounts: ComputedRef<Account[]>
  externalAccounts: ComputedRef<Account[]>
  cashAccounts: ComputedRef<Account[]>
  debitAccounts: ComputedRef<Account[]>
  creditAccounts: ComputedRef<Account[]>
  onlineAccounts: ComputedRef<Account[]>
}

function createStore(): AccountsStore {
  const accounts = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAccounts() {
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
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
    const db = await getDB()
    const isPersonal = data.type === 'personal'
    const isCredit = isPersonal && data.subtype === 'credit_card'
    const aliases = sanitizeAliases(data.aliases)
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
      ...(isPersonal ? { subtype: data.subtype || 'cash' } : {}),
      ...(isCredit ? {
        creditLimit: typeof data.creditLimit === 'number' ? data.creditLimit : 0,
        billingDay: clampDay(data.billingDay) ?? 1,
        repaymentDay: clampDay(data.repaymentDay) ?? 1
      } : {}),
      ...(aliases.length ? { aliases } : {})
    }
    await db.accounts.insert({ ...account })
    accounts.value.push(account)
    return account
  }

  async function updateAccount(id: string, data: Partial<AccountFormData>) {
    const db = await getDB()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    const patch: Record<string, any> = { ...data, updatedAt: now() }
    if (typeof patch.billingDay === 'number') patch.billingDay = clampDay(patch.billingDay)
    if (typeof patch.repaymentDay === 'number') patch.repaymentDay = clampDay(patch.repaymentDay)
    if ('aliases' in patch) {
      patch.aliases = sanitizeAliases(patch.aliases)
    }
    await doc.patch(patch)
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      accounts.value[idx] = { ...accounts.value[idx], ...patch }
    }
  }

  async function deleteAccount(id: string) {
    const db = await getDB()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    accounts.value = accounts.value.filter(a => a.id !== id)
  }

  async function updateBalance(id: string, delta: number) {
    const db = await getDB()
    const doc = await db.accounts.findOne(id).exec()
    if (!doc) return
    const newBalance = add(doc.get('balance') as number, delta)
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

  const merchantAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'merchant')
  )

  const contactAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'contact')
  )

  const otherAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'other')
  )

  const externalAccounts = computed(() =>
    accounts.value.filter(a => a.type !== 'personal')
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
    merchantAccounts,
    contactAccounts,
    otherAccounts,
    externalAccounts,
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

export function useAccounts(): AccountsStore {
  if (!_store) {
    _store = createStore()
    startWatchingAccounts()
  }
  return _store
}
