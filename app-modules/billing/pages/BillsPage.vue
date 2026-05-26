<template>
  <div class="bills-page">
    <BillsTabPanel
      :bills="bills"
      :batch-mode="batchMode"
      :selected-ids="selectedIds"
      :loading="loading"
      :note-id="noteId"
      @toggle-select-all="handleToggleSelectAll"
      @exit-batch-mode="exitBatchMode"
      @select-bill="toggleBillSelect"
      @select-all-bills="selectAllBills"
      @unselect-all-bills="unselectAllBills"
      @open-rules-from-import="onOpenRulesFromImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBills } from '~/composables/useBills'
import { useBillingBatch } from '../composables/useBillingBatch'
import { useBillDialogs } from '../composables/useBillDialogs'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import BillsTabPanel from '../components/panels/BillsTabPanel.vue'

const router = useRouter()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()

// Use empty string as default noteId (consistent with main BillingView)
const noteId = ref('')

// Data management
const { bills, loading, loadBillsPaginated, createBill, updateBill, updateBills, deleteBill, deleteBills } = useBills()

// Dialog state
const billDialogs = useBillDialogs()

// Batch operations
const batchMode = ref(false)
const selectedIds = ref<string[]>([])

const { enterBatchMode, exitBatchMode, toggleBillSelect, selectAllBills, unselectAllBills, handleToggleSelectAll, handleBatchDelete, handleBatchEdit } = useBillingBatch({
  batchMode, selectedIds, batchEditVisible: billDialogs.batchEditVisible,
  bills, deleteBills, updateBill, updateBills, confirm, showSuccess, showError
})

function onOpenRulesFromImport() {
  billDialogs.closeImportDialog()
  router.push('/billing/rules')
}

// Load bills on mount
onMounted(async () => {
  try {
    // Load bills for the current noteId
    await loadBillsPaginated(noteId.value, 1)
  } catch (error) {
    showError('Failed to load bills')
  }
})
</script>

<style scoped>
.bills-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
