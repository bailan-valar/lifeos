import type {
  Bill,
  BillFormData,
  ImportRecord,
  ImportRecordItem,
  ImportRecordItemStatus,
  ImportRecordStatus,
  BillSplitItem,
  BillAllocateItem,
  RefundFormData,
  InstallmentItem,
  InstallmentFormData
} from '~/types/bill'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { dedupeKey } from '~/services/csvImport'
import { useImportRecords } from '~/composables/useImportRecords'
import { maybeRecalculateBalance, recalculateBalance } from '~/composables/useBalanceAdjustments'
import Decimal from 'decimal.js'
import { sum, add, sub, mul, eq } from '~/utils/decimal'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

async function updateAccountBalance(id: string, delta: number) {
  if (!id) return
  const db = await getDB()
  const doc = await db.accounts.findOne(id).exec()
  if (!doc) return
  const newBalance = add(doc.get('balance') as number, delta)
  await doc.patch({ balance: newBalance, updatedAt: now() })
}

async function applyBalanceChange(bill: Bill, reverse = false) {
  const m = reverse ? -1 : 1
  if (bill.fromAccountId) await updateAccountBalance(bill.fromAccountId, mul(bill.amount, -m))
  if (bill.toAccountId) await updateAccountBalance(bill.toAccountId, mul(bill.amount, m))
}

function toIsoMinutes(date: string): string {
  return date.length >= 16 ? date.slice(0, 16).replace(' ', 'T') : date
}

export function useBills() {
  const bills = ref<Bill[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const pageSize = ref(50)
  const currentPage = ref(1)

  let unsubscribe: (() => void) | null = null
  let lastReloadContext: {
    type: 'all' | 'noteId' | 'noteIds' | 'paginated' | 'category' | 'dateRange' | 'account'
    noteId?: string
    noteIds?: string[]
    categoryId?: string
    accountId?: string
    startDate?: string
    endDate?: string
  } | null = null

  async function loadBills(noteId?: string) {
    lastReloadContext = { type: noteId ? 'noteId' : 'all', noteId }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills:', e)
    } finally {
      loading.value = false
    }
  }

  async function reloadFromRemote(silent = false) {
    if (!lastReloadContext) {
      await loadBills()
      return
    }
    // 静默模式：临时保存并恢复 loading 状态，避免 UI 闪烁
    if (silent) {
      const prevLoading = loading.value
      try {
        await doReloadFromRemote()
      } finally {
        loading.value = prevLoading
      }
    } else {
      await doReloadFromRemote()
    }
  }

  async function doReloadFromRemote() {
    if (!lastReloadContext) {
      await loadBills()
      return
    }
    switch (lastReloadContext.type) {
      case 'all':
        await loadBills()
        break
      case 'noteId':
        await loadBills(lastReloadContext.noteId)
        break
      case 'noteIds':
        if (lastReloadContext.noteIds) await loadBillsForNotes(lastReloadContext.noteIds)
        else await loadBills()
        break
      case 'paginated':
        await loadBillsPaginated(lastReloadContext.noteId, 1)
        break
      case 'category':
        await loadBillsByCategory(
          lastReloadContext.categoryId || '',
          lastReloadContext.noteId,
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      case 'dateRange':
        await loadBillsByDateRange(
          lastReloadContext.noteId,
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      case 'account':
        await loadBillsByAccount(
          lastReloadContext.accountId || '',
          lastReloadContext.startDate,
          lastReloadContext.endDate
        )
        break
      default:
        await loadBills()
    }
  }

  async function loadBillsForNotes(noteIds: string[]) {
    lastReloadContext = { type: 'noteIds', noteIds }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      if (noteIds.length === 0) {
        bills.value = []
        return
      }
      const selector: Record<string, unknown> = noteIds.length === 1
        ? { noteId: noteIds[0] }
        : { noteId: { $in: noteIds } }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills for notes:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsPaginated(noteId?: string, page = 1) {
    lastReloadContext = { type: 'paginated', noteId }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, unknown> = noteId ? { noteId } : {}
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }],
        limit: pageSize.value,
        skip: (page - 1) * pageSize.value
      }).exec()
      const items = result.map((doc: any) => doc.toJSON())
      if (page === 1) bills.value = items
      else bills.value.push(...items)
      hasMore.value = items.length === pageSize.value
      currentPage.value = page
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills paginated:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadMoreBills(noteId?: string) {
    if (!hasMore.value || loading.value) return
    await loadBillsPaginated(noteId, currentPage.value + 1)
  }

  async function loadBillsByCategory(categoryId: string, noteId?: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'category', categoryId, noteId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = { categoryId }
      if (noteId) selector.noteId = noteId
      if (startDate || endDate) {
        selector.date = {}
        if (startDate) selector.date.$gte = startDate
        if (endDate) selector.date.$lte = endDate
      }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
      hasMore.value = false
      currentPage.value = 1
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills by category:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsByDateRange(noteId?: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'dateRange', noteId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = noteId ? { noteId } : {}
      if (startDate || endDate) {
        selector.date = {}
        if (startDate) selector.date.$gte = startDate
        if (endDate) selector.date.$lte = endDate
      }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
      hasMore.value = false
      currentPage.value = 1
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills by date range:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillsByAccount(accountId: string, startDate?: string, endDate?: string) {
    lastReloadContext = { type: 'account', accountId, startDate, endDate }
    loading.value = true
    error.value = null
    try {
      const db = await getDB()
      const selector: Record<string, any> = {
        $or: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      }
      if (startDate || endDate) {
        selector.date = {}
        if (startDate) selector.date.$gte = startDate
        if (endDate) selector.date.$lte = endDate
      }
      const result = await db.bills.find({
        selector,
        sort: [{ date: 'desc' }]
      }).exec()
      bills.value = result.map((doc: any) => doc.toJSON())
      hasMore.value = false
      currentPage.value = 1
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load bills by account:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadBillStats(noteId?: string, startDate?: string, endDate?: string) {
    const db = await getDB()
    // 过滤条件：只统计"叶子节点"账单（排除有子账单的父账单）
    const selector: Record<string, any> = {
      status: 'completed',
      $or: [
        { hasChildren: { $ne: true } },
        { hasChildren: { $exists: false } }
      ]
    }
    if (noteId) selector.noteId = noteId
    if (startDate || endDate) {
      selector.date = {}
      if (startDate) selector.date.$gte = startDate
      if (endDate) selector.date.$lte = endDate
    }
    const result = await db.bills.find({ selector }).exec()
    const items = result.map((doc: any) => doc.toJSON() as Bill)
    const income = sum(items.filter(b => b.type === 'income').map(b => b.amount))
    const expense = sum(items.filter(b => b.type === 'expense').map(b => b.amount))
    const transfer = sum(items.filter(b => b.type === 'transfer').map(b => b.amount))
    return { income, expense, transfer, net: sub(income, expense) }
  }

  async function createBill(data: BillFormData, noteId?: string): Promise<Bill> {
    const db = await getDB()
    const bill: Bill = {
      id: generateId(),
      noteId: data.noteId || noteId || '',
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      fromAccountId: data.fromAccountId || '',
      toAccountId: data.toAccountId || '',
      categoryId: data.categoryId || '',
      description: data.description || '',
      date: data.date,
      status: 'completed',
      debtSubtype: data.debtSubtype || '',
      relatedPersonId: data.relatedPersonId || '',
      settledAmount: 0,
      isSavable: data.isSavable || false,
      savableAmount: data.isSavable ? (data.savableAmount ?? data.amount) : undefined,
      isReimbursable: data.isReimbursable || false,
      reimbursableAmount: data.isReimbursable ? (data.reimbursableAmount ?? data.amount) : undefined,
      reimbursementId: data.reimbursementId || undefined,
      reimbursementRole: data.reimbursementRole || undefined,
      createdAt: now(),
      updatedAt: now(),
    }
    await db.bills.insert({ ...bill })
    await applyBalanceChange(bill, false)
    await maybeRecalculateBalance(bill.fromAccountId, bill.date)
    await maybeRecalculateBalance(bill.toAccountId, bill.date)
    bills.value.push(bill)
    return bill
  }

  async function createBillsBatch(
    record: ImportRecord,
    noteId: string
  ): Promise<ImportRecord> {
    const db = await getDB()
    const billIds: string[] = []
    let successCount = 0
    let skippedCount = 0
    let failedCount = 0

    const items: ImportRecordItem[] = []
    const affectedAccountIds = new Set<string>()

    for (const item of record.items) {
      const fingerprint = item.fingerprint || dedupeKey(item.date, item.amount, item.counterparty)
      const base = { ...item, fingerprint }

      if (item.skipped) {
        skippedCount++
        items.push({ ...base, status: 'skipped_unselected' as ImportRecordItemStatus })
        continue
      }

      if (!item.selected) {
        skippedCount++
        const status: ImportRecordItemStatus = item.duplicate ? 'skipped_duplicate' : 'skipped_unselected'
        items.push({ ...base, status })
        continue
      }

      // 精确重复检查：检查数据库中是否有相同账单
      // 规则：日期、金额相同，且账户匹配（商户/其他/空账户不参与比较）
      // 排除当前导入批次刚插入的账单，避免同批次内多笔同日同金额交易误判为重复
      const dateKey = item.date.slice(0, 10)
      const candidateBills = (await db.bills.find({
        selector: {
          noteId,
          date: { $gte: `${dateKey}T00:00:00.000Z`, $lt: `${dateKey}T23:59:59.999Z` },
          amount: item.amount
        }
      }).exec()).filter(doc => {
        const data = doc.toJSON() as any
        return data.importBatchId !== record.id
      })

      // 获取导入项的账户信息（需要查询账户类型）
      const fromAccount = item.fromAccountId ? await db.accounts.findOne(item.fromAccountId).exec() : null
      const toAccount = item.toAccountId ? await db.accounts.findOne(item.toAccountId).exec() : null
      const fromAccountType = fromAccount?.get('type') as string | undefined
      const toAccountType = toAccount?.get('type') as string | undefined

      // 检查是否有重复
      let existingDuplicate: any = null
      for (const billDoc of candidateBills) {
        const bill = billDoc.toJSON() as any

        // 类型不同则不是重复（支出 vs 收入/退款 vs 转账方向完全相反）
        if (item.type && bill.type && item.type !== bill.type) continue
        const billFromAccount = bill.fromAccountId ? await db.accounts.findOne(bill.fromAccountId).exec() : null
        const billToAccount = bill.toAccountId ? await db.accounts.findOne(bill.toAccountId).exec() : null
        const billFromType = billFromAccount?.get('type') as string | undefined
        const billToType = billToAccount?.get('type') as string | undefined

        // 检查出账账户（只有 personal 类型才参与比较）
        const invalidTypes = new Set(['merchant', 'other', 'contact'])
        let fromMatch = true
        if (fromAccountType && !invalidTypes.has(fromAccountType)) {
          // 导入项的出账账户有效，需要比较
          if (billFromType && !invalidTypes.has(billFromType)) {
            // 旧账单的出账账户也有效，必须相同
            if (item.fromAccountId !== bill.fromAccountId) {
              fromMatch = false
            }
          }
          // 如果旧账单的出账账户是商户/其他/人员/空，则不比较
        }
        // 如果导入项的出账账户是商户/其他/人员/空，则不比较

        // 检查入账账户
        let toMatch = true
        if (toAccountType && !invalidTypes.has(toAccountType)) {
          // 导入项的入账账户有效，需要比较
          if (billToType && !invalidTypes.has(billToType)) {
            // 旧账单的入账账户也有效，必须相同
            if (item.toAccountId !== bill.toAccountId) {
              toMatch = false
            }
          }
        }

        if (fromMatch && toMatch) {
          existingDuplicate = billDoc
          break
        }
      }

      if (existingDuplicate) {
        skippedCount++
        items.push({
          ...base,
          status: 'skipped_duplicate' as ImportRecordItemStatus,
          errorMessage: '与已有账单重复'
        })
        continue
      }

      try {
        if (item.amount <= 0) throw new Error('金额必须大于 0')
        const billId = generateId()
        const bill: Bill = {
          id: billId,
          noteId: item.noteId || noteId,
          type: item.type || 'expense',
          amount: item.amount,
          currency: 'CNY',
          fromAccountId: item.fromAccountId || '',
          toAccountId: item.toAccountId || '',
          categoryId: item.categoryId || '',
          description: [item.description, item.remark].filter(Boolean).join(' | ') || '',
          date: toIsoMinutes(item.date),
          status: 'completed',
          debtSubtype: item.debtSubtype || 'lend',
          relatedPersonId: '',
          settledAmount: 0,
          importBatchId: record.id,
          importSource: record.source,
          importFingerprint: fingerprint,
          counterpartyRaw: item.counterparty,
          isSavable: item.isSavable || false,
          isReimbursable: item.isReimbursable || false,
          createdAt: now(),
          updatedAt: now(),
        }
        await db.bills.insert({ ...bill })
        await applyBalanceChange(bill, false)
        if (bill.fromAccountId) affectedAccountIds.add(bill.fromAccountId)
        if (bill.toAccountId) affectedAccountIds.add(bill.toAccountId)
        bills.value.push(bill)
        billIds.push(billId)
        successCount++
        items.push({ ...base, status: 'created' as ImportRecordItemStatus, billId })
      } catch (e) {
        failedCount++
        items.push({
          ...base,
          status: 'failed' as ImportRecordItemStatus,
          errorMessage: e instanceof Error ? e.message : String(e)
        })
      }
    }

    const selectedCount = record.items.filter(i => i.selected).length
    const finishedAt = now()
    const status: ImportRecordStatus =
      successCount === 0 && selectedCount > 0
        ? 'failed'
        : failedCount > 0
          ? 'partial'
          : 'processing' // 导入成功后默认为待处理状态，需要用户确认

    const patch: Partial<ImportRecord> = {
      status,
      billIds,
      items,
      selectedCount,
      successCount,
      skippedCount,
      failedCount,
      finishedAt,
      updatedAt: finishedAt
    }

    await useImportRecords().updateRecord(record.id, patch)
    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
    }
    return { ...record, ...patch }
  }

  async function updateBill(id: string, data: Partial<BillFormData>) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const oldBill = doc.toJSON() as Bill

    await applyBalanceChange(oldBill, true)
    await maybeRecalculateBalance(oldBill.fromAccountId, oldBill.date)
    await maybeRecalculateBalance(oldBill.toAccountId, oldBill.date)

    const patch: Partial<Bill> = {
      ...data,
      savableAmount: data.isSavable ? (data.savableAmount ?? data.amount) : undefined,
      reimbursableAmount: data.isReimbursable ? (data.reimbursableAmount ?? data.amount) : undefined,
      updatedAt: now()
    }
    await doc.patch(patch)

    const newBill = { ...oldBill, ...patch } as Bill
    await applyBalanceChange(newBill, false)
    await maybeRecalculateBalance(newBill.fromAccountId, newBill.date)
    await maybeRecalculateBalance(newBill.toAccountId, newBill.date)

    const idx = bills.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      bills.value[idx] = newBill
    }
  }

  async function updateBills(ids: string[], data: Partial<BillFormData>) {
    const db = await getDB()
    let updatedCount = 0
    const failedIds: string[] = []
    const affectedAccountIds = new Set<string>()

    for (const id of ids) {
      try {
        const doc = await db.bills.findOne(id).exec()
        if (!doc) {
          failedIds.push(id)
          continue
        }
        const oldBill = doc.toJSON() as Bill

        await applyBalanceChange(oldBill, true)
        if (oldBill.fromAccountId) affectedAccountIds.add(oldBill.fromAccountId)
        if (oldBill.toAccountId) affectedAccountIds.add(oldBill.toAccountId)

        const patch: Partial<Bill> = {
          ...data,
          updatedAt: now()
        }
        await doc.patch(patch)

        const newBill = { ...oldBill, ...patch } as Bill
        await applyBalanceChange(newBill, false)

        const idx = bills.value.findIndex(b => b.id === id)
        if (idx !== -1) {
          bills.value[idx] = newBill
        }
        if (newBill.fromAccountId) affectedAccountIds.add(newBill.fromAccountId)
        if (newBill.toAccountId) affectedAccountIds.add(newBill.toAccountId)
        updatedCount++
      } catch (e) {
        console.error(`Failed to update bill ${id}:`, e)
        failedIds.push(id)
      }
    }

    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
    }
    return { updatedCount, failedIds }
  }

  async function deleteBill(id: string) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const bill = doc.toJSON() as Bill

    await applyBalanceChange(bill, true)
    await doc.remove()
    await maybeRecalculateBalance(bill.fromAccountId, bill.date)
    await maybeRecalculateBalance(bill.toAccountId, bill.date)
    bills.value = bills.value.filter(b => b.id !== id)
  }

  async function deleteBills(ids: string[]) {
    const db = await getDB()
    const docs: any[] = []
    const validBills: Bill[] = []

    for (const id of ids) {
      const doc = await db.bills.findOne(id).exec()
      if (doc) {
        docs.push(doc)
        validBills.push(doc.toJSON() as Bill)
      }
    }

    if (validBills.length === 0) return { deletedCount: 0 }

    // 串行执行余额变更，避免并行修改同一账户文档导致 PouchDB 冲突
    for (const bill of validBills) {
      await applyBalanceChange(bill, true)
    }
    // 串行删除文档，避免并发 remove 冲突
    for (const doc of docs) {
      await (doc as any).remove()
    }

    const affectedAccountIds = new Set<string>()
    for (const bill of validBills) {
      if (bill.fromAccountId) affectedAccountIds.add(bill.fromAccountId)
      if (bill.toAccountId) affectedAccountIds.add(bill.toAccountId)
    }
    for (const accountId of affectedAccountIds) {
      await recalculateBalance(accountId)
    }

    const deletedIds = new Set(validBills.map(b => b.id))
    bills.value = bills.value.filter(b => !deletedIds.has(b.id))

    return { deletedCount: validBills.length }
  }

  async function settleDebt(id: string, settleAmount: number) {
    const db = await getDB()
    const doc = await db.bills.findOne(id).exec()
    if (!doc) return
    const bill = doc.toJSON() as Bill
    if (bill.type !== 'debt') return

    const newSettled = add(bill.settledAmount, settleAmount)
    const newStatus = newSettled >= bill.amount ? 'completed' : 'pending'

    await doc.patch({
      settledAmount: newSettled,
      status: newStatus,
      updatedAt: now()
    })

    const idx = bills.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      bills.value[idx].settledAmount = newSettled
      bills.value[idx].status = newStatus as Bill['status']
      bills.value[idx].updatedAt = now()
    }
  }

  /**
   * 获取账单树（包含所有子账单）
   */
  async function getBillTree(billId: string): Promise<Bill[]> {
    const db = await getDB()
    const rootDoc = await db.bills.findOne(billId).exec()
    if (!rootDoc) return []
    const root = rootDoc.toJSON() as Bill
    const result: Bill[] = [root]

    if (root.hasChildren) {
      const childrenResult = await db.bills.find({
        selector: { parentId: billId },
        sort: [{ date: 'desc' }]
      }).exec()
      result.push(...childrenResult.map((doc: any) => doc.toJSON() as Bill))
    }

    return result
  }

  /**
   * 获取指定父账单的所有子账单
   */
  async function getChildBills(parentId: string): Promise<Bill[]> {
    const db = await getDB()
    const result = await db.bills.find({
      selector: { parentId: parentId },
      sort: [{ date: 'desc' }]
    }).exec()
    return result.map((doc: any) => doc.toJSON() as Bill)
  }

  /**
   * 创建子账单
   */
  async function createChildBill(parentId: string, data: BillFormData): Promise<Bill> {
    const db = await getDB()
    const parentDoc = await db.bills.findOne(parentId).exec()
    if (!parentDoc) throw new Error('父账单不存在')
    const parent = parentDoc.toJSON() as Bill

    const child: Bill = {
      id: generateId(),
      noteId: parent.noteId,
      type: data.type || parent.type,
      amount: data.amount,
      currency: parent.currency,
      fromAccountId: data.fromAccountId || parent.fromAccountId,
      toAccountId: data.toAccountId || parent.toAccountId,
      categoryId: data.categoryId,
      description: data.description || parent.description,
      date: data.date || parent.date,
      status: 'completed',
      debtSubtype: data.debtSubtype || parent.debtSubtype,
      relatedPersonId: data.relatedPersonId || parent.relatedPersonId,
      settledAmount: 0,
      parentId: parent.id,
      allocatedMonth: data.allocatedMonth,
      isRefund: data.isRefund,
      originalBillId: data.originalBillId,
      refundReason: data.refundReason,
      createdAt: now(),
      updatedAt: now(),
    }

    await db.bills.insert({ ...child })

    if (!parent.hasChildren) {
      await parentDoc.patch({ hasChildren: true, updatedAt: now() })
      const parentIdx = bills.value.findIndex(b => b.id === parentId)
      if (parentIdx !== -1) {
        bills.value[parentIdx].hasChildren = true
        bills.value[parentIdx].updatedAt = now()
      }
    }

    bills.value.push(child)
    return child
  }

  /**
   * 拆分账单（多分类拆分）
   * @param billId 原账单ID
   * @param splitItems 拆分项列表
   */
  async function splitBill(billId: string, splitItems: BillSplitItem[]): Promise<Bill[]> {
    const db = await getDB()
    const parentDoc = await db.bills.findOne(billId).exec()
    if (!parentDoc) throw new Error('账单不存在')
    const parent = parentDoc.toJSON() as Bill

    const totalSplitAmount = sum(splitItems.map(item => item.amount))
    if (!eq(totalSplitAmount, parent.amount, 0.01)) {
      throw new Error(`拆分金额总和(${totalSplitAmount})必须等于原账单金额(${parent.amount})`)
    }

    const children: Bill[] = []
    for (const item of splitItems) {
      const child: Bill = {
        id: generateId(),
        noteId: parent.noteId,
        type: parent.type,
        amount: item.amount,
        currency: parent.currency,
        fromAccountId: parent.fromAccountId,
        toAccountId: parent.toAccountId,
        categoryId: item.categoryId,
        description: item.description || parent.description,
        date: parent.date,
        status: 'completed',
        debtSubtype: parent.debtSubtype,
        relatedPersonId: parent.relatedPersonId,
        settledAmount: 0,
        parentId: parent.id,
        createdAt: now(),
        updatedAt: now(),
      }
      await db.bills.insert({ ...child })
      children.push(child)
      bills.value.push(child)
    }

    await parentDoc.patch({ hasChildren: true, updatedAt: now() })
    const parentIdx = bills.value.findIndex(b => b.id === billId)
    if (parentIdx !== -1) {
      bills.value[parentIdx].hasChildren = true
      bills.value[parentIdx].updatedAt = now()
    }

    return children
  }

  /**
   * 跨期分摊账单
   * @param billId 原账单ID
   * @param allocateItems 分摊项列表（月份+金额）
   */
  async function allocatePeriod(billId: string, allocateItems: BillAllocateItem[]): Promise<Bill[]> {
    const db = await getDB()
    const parentDoc = await db.bills.findOne(billId).exec()
    if (!parentDoc) throw new Error('账单不存在')
    const parent = parentDoc.toJSON() as Bill

    const totalAllocateAmount = allocateItems.reduce((sum, item) => sum.plus(item.amount), new Decimal(0)).toNumber()
    if (Math.abs(totalAllocateAmount - parent.amount) > 0.01) {
      throw new Error(`分摊金额总和(${totalAllocateAmount})必须等于原账单金额(${parent.amount})`)
    }

    const children: Bill[] = []
    for (const item of allocateItems) {
      const child: Bill = {
        id: generateId(),
        noteId: parent.noteId,
        type: parent.type,
        amount: item.amount,
        currency: parent.currency,
        fromAccountId: parent.fromAccountId,
        toAccountId: parent.toAccountId,
        categoryId: parent.categoryId,
        description: item.description || parent.description,
        date: item.date || parent.date,
        status: 'completed',
        debtSubtype: parent.debtSubtype,
        relatedPersonId: parent.relatedPersonId,
        settledAmount: 0,
        parentId: parent.id,
        allocatedMonth: item.month,
        createdAt: now(),
        updatedAt: now(),
      }
      await db.bills.insert({ ...child })
      children.push(child)
      bills.value.push(child)
    }

    await parentDoc.patch({ hasChildren: true, updatedAt: now() })
    const parentIdx = bills.value.findIndex(b => b.id === billId)
    if (parentIdx !== -1) {
      bills.value[parentIdx].hasChildren = true
      bills.value[parentIdx].updatedAt = now()
    }

    return children
  }

  /**
   * 创建退款账单
   * @param data 退款表单数据
   */
  async function createRefundBill(data: RefundFormData): Promise<Bill> {
    const db = await getDB()
    const originalDoc = await db.bills.findOne(data.billId).exec()
    if (!originalDoc) throw new Error('原账单不存在')
    const original = originalDoc.toJSON() as Bill

    if (data.amount > original.amount) {
      throw new Error('退款金额不能超过原账单金额')
    }

    const refundType = original.type === 'income' ? 'expense' : original.type === 'expense' ? 'income' : original.type
    let refundFromAccountId = original.toAccountId
    let refundToAccountId = original.fromAccountId

    // 使用用户指定的退款账户
    if (data.accountId) {
      if (refundType === 'income') {
        refundToAccountId = data.accountId
      } else {
        refundFromAccountId = data.accountId
      }
    }

    const refund: Bill = {
      id: generateId(),
      noteId: original.noteId,
      type: refundType,
      amount: data.amount,
      currency: original.currency,
      fromAccountId: refundFromAccountId,
      toAccountId: refundToAccountId,
      categoryId: original.categoryId,
      description: `退款: ${data.reason}` || `退款: ${original.description}`,
      date: data.date,
      status: 'completed',
      debtSubtype: original.debtSubtype,
      relatedPersonId: original.relatedPersonId,
      settledAmount: 0,
      isRefund: true,
      originalBillId: original.id,
      refundReason: data.reason,
      createdAt: now(),
      updatedAt: now(),
    }

    await db.bills.insert({ ...refund })
    await applyBalanceChange(refund, false)
    bills.value.push(refund)
    return refund
  }

  /**
   * 关联退款账单（不创建新账单，只更新退款账单的关联字段）
   * @param originalBillId 原始账单ID（通常是支出账单）
   * @param refundBillId 要关联为退款的账单ID（通常是收入账单）
   */
  async function linkRefundBill(
    originalBillId: string,
    refundBillId: string
  ): Promise<void> {
    const db = await getDB()
    const refundDoc = await db.bills.findOne(refundBillId).exec()
    if (!refundDoc) throw new Error('退款账单不存在')

    const refundBill = refundDoc.toJSON() as Bill
    if (refundBill.isRefund && refundBill.originalBillId) {
      throw new Error('该账单已关联为退款，请先解除关联')
    }
    if (originalBillId === refundBillId) throw new Error('不能关联自身')

    await refundDoc.patch({
      isRefund: true,
      originalBillId,
      updatedAt: now(),
    })
  }

  /**
   * 获取某账单的所有退款记录
   */
  async function getRefundsForBill(billId: string): Promise<Bill[]> {
    const db = await getDB()
    const result = await db.bills.find({
      selector: { originalBillId: billId },
      sort: [{ date: 'desc' }]
    }).exec()
    return result.map((doc: any) => doc.toJSON() as Bill)
  }

  /**
   * 计算账单实际金额（扣除退款后）
   */
  async function getEffectiveAmount(billId: string): Promise<number> {
    const refunds = await getRefundsForBill(billId)
    const totalRefund = sum(refunds.map(r => r.amount))
    const db = await getDB()
    const billDoc = await db.bills.findOne(billId).exec()
    if (!billDoc) return 0
    const bill = billDoc.toJSON() as Bill
    return sub(bill.amount, totalRefund)
  }

  /**
   * 创建信用卡分期还款账单
   * @param data 分期表单数据
   * @param items 分期项列表
   */
  async function createInstallmentBills(
    data: InstallmentFormData,
    items: InstallmentItem[]
  ): Promise<Bill[]> {
    const db = await getDB()
    const installmentId = generateId()
    const createdBills: Bill[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const bill: Bill = {
        id: generateId(),
        noteId: data.noteId,
        type: 'transfer',
        amount: item.amount,
        currency: 'CNY',
        fromAccountId: data.fromAccountId,
        toAccountId: data.accountId,
        categoryId: data.categoryId || '',
        description: item.description || `${data.accountId} 分期还款 第${i + 1}/${items.length}期`,
        date: item.date,
        status: 'completed',
        debtSubtype: 'lend',
        relatedPersonId: '',
        settledAmount: 0,
        createdAt: now(),
        updatedAt: now(),
      }
      await db.bills.insert({ ...bill })
      await applyBalanceChange(bill, false)
      await maybeRecalculateBalance(bill.fromAccountId, bill.date)
      await maybeRecalculateBalance(bill.toAccountId, bill.date)
      bills.value.push(bill)
      createdBills.push(bill)
    }

    return createdBills
  }

  function startWatching() {
    if (unsubscribe) return
    unsubscribe = onCollectionChange('bills', () => {
      reloadFromRemote(true)
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

  // 过滤掉有子账单的父账单，只统计"叶子节点"
  const leafBills = computed(() =>
    bills.value.filter(b => !b.hasChildren)
  )

  const totalIncome = computed(() =>
    sum(leafBills.value
      .filter(b => b.type === 'income' && b.status === 'completed')
      .map(b => b.amount))
  )

  const totalExpense = computed(() =>
    sum(leafBills.value
      .filter(b => b.type === 'expense' && b.status === 'completed')
      .map(b => b.amount))
  )

  const totalTransfer = computed(() =>
    sum(leafBills.value
      .filter(b => b.type === 'transfer' && b.status === 'completed')
      .map(b => b.amount))
  )

  const netBalance = computed(() => sub(totalIncome.value, totalExpense.value))

  return {
    bills,
    loading,
    error,
    hasMore,
    pageSize,
    currentPage,
    totalIncome,
    totalExpense,
    totalTransfer,
    netBalance,
    loadBills,
    loadBillsForNotes,
    loadBillsPaginated,
    loadMoreBills,
    loadBillsByCategory,
    loadBillsByDateRange,
    loadBillsByAccount,
    loadBillStats,
    createBill,
    createBillsBatch,
    updateBill,
    updateBills,
    deleteBill,
    deleteBills,
    settleDebt,
    getBillTree,
    getChildBills,
    createChildBill,
    splitBill,
    allocatePeriod,
    createRefundBill,
    linkRefundBill,
    getRefundsForBill,
    getEffectiveAmount,
    createInstallmentBills,
    startWatching,
    stopWatching,
    reloadFromRemote
  }
}
