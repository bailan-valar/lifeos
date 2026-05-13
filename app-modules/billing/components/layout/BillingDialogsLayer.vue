<template>
  <div class="billing-dialogs-layer">
    <!-- 批量编辑对话框 -->
    <BillBatchEditDialog
      v-if="dialogs.batchEditVisible.value"
      :selected-bills="selectedBills"
      :accounts="accounts"
      :categories="categories"
      @confirm="$emit('batch-edit-confirm', $event)"
      @cancel="dialogs.closeBatchEdit()"
    />

    <!-- 导入规则对话框 -->
    <ImportRuleDialog
      v-if="importRuleDialogVisible"
      v-model:form="importRuleDialogForm"
      :accounts="accounts"
      :categories="categories"
      @confirm="$emit('import-rule-confirm', $event)"
      @cancel="importRuleDialogVisible = false"
    />

    <!-- 导入记录详情对话框 -->
    <ImportRecordDetail
      v-if="dialogs.recordDetailVisible.value && dialogs.recordDetailRecord.value"
      ref="recordDetailRef"
      :visible="dialogs.recordDetailVisible.value"
      :record="dialogs.recordDetailRecord.value"
      :accounts="accounts"
      :categories="categories"
      @close="dialogs.closeRecordDetail()"
      @import="$emit('import-record', $event)"
      @rollback="$emit('rollback-record', $event)"
      @delete="$emit('delete-record', $event)"
    />

    <!-- 账单对话框 -->
    <BillDialog
      v-if="dialogs.billDialogVisible.value"
      ref="billDialogRef"
      :visible="dialogs.billDialogVisible.value"
      :bill="dialogs.editingBill.value || undefined"
      :accounts="accounts"
      :categories="categories"
      :note-options="noteOptions"
      :default-note-id="noteId"
      :default-form-values="dialogs.editingBill.value ? undefined : dialogs.lastBillDefaults.value || undefined"
      @confirm="(data: any, isEditing: boolean, id?: string) => $emit('bill-confirm', data, isEditing, id)"
      @cancel="dialogs.closeBillDialog()"
    />

    <!-- 账户对话框 -->
    <AccountDialog
      v-if="dialogs.accountDialogVisible.value"
      :visible="dialogs.accountDialogVisible.value"
      :account="dialogs.editingAccount.value || undefined"
      :categories="categories"
      :default-name="dialogs.accountFormDefaults.value?.defaultName"
      :default-type="dialogs.accountFormDefaults.value?.defaultType"
      @confirm="(data: any, isEditing: boolean, id?: string) => $emit('account-confirm', data, isEditing, id)"
      @cancel="dialogs.closeAccountDialog()"
    />

    <!-- 分类对话框 -->
    <CategoryDialog
      v-if="dialogs.categoryDialogVisible.value"
      :visible="dialogs.categoryDialogVisible.value"
      :category="dialogs.editingCategory.value || undefined"
      :categories="categories"
      :exclude-id="dialogs.editingCategory.value?.id"
      :default-type="dialogs.categoryFormDefaults.value?.type"
      :default-parent-id="dialogs.categoryFormDefaults.value?.defaultParentId"
      :default-name="dialogs.categoryFormDefaults.value?.defaultName"
      @confirm="(data: any, isEditing: boolean, id?: string) => $emit('category-confirm', data, isEditing, id)"
      @cancel="dialogs.closeCategoryDialog()"
    />

    <!-- 预算对话框 -->
    <BudgetDialog
      v-if="dialogs.budgetDialogVisible.value"
      ref="budgetDialogRef"
      :visible="dialogs.budgetDialogVisible.value"
      :budget="dialogs.editingBudget.value || undefined"
      :categories="categories"
      :note-options="noteOptions"
      @confirm="(data: any, isEditing: boolean, id?: string) => $emit('budget-confirm', data, isEditing, id)"
      @cancel="dialogs.closeBudgetDialog()"
    />

    <!-- 账单周期对话框 -->
    <StatementDialog
      v-if="dialogs.statementDialogVisible.value"
      :visible="dialogs.statementDialogVisible.value"
      :statement="dialogs.editingStatement.value || undefined"
      @confirm="(data: any, id: string) => $emit('statement-confirm', data, id)"
      @cancel="dialogs.closeStatementDialog()"
    />

    <!-- 账单周期列表对话框 -->
    <StatementListDialog
      v-if="dialogs.statementListDialogVisible.value"
      :visible="dialogs.statementListDialogVisible.value"
      :account="dialogs.viewingAccount.value || undefined"
      :statements="viewingAccountStatements"
      @edit="$emit('edit-statement', $event)"
      @generate="$emit('generate-statement', $event)"
      @close="dialogs.closeStatementList()"
    />

    <!-- 导入对话框 -->
    <ImportDialog
      v-if="dialogs.importDialogVisible.value"
      ref="importDialogRef"
      :visible="dialogs.importDialogVisible.value"
      :note-id="noteId"
      :accounts="accounts"
      :categories="categories"
      :existing-fingerprints="existingFingerprints"
      @cancel="dialogs.closeImportDialog()"
      @record-created="$emit('record-created', $event)"
      @view-record="$emit('view-record', $event)"
      @open-rules="$emit('open-rules-from-import')"
    />

    <!-- 规则对话框 -->
    <RuleDialog
      v-if="dialogs.ruleDialogVisible.value"
      :visible="dialogs.ruleDialogVisible.value"
      :rule="dialogs.editingRule.value || undefined"
      :accounts="accounts"
      :categories="categories"
      @confirm="(data: any, isEditing: boolean, id?: string) => $emit('rule-confirm', data, isEditing, id)"
      @cancel="dialogs.closeRuleDialog()"
    />

    <!-- 余额调整对话框 -->
    <BalanceAdjustDialog
      v-if="dialogs.balanceAdjustVisible.value"
      :visible="dialogs.balanceAdjustVisible.value"
      :account="dialogs.adjustingAccount.value || undefined"
      :adjustments="dialogs.balanceAdjustments.value"
      @confirm="$emit('balance-adjust-confirm', $event)"
      @cancel="dialogs.closeBalanceAdjust()"
      @delete-record="$emit('delete-balance-adjustment', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import BillBatchEditDialog from '../BillBatchEditDialog.vue'
import ImportRuleDialog from '../ImportRuleDialog.vue'
import ImportRecordDetail from '../ImportRecordDetail.vue'
import BillDialog from '../BillDialog.vue'
import AccountDialog from '../AccountDialog.vue'
import CategoryDialog from '../CategoryDialog.vue'
import BudgetDialog from '../BudgetDialog.vue'
import StatementDialog from '../StatementDialog.vue'
import StatementListDialog from '../StatementListDialog.vue'
import ImportDialog from '../ImportDialog.vue'
import RuleDialog from '../RuleDialog.vue'
import BalanceAdjustDialog from '../BalanceAdjustDialog.vue'

// 通过inject获取对话框状态和数据
const dialogs = inject<any>('billingDialogsState')
const noteId = inject<string>('noteId')
const accounts = inject<Ref<any[]>>('accounts')
const categories = inject<Ref<any[]>>('categories')
const noteOptions = inject<Ref<any[]>>('noteOptions')
const existingFingerprints = inject<ComputedRef<Set<string>>>('existingFingerprints')

// 本地状态
const importRuleDialogVisible = ref(false)
const importRuleDialogForm = ref({
  source: 'all',
  matchField: 'account',
  matchMode: 'fuzzy',
  pattern: '',
  categoryId: '',
  accountId: '',
  priority: 100,
  enabled: true
})

// 计算属性
const viewingAccountStatements = computed(() => {
  if (!dialogs.viewingAccount.value || !accounts) return []
  return accounts.value.filter((s: any) => s.accountId === dialogs.viewingAccount.value!.id)
})

const selectedBills = inject<ComputedRef<any[]>>('selectedBills')

// Refs
const billDialogRef = ref()
const budgetDialogRef = ref()
const importDialogRef = ref()
const recordDetailRef = ref()

// Emit all dialog events to parent
const emit = defineEmits<{
  (e: 'batch-edit-confirm', data: any): void
  (e: 'import-rule-confirm', form: any): void
  (e: 'import-record', record: any): void
  (e: 'rollback-record', record: any): void
  (e: 'delete-record', recordId: string): void
  (e: 'bill-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'account-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'category-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'budget-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'statement-confirm', data: any, id: string): void
  (e: 'edit-statement', statement: any): void
  (e: 'generate-statement', data: any): void
  (e: 'open-rules-from-import'): void
  (e: 'view-record', recordId: string): void
  (e: 'rule-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'balance-adjust-confirm', data: any): void
  (e: 'delete-balance-adjustment', id: string): void
  (e: 'record-created', record: any): void
}>()
</script>

<style scoped>
.billing-dialogs-layer {
  display: contents;
}
</style>
