import type { Bill, RefundFormData } from '~/types/bill'
import { getDB, onCollectionChange } from '~/services/db'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

export interface RefundStats {
  totalRefund: number
  effectiveAmount: number
  refundCount: number
}

export interface BillRefundsStore {
  getRefundsForBill: (billId: string) => Promise<Bill[]>
  getEffectiveAmount: (billId: string) => Promise<number>
  getRefundStats: (billId: string) => Promise<RefundStats>
  getAllRefunds: (noteId?: string) => Promise<Bill[]>
  startWatching: () => void
  stopWatching: () => void
}

function createStore(): BillRefundsStore {
  let unsubscribe: (() => void) | null = null

  async function getRefundsForBill(billId: string): Promise<Bill[]> {
    const db = await getDB()
    const result = await db.bills.find({
      selector: { originalBillId: billId },
      sort: [{ date: 'desc' }]
    }).exec()
    return result.map((doc: any) => doc.toJSON() as Bill)
  }

  async function getEffectiveAmount(billId: string): Promise<number> {
    const refunds = await getRefundsForBill(billId)
    const totalRefund = refunds.reduce((sum, r) => sum + r.amount, 0)
    const db = await getDB()
    const billDoc = await db.bills.findOne(billId).exec()
    if (!billDoc) return 0
    const bill = billDoc.toJSON() as Bill
    return Math.max(0, bill.amount - totalRefund)
  }

  async function getRefundStats(billId: string): Promise<RefundStats> {
    const refunds = await getRefundsForBill(billId)
    const totalRefund = refunds.reduce((sum, r) => sum + r.amount, 0)
    const db = await getDB()
    const billDoc = await db.bills.findOne(billId).exec()
    if (!billDoc) {
      return { totalRefund, effectiveAmount: 0, refundCount: refunds.length }
    }
    const bill = billDoc.toJSON() as Bill
    return {
      totalRefund,
      effectiveAmount: Math.max(0, bill.amount - totalRefund),
      refundCount: refunds.length
    }
  }

  async function getAllRefunds(noteId?: string): Promise<Bill[]> {
    const db = await getDB()
    const selector: Record<string, unknown> = { isRefund: true }
    if (noteId) selector.noteId = noteId
    const result = await db.bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()
    return result.map((doc: any) => doc.toJSON() as Bill)
  }

  function startWatching() {
    if (unsubscribe) return
    unsubscribe = onCollectionChange('bills', () => {
      // 触发更新
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

  return {
    getRefundsForBill,
    getEffectiveAmount,
    getRefundStats,
    getAllRefunds,
    startWatching,
    stopWatching
  }
}

let _store: BillRefundsStore | null = null

export function useBillRefunds(): BillRefundsStore {
  if (!_store) {
    _store = createStore()
  }
  return _store
}
