<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="navigation.activeAccountSubTab.value"
        :options="navigation.accountSubTabOptions.value"
        :min-width="120"
        plain
        @change="navigation.activeAccountSubTab.value = $event"
      />
      <h4 v-else>{{ navigation.accountSubTabTitle.value }}</h4>
      <button type="button" class="add-btn" @click="accountDialogs.openAccountDialog()">
        <Icon name="solar:add-circle-linear" size="18" />
        添加账户
      </button>
    </div>
    <div class="list-container">
      <AccountList
        :accounts="filteredAccounts"
        @edit="accountDialogs.openAccountDialog($event)"
        @delete="$emit('delete-account', $event)"
        @view-statements="accountDialogs.openStatementList($event)"
        @adjust-balance="accountDialogs.openBalanceAdjustDialog($event)"
        @view-detail="navigateTo('/billing/accounts/' + $event.id)"
      />
    </div>

    <!-- 账户域对话框 -->
    <AccountDialog
      v-if="accountDialogs.accountDialogVisible.value"
      :visible="accountDialogs.accountDialogVisible.value"
      :account="accountDialogs.editingAccount.value || undefined"
      :categories="categories"
      :default-name="accountDialogs.accountFormDefaults.value?.defaultName"
      :default-type="accountDialogs.accountFormDefaults.value?.defaultType"
      @confirm="(data, isEditing, id) => $emit('account-confirm', data, isEditing, id)"
      @cancel="accountDialogs.closeAccountDialog"
    />
    <BalanceAdjustDialog
      v-if="accountDialogs.balanceAdjustVisible.value"
      :visible="accountDialogs.balanceAdjustVisible.value"
      :account="accountDialogs.adjustingAccount.value || undefined"
      :adjustments="accountDialogs.balanceAdjustments.value"
      @confirm="(data) => $emit('balance-adjust-confirm', data)"
      @cancel="accountDialogs.closeBalanceAdjust"
      @delete-record="(id) => $emit('delete-balance-adjustment', id)"
    />
    <StatementDialog
      v-if="accountDialogs.statementDialogVisible.value"
      :visible="accountDialogs.statementDialogVisible.value"
      :statement="accountDialogs.editingStatement.value || undefined"
      @confirm="(data, id) => $emit('statement-confirm', data, id)"
      @cancel="accountDialogs.closeStatementDialog"
    />
    <StatementListDialog
      v-if="accountDialogs.statementListDialogVisible.value"
      :visible="accountDialogs.statementListDialogVisible.value"
      :account="accountDialogs.viewingAccount.value || undefined"
      :statements="viewingAccountStatements"
      @edit="accountDialogs.openStatementEdit($event)"
      @generate="(year, month) => $emit('generate-statement', year, month)"
      @close="$emit('statement-list-close')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
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

const navigation = inject<any>('billingNavigation')
const { isMobile } = useDevice()

const accountDialogs = inject('accountDialogs') as any
const accounts = inject('accounts') as any
const categories = inject('categories') as any
const statements = inject('statements') as any

const filteredAccounts = computed(() => {
  return accounts.value.filter((a: any) => a.type === navigation.activeAccountSubTab.value)
})

const viewingAccountStatements = computed(() =>
  accountDialogs.viewingAccount.value
    ? statements.value.filter((s: any) => s.accountId === accountDialogs.viewingAccount.value!.id)
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
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.add-btn:hover {
  background: rgb(0, 110, 250);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
