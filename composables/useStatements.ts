import type { Bill, Account, Statement, StatementFormData } from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { sum, mul, round } from '~/utils/decimal'

let _store: StatementsStore | null = null
let _unsub: (() => void) | null = null

function startWatchingStatements() {
  if (_unsub) return
  _unsub = onCollectionChange('statements', () => {
    if (_store) _store.loadStatements(_lastAccountId)
  })
}

function stopWatchingStatements() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
}

let _lastAccountId: string | undefined = undefined

if (import.meta.client) {
  window.addEventListener('workspace:changed', () => {
    stopWatchingStatements()
    startWatchingStatements()
    if (_store) _store.loadStatements(_lastAccountId)
  })
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function clampDay(d: number | undefined): number {
  if (typeof d !== 'number' || isNaN(d)) return 1
  return Math.max(1, Math.min(28, Math.floor(d)))
}

export function computePeriod(account: Account, year: number, month: number) {
  const bDay = clampDay(account.billingDay)
  const rDay = clampDay(account.repaymentDay)

  const endY = year
  const endM = month

  let startY = year
  let startM = month - 1
  if (startM < 1) {
    startM = 12
    startY = year - 1
  }

  const startDay = bDay + 1 > 28 ? 28 : bDay + 1
  const billingStartDate = `${startY}-${pad(startM)}-${pad(startDay)}`
  const billingEndDate = `${endY}-${pad(endM)}-${pad(bDay)}`

  let rY = endY
  let rM = endM
  if (rDay <= bDay) {
    rM += 1
    if (rM > 12) {
      rM = 1
      rY += 1
    }
  }
  const repaymentDate = `${rY}-${pad(rM)}-${pad(rDay)}`

  return { billingStartDate, billingEndDate, repaymentDate }
}

interface StatementsStore {
  statements: Ref<Statement[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  loadStatements: (accountId?: string) => Promise<void>
  createStatement: (data: Omit<Statement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Statement>
  updateStatement: (id: string, data: Partial<StatementFormData>) => Promise<void>
  deleteStatement: (id: string) => Promise<void>
  generateForPeriod: (account: Account, allBills: Bill[], year: number, month: number) => Promise<Statement>
}

function createStore(): StatementsStore {
  const statements = ref<Statement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadStatements(accountId?: string) {
    _lastAccountId = accountId
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = accountId ? { accountId } : {}
      const result = await db.statements.find({
        selector,
        sort: [{ year: 'desc' }, { month: 'desc' }]
      }).exec()
      statements.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load statements:', e)
    } finally {
      loading.value = false
    }
  }

  async function createStatement(
    data: Omit<Statement, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Statement> {
    const db = await getDB()
    const stmt: Statement = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    }
    await db.statements.insert({ ...stmt })
    statements.value.push(stmt)
    return stmt
  }

  async function updateStatement(id: string, data: Partial<StatementFormData>) {
    const db = await getDB()
    const doc = await db.statements.findOne(id).exec()
    if (!doc) return
    const patch = { ...data, updatedAt: now() }
    await doc.patch(patch)
    const idx = statements.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      statements.value[idx] = { ...statements.value[idx], ...patch }
    }
  }

  async function deleteStatement(id: string) {
    const db = await getDB()
    const doc = await db.statements.findOne(id).exec()
    if (!doc) return
    await doc.remove()
    statements.value = statements.value.filter(s => s.id !== id)
  }

  async function generateForPeriod(
    account: Account,
    allBills: Bill[],
    year: number,
    month: number
  ): Promise<Statement> {
    const period = computePeriod(account, year, month)
    const start = period.billingStartDate
    const end = period.billingEndDate

    // 当未传入账单数据时，从数据库直接查询
    let periodBills: Bill[]
    if (allBills.length === 0) {
      const db = await getDB()
      const result = await db.bills.find({
        selector: {
          fromAccountId: account.id,
          type: 'expense'
        }
      }).exec()
      const allDocs = result.map((doc: any) => doc.toJSON() as Bill)
      periodBills = allDocs.filter(b =>
        b.date.slice(0, 10) >= start &&
        b.date.slice(0, 10) <= end
      )
    } else {
      periodBills = allBills.filter(b =>
        b.fromAccountId === account.id &&
        b.type === 'expense' &&
        b.date.slice(0, 10) >= start &&
        b.date.slice(0, 10) <= end
      )
    }
    const stmtAmount = sum(periodBills.map(b => b.amount))
    const minPayment = round(mul(stmtAmount, 0.1), 2)

    const existing = statements.value.find(s =>
      s.accountId === account.id && s.year === year && s.month === month
    )
    if (existing) {
      await updateStatement(existing.id, {
        statementAmount: stmtAmount,
        minimumPayment: minPayment
      })
      return statements.value.find(s => s.id === existing.id)!
    }

    return await createStatement({
      accountId: account.id,
      year,
      month,
      billingStartDate: period.billingStartDate,
      billingEndDate: period.billingEndDate,
      repaymentDate: period.repaymentDate,
      statementAmount: stmtAmount,
      minimumPayment: minPayment,
      paidAmount: 0,
      status: 'pending'
    })
  }

  return {
    statements,
    loading,
    error,
    loadStatements,
    createStatement,
    updateStatement,
    deleteStatement,
    generateForPeriod
  }
}

export function useStatements(): StatementsStore {
  if (!_store) {
    _store = createStore()
    startWatchingStatements()
    // 首次创建时自动加载，组件无需手动调 loadStatements()
    _store.loadStatements()
  }
  return _store
}
