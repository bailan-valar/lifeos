import type { Ref } from 'vue'
import type { Bill, BillFormData } from '~/types/bill'

export interface UseBillingBatchOptions {
  batchMode: Ref<boolean>
  selectedIds: Ref<string[]>
  batchEditVisible: Ref<boolean>
  bills: Ref<Bill[]>
  deleteBills: (ids: string[]) => Promise<{ deletedCount: number }>
  updateBill: (id: string, data: Partial<BillFormData>) => Promise<void>
  updateBills: (ids: string[], data: Partial<BillFormData>) => Promise<{ failedIds: string[] }>
  confirm: (msg: string | { message: string; danger?: boolean }) => Promise<boolean>
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
}

export function useBillingBatch(options: UseBillingBatchOptions) {
  function enterBatchMode() {
    options.batchMode.value = true
    options.selectedIds.value = []
  }

  function exitBatchMode() {
    options.batchMode.value = false
    options.selectedIds.value = []
  }

  function toggleBillSelect(id: string) {
    const idx = options.selectedIds.value.indexOf(id)
    if (idx === -1) {
      options.selectedIds.value.push(id)
    } else {
      options.selectedIds.value.splice(idx, 1)
    }
  }

  function selectAllBills() {
    options.selectedIds.value = options.bills.value.map(b => b.id)
  }

  function unselectAllBills() {
    options.selectedIds.value = []
  }

  function handleToggleSelectAll(select: boolean) {
    if (select) selectAllBills()
    else unselectAllBills()
  }

  async function handleBatchDelete() {
    if (options.selectedIds.value.length === 0) return
    const count = options.selectedIds.value.length
    if (!await options.confirm({ message: `确定删除选中的 ${count} 条账单？`, danger: true })) return
    try {
      const result = await options.deleteBills(options.selectedIds.value)
      options.showSuccess(`已删除 ${result.deletedCount} 条账单`)
      exitBatchMode()
    } catch (e) {
      options.showError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleBatchEdit(data: { categoryId?: string; fromAccountId?: string; toAccountId?: string; description?: string; descMode?: 'replace' | 'prefix' | 'suffix' }) {
    if (options.selectedIds.value.length === 0) return

    const patch: Partial<BillFormData> = {}
    if (data.categoryId) patch.categoryId = data.categoryId
    if (data.fromAccountId) patch.fromAccountId = data.fromAccountId
    if (data.toAccountId) patch.toAccountId = data.toAccountId

    try {
      if (data.description && data.descMode) {
        for (const id of options.selectedIds.value) {
          const bill = options.bills.value.find(b => b.id === id)
          if (!bill) continue
          let newDesc = bill.description
          if (data.descMode === 'replace') {
            newDesc = data.description
          } else if (data.descMode === 'prefix') {
            newDesc = data.description + newDesc
          } else if (data.descMode === 'suffix') {
            newDesc = newDesc + data.description
          }
          await options.updateBill(id, { ...patch, description: newDesc })
        }
      } else if (Object.keys(patch).length > 0) {
        const result = await options.updateBills(options.selectedIds.value, patch)
        if (result.failedIds.length > 0) {
          options.showError(`${result.failedIds.length} 条账单更新失败`)
        }
      }

      options.showSuccess('批量修改完成')
      options.batchEditVisible.value = false
      exitBatchMode()
    } catch (e) {
      options.showError(e instanceof Error ? e.message : String(e))
    }
  }

  return {
    enterBatchMode,
    exitBatchMode,
    toggleBillSelect,
    selectAllBills,
    unselectAllBills,
    handleToggleSelectAll,
    handleBatchDelete,
    handleBatchEdit
  }
}
