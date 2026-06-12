import type { Bill } from '~/types/bill'
import type {
  ReimbursementGroup,
  ReimbursementGroupFormData,
  ReimbursementGroupView,
  ReimbursementIncomeFormData,
  ReimbursementStatus,
} from '~/types/reimbursement'
import { getDB, generateId, now, onCollectionChange } from '~/services/db'
import { sum } from '~/utils/decimal'
import { ref, type Ref } from 'vue'
import { onMounted, onUnmounted, getCurrentInstance } from 'vue'

const MODULE_ID = 'reimbursement'

export interface ReimburseStore {
  groups: Ref<ReimbursementGroup[]>
  loading: Ref<boolean>
  loadGroups: (noteId?: string) => Promise<void>
  createGroup: (noteId: string, data: ReimbursementGroupFormData) => Promise<ReimbursementGroup>
  updateGroup: (id: string, patch: Partial<ReimbursementGroupFormData>) => Promise<void>
  updateGroupStatus: (id: string, status: ReimbursementStatus) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  getGroupById: (id: string) => ReimbursementGroup | undefined
  getBillsForGroup: (groupId: string) => Promise<Bill[]>
  getGroupView: (groupId: string) => Promise<ReimbursementGroupView | null>
  addBillsToGroup: (billIds: string[], groupId: string) => Promise<void>
  removeBillFromGroup: (billId: string) => Promise<void>
  createIncomeForGroup: (groupId: string, noteId: string, data: ReimbursementIncomeFormData) => Promise<Bill>
  startWatching: () => void
  stopWatching: () => void
}

function createStore(): ReimburseStore {
  const groups = ref<ReimbursementGroup[]>([]) as Ref<ReimbursementGroup[]>
  const loading = ref(false)
  let unsubscribe: (() => void) | null = null

  // ========== 数据持久化 ==========

  /** 从 module_data 读取报销单列表 */
  async function fetchGroupsFromDB(noteId?: string): Promise<ReimbursementGroup[]> {
    const db = await getDB()
    const selector: Record<string, unknown> = { moduleId: MODULE_ID }
    if (noteId) selector.noteId = noteId
    const docs = await db.module_data.find({ selector }).exec()
    const allGroups: ReimbursementGroup[] = []
    for (const doc of docs) {
      const data = doc.get('data') as ReimbursementGroup[] | null
      if (Array.isArray(data)) {
        allGroups.push(...data)
      }
    }
    return allGroups
  }

  /** 保存报销单列表到 module_data */
  async function persistGroups(noteId: string, groupList: ReimbursementGroup[]): Promise<void> {
    const db = await getDB()
    const existingDoc = await db.module_data.findOne({
      selector: { noteId, moduleId: MODULE_ID },
    }).exec()

    if (existingDoc) {
      await existingDoc.patch({
        data: groupList,
        updatedAt: now(),
      })
    } else {
      await db.module_data.insert({
        id: generateId(),
        noteId,
        moduleId: MODULE_ID,
        data: groupList,
        createdAt: now(),
        updatedAt: now(),
        version: 1,
      })
    }
  }

  // ========== 公共方法 ==========

  async function loadGroups(noteId?: string): Promise<void> {
    loading.value = true
    try {
      groups.value = await fetchGroupsFromDB(noteId)
    } finally {
      loading.value = false
    }
  }

  async function createGroup(noteId: string, data: ReimbursementGroupFormData): Promise<ReimbursementGroup> {
    const group: ReimbursementGroup = {
      id: generateId(),
      noteId,
      title: data.title,
      description: data.description,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
    }

    // 追加到当前 noteId 的列表中
    const existing = groups.value.filter(g => g.noteId === noteId)
    const updated = [...existing, group]
    await persistGroups(noteId, updated)

    groups.value = [...groups.value, group]
    return group
  }

  async function updateGroup(id: string, patch: Partial<ReimbursementGroupFormData>): Promise<void> {
    const idx = groups.value.findIndex(g => g.id === id)
    if (idx === -1) throw new Error('报销单不存在')

    const updated = {
      ...groups.value[idx],
      ...patch,
      updatedAt: now(),
    }
    const newList = [...groups.value]
    newList[idx] = updated

    await persistGroups(updated.noteId, newList.filter(g => g.noteId === updated.noteId))
    groups.value = newList
  }

  async function updateGroupStatus(id: string, status: ReimbursementStatus): Promise<void> {
    const idx = groups.value.findIndex(g => g.id === id)
    if (idx === -1) throw new Error('报销单不存在')

    const updated = {
      ...groups.value[idx],
      status,
      updatedAt: now(),
    }
    const newList = [...groups.value]
    newList[idx] = updated

    await persistGroups(updated.noteId, newList.filter(g => g.noteId === updated.noteId))
    groups.value = newList
  }

  async function deleteGroup(id: string): Promise<void> {
    const group = groups.value.find(g => g.id === id)
    if (!group) throw new Error('报销单不存在')

    // 清除关联账单的 reimbursementId
    const db = await getDB()
    const linkedBills = await db.bills.find({
      selector: { reimbursementId: id },
    }).exec()
    for (const doc of linkedBills) {
      await doc.patch({
        reimbursementId: undefined,
        reimbursementRole: undefined,
        updatedAt: now(),
      })
    }

    // 从列表中移除
    const newList = groups.value.filter(g => g.id !== id)
    await persistGroups(group.noteId, newList.filter(g => g.noteId === group.noteId))
    groups.value = newList
  }

  function getGroupById(id: string): ReimbursementGroup | undefined {
    return groups.value.find(g => g.id === id)
  }

  async function getBillsForGroup(groupId: string): Promise<Bill[]> {
    const db = await getDB()
    const result = await db.bills.find({
      selector: { reimbursementId: groupId },
    }).exec()
    return result.map((doc: any) => doc.toJSON() as Bill)
  }

  async function getGroupView(groupId: string): Promise<ReimbursementGroupView | null> {
    const group = getGroupById(groupId)
    if (!group) return null

    const bills = await getBillsForGroup(groupId)
    const expenses = bills.filter(b => b.reimbursementRole === 'expense')
    const income = bills.find(b => b.reimbursementRole === 'income')

    return {
      ...group,
      expenses,
      income,
      totalExpense: sum(expenses.map(b => b.amount)),
      totalIncome: income ? income.amount : 0,
    }
  }

  async function addBillsToGroup(billIds: string[], groupId: string): Promise<void> {
    const group = getGroupById(groupId)
    if (!group) throw new Error('报销单不存在')

    const db = await getDB()
    const nowStr = now()
    for (const billId of billIds) {
      const doc = await db.bills.findOne(billId).exec()
      if (!doc) continue
      const bill = doc.toJSON() as Bill
      // 只允许未关联的支出账单加入
      if (bill.reimbursementId || bill.type !== 'expense' || bill.isRefund) continue
      await doc.patch({
        reimbursementId: groupId,
        reimbursementRole: 'expense',
        updatedAt: nowStr,
      })
    }
  }

  async function removeBillFromGroup(billId: string): Promise<void> {
    const db = await getDB()
    const doc = await db.bills.findOne(billId).exec()
    if (!doc) throw new Error('账单不存在')

    const bill = doc.toJSON() as Bill
    if (!bill.reimbursementId) throw new Error('该账单未关联报销单')

    await doc.patch({
      reimbursementId: undefined,
      reimbursementRole: undefined,
      updatedAt: now(),
    })
  }

  async function createIncomeForGroup(
    groupId: string,
    noteId: string,
    data: ReimbursementIncomeFormData,
  ): Promise<Bill> {
    const group = getGroupById(groupId)
    if (!group) throw new Error('报销单不存在')

    // 获取关联支出的分类和货币信息
    const linkedBills = await getBillsForGroup(groupId)
    const expenses = linkedBills.filter(b => b.reimbursementRole === 'expense')
    const firstExpense = expenses[0]

    const db = await getDB()
    const income: Bill = {
      id: generateId(),
      noteId,
      type: 'income',
      amount: data.amount,
      currency: firstExpense?.currency || 'CNY',
      fromAccountId: firstExpense?.fromAccountId || '',
      toAccountId: data.accountId,
      categoryId: firstExpense?.categoryId || '',
      description: data.description || `报销回款: ${group.title}`,
      date: data.date,
      status: 'completed',
      debtSubtype: '',
      relatedPersonId: '',
      settledAmount: 0,
      reimbursementId: groupId,
      reimbursementRole: 'income',
      createdAt: now(),
      updatedAt: now(),
    }

    await db.bills.insert({ ...income })

    // 更新账户余额
    if (income.toAccountId) {
      const accountDoc = await db.accounts.findOne(income.toAccountId).exec()
      if (accountDoc) {
        const newBalance = (accountDoc.get('balance') as number) + income.amount
        await accountDoc.patch({ balance: newBalance, updatedAt: now() })
      }
    }

    // 更新报销单状态为 paid
    await updateGroupStatus(groupId, 'paid')

    return income
  }

  // ========== 变更订阅 ==========

  function startWatching(): void {
    if (unsubscribe) return
    const handler = () => {
      // 数据变更时重新加载（静默模式）
      loadGroups()
    }
    const unsub1 = onCollectionChange('module_data', handler)
    const unsub2 = onCollectionChange('bills', handler)
    unsubscribe = () => {
      unsub1()
      unsub2()
    }
  }

  function stopWatching(): void {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // 自动挂载生命周期
  if (getCurrentInstance()) {
    onMounted(startWatching)
    onUnmounted(stopWatching)
  }

  return {
    groups,
    loading,
    loadGroups,
    createGroup,
    updateGroup,
    updateGroupStatus,
    deleteGroup,
    getGroupById,
    getBillsForGroup,
    getGroupView,
    addBillsToGroup,
    removeBillFromGroup,
    createIncomeForGroup,
    startWatching,
    stopWatching,
  }
}

let _store: ReimburseStore | null = null

export function useReimburse(): ReimburseStore {
  if (!_store) {
    _store = createStore()
  }
  return _store
}
