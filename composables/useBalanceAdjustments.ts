import type { BalanceAdjustment, Bill } from '~/types/bill'
import { getDB, generateId, now } from '~/services/db'
import { sum, sub, add } from '~/utils/decimal'

async function getLatestAdjustment(accountId: string): Promise<BalanceAdjustment | null> {
  const db = await getDB()
  const result = await db.balanceAdjustments.find({
    selector: { accountId }
  }).exec()
  if (result.length === 0) return null
  const items = result.map((doc: any) => doc.toJSON() as BalanceAdjustment)
  items.sort((a, b) => b.date.localeCompare(a.date))
  return items[0]
}

async function getNetChangeAfter(accountId: string, date: string): Promise<number> {
  const db = await getDB()
  const result = await db.bills.find({
    selector: {
      status: 'completed',
      date: { $gt: date }
    }
  }).exec()

  const changes: number[] = []
  for (const doc of result) {
    const bill = doc.toJSON() as Bill
    if (bill.type === 'debt') continue
    if (bill.fromAccountId === accountId) changes.push(-bill.amount)
    if (bill.toAccountId === accountId) changes.push(bill.amount)
  }
  return sum(changes)
}

async function patchAccountBalance(accountId: string, newBalance: number) {
  const db = await getDB()
  const doc = await db.accounts.findOne(accountId).exec()
  if (!doc) return
  await doc.patch({ balance: newBalance, updatedAt: now() })
}

export async function recalculateBalance(accountId: string): Promise<number | null> {
  const adj = await getLatestAdjustment(accountId)
  if (!adj) return null
  const net = await getNetChangeAfter(accountId, adj.date)
  const newBalance = add(adj.balanceAfter, net)
  await patchAccountBalance(accountId, newBalance)
  return newBalance
}

export async function maybeRecalculateBalance(accountId: string, billDate: string) {
  if (!accountId) return
  const adj = await getLatestAdjustment(accountId)
  if (!adj) return
  if (billDate <= adj.date) {
    await recalculateBalance(accountId)
  }
}

export async function createBalanceAdjustment(
  accountId: string,
  date: string,
  balanceAfter: number,
  note?: string
): Promise<BalanceAdjustment> {
  const db = await getDB()
  const accountDoc = await db.accounts.findOne(accountId).exec()
  const balanceBefore = accountDoc ? (accountDoc.get('balance') as number) : 0

  const net = await getNetChangeAfter(accountId, date)
  const newBalance = add(balanceAfter, net)
  await patchAccountBalance(accountId, newBalance)

  const adjustment: BalanceAdjustment = {
    id: generateId(),
    accountId,
    date,
    balanceBefore,
    balanceAfter,
    note: note || '',
    createdAt: now()
  }
  await db.balanceAdjustments.insert({ ...adjustment })
  return adjustment
}

export async function loadBalanceAdjustments(accountId: string): Promise<BalanceAdjustment[]> {
  const db = await getDB()
  const result = await db.balanceAdjustments.find({
    selector: { accountId }
  }).exec()
  const items = result.map((doc: any) => doc.toJSON() as BalanceAdjustment)
  items.sort((a, b) => b.date.localeCompare(a.date))
  return items
}

export async function deleteBalanceAdjustment(id: string) {
  const db = await getDB()
  const doc = await db.balanceAdjustments.findOne(id).exec()
  if (!doc) return
  await doc.remove()
}
