import { ref } from 'vue'
import type { Bill, ImportRecord } from '~/types/bill'

let _store: BillDialogsStore | null = null

interface BillDialogsStore {
  billDialogVisible: Ref<boolean>
  editingBill: Ref<Bill | null>
  lastBillDefaults: Ref<Partial<{
    type: 'income' | 'expense' | 'transfer' | 'debt'
    fromAccountId: string
    toAccountId: string
    categoryId: string
    currency: string
  }> | null>
  batchEditVisible: Ref<boolean>
  importDialogVisible: Ref<boolean>
  recordDetailVisible: Ref<boolean>
  viewingRecordId: Ref<string | null>
  recordDetailRecord: Ref<ImportRecord | null>
  openBillDialog: (bill?: Bill) => void
  closeBillDialog: () => void
  openImportDialog: () => void
  closeImportDialog: () => void
  closeBatchEdit: () => void
  setRecordDetailRecord: (record: ImportRecord | null) => void
  closeRecordDetail: () => void
}

function createStore(): BillDialogsStore {
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

export function useBillDialogs(): BillDialogsStore {
  if (!_store) _store = createStore()
  return _store
}
