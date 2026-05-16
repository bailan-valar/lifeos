import { ref } from 'vue'
import type { Bill, ImportRecord } from '~/types/bill'

export function useBillDialogs() {
  const billDialogVisible = ref(false)
  const editingBill = ref<Bill | null>(null)
  const lastBillDefaults = ref<Partial<{
    type: 'income' | 'expense' | 'transfer' | 'debt'
    fromAccountId: string
    toAccountId: string
    categoryId: string
    currency: string
  }> | null>(null)

  const batchEditVisible = ref(false)

  const importDialogVisible = ref(false)

  const recordDetailVisible = ref(false)
  const viewingRecordId = ref<string | null>(null)
  const recordDetailRecord = ref<ImportRecord | null>(null)

  function openBillDialog(bill?: Bill) {
    editingBill.value = bill || null
    billDialogVisible.value = true
  }

  function closeBillDialog() {
    billDialogVisible.value = false
    editingBill.value = null
  }

  function openImportDialog() {
    importDialogVisible.value = true
  }

  function closeImportDialog() {
    importDialogVisible.value = false
  }

  function closeBatchEdit() {
    batchEditVisible.value = false
  }

  function setRecordDetailRecord(record: ImportRecord | null) {
    recordDetailRecord.value = record
  }

  function closeRecordDetail() {
    recordDetailVisible.value = false
    viewingRecordId.value = null
  }

  return {
    billDialogVisible,
    editingBill,
    lastBillDefaults,
    batchEditVisible,
    importDialogVisible,
    recordDetailVisible,
    viewingRecordId,
    recordDetailRecord,
    openBillDialog,
    closeBillDialog,
    openImportDialog,
    closeImportDialog,
    closeBatchEdit,
    setRecordDetailRecord,
    closeRecordDetail
  }
}
