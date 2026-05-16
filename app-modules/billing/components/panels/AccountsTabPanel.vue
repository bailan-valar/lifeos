<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="store.activeAccountSubTab"
        :options="store.accountSubTabOptions"
        :min-width="120"
        plain
        @change="store.activeAccountSubTab = $event"
      />
      <h4 v-else>{{ store.accountSubTabTitle }}</h4>
      <button type="button" class="add-btn" @click="dialogs.openAccountDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        添加账户
      </button>
    </div>
    <div class="list-container">
      <AccountList
        :accounts="filteredAccounts"
        @edit="dialogs.openAccountDialog($event)"
        @delete="$emit('delete-account', $event)"
        @view-statements="dialogs.openStatementList($event)"
        @adjust-balance="dialogs.openBalanceAdjustDialog($event)"
        @view-detail="navigateTo('/billing/accounts/' + $event.id)"
      />
    </div>

    <!-- 账户域对话框 -->
    <AccountDialog
      v-if="dialogs.accountDialogVisible.value"
      :visible="dialogs.accountDialogVisible.value"
      :account="dialogs.editingAccount.value || undefined"
      :categories="categories"
      :default-name="dialogs.accountFormDefaults.value?.defaultName"
      :default-type="dialogs.accountFormDefaults.value?.defaultType"
      @confirm="(data, isEditing, id) => $emit('account-confirm', data, isEditing, id)"
      @cancel="dialogs.closeAccountDialog"
    />
    <BalanceAdjustDialog
      v-if="dialogs.balanceAdjustVisible.value"
      :visible="dialogs.balanceAdjustVisible.value"
      :account="dialogs.adjustingAccount.value || undefined"
      :adjustments="dialogs.balanceAdjustments.value"
      @confirm="(data) => $emit('balance-adjust-confirm', data)"
      @cancel="dialogs.closeBalanceAdjust"
      @delete-record="(id) => $emit('delete-balance-adjustment', id)"
    />
    <StatementDialog
      v-if="dialogs.statementDialogVisible.value"
      :visible="dialogs.statementDialogVisible.value"
      :statement="dialogs.editingStatement.value || undefined"
      @confirm="(data, id) => $emit('statement-confirm', data, id)"
      @cancel="dialogs.closeStatementDialog"
    />
    <StatementListDialog
      v-if="dialogs.statementListDialogVisible.value"
      :visible="dialogs.statementListDialogVisible.value"
      :account="dialogs.viewingAccount.value || undefined"
      :statements="viewingAccountStatements"
      @edit="dialogs.openStatementEdit($event)"
      @generate="(year, month) => $emit('generate-statement', year, month)"
      @close="$emit('statement-list-close')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useStatements } from '~/composables/useStatements'
import { useAccountDialogs } from '../../composables/useAccountDialogs'
import SelectPicker from '../SelectPicker.vue'
import AccountList from '../AccountList.vue'
import AccountDialog from '../AccountDialog.vue'
import BalanceAdjustDialog from '../BalanceAdjustDialog.vue'
import StatementDialog from '../StatementDialog.vue'
import StatementListDialog from '../StatementListDialog.vue'

const emit = defineEmits<{
  (e: 'delete-account', id: string): void
  (e: 'account-confirm', data: any, isEditing: boolean, id?: string): void
  (e: 'balance-adjust-confirm', data: any): void
  (e: 'delete-balance-adjustment', id: string): void
  (e: 'statement-confirm', data: any, id: string): void
  (e: 'generate-statement', year: number, month: number): void
  (e: 'statement-list-close'): void
}>()

const store = useBillingStore()
const { isMobile } = useDevice()

const dialogs = useAccountDialogs()
const { accounts } = useAccounts()
const { categories } = useBillCategories()
const { statements } = useStatements()

const filteredAccounts = computed(() => {
  return accounts.value.filter((a: any) => a.type === store.activeAccountSubTab)
})

const viewingAccountStatements = computed(() =>
  dialogs.viewingAccount.value
    ? statements.value.filter((s: any) => s.accountId === dialogs.viewingAccount.value!.id)
    : []
)
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.8);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}

.add-btn:hover {
  opacity: 0.9;
}

.add-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(60, 60, 67, 0.7);
}

.add-btn.secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
