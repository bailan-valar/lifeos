import type { Bill, Account, Statement, StatementFormData } from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

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

export function useStatements() {
  const statements = ref<Statement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let unsubscribe: (() => void) | null = null
  let lastAccountId: string | undefined = undefined

  async function loadStatements(accountId?: string) {
    lastAccountId = accountId
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

  function startWatching() {
    if (unsubscribe) return
    unsubscribe = onCollectionChange('statements', () => {
      loadStatements(lastAccountId)
    })
  }

  function stopWatching() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  if (getCurrentInstance()) {
    onMounted(startWatching)
    onUnmounted(stopWatching)
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

    const periodBills = allBills.filter(b =>
      b.fromAccountId === account.id &&
      b.type === 'expense' &&
      b.date.slice(0, 10) >= start &&
      b.date.slice(0, 10) <= end
    )
    const stmtAmount = periodBills.reduce((sum, b) => sum + b.amount, 0)
    const minPayment = Math.round(stmtAmount * 0.1 * 100) / 100

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
    generateForPeriod,
    startWatching,
    stopWatching
  }
}
