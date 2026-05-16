<template>
  <div class="tab-panel">
    <div v-if="isMobile" class="mobile-rules-header">
      <button class="mobile-back-btn" type="button" @click="store.activeTab = 'bills'">
        <Icon name="solar:alt-arrow-left-linear" size="20" />
        <span>返回账单</span>
      </button>
    </div>

    <ImportRuleList
      :rules="importRules"
      :accounts="accounts"
      :categories="categories"
      @add="dialogs.openRuleDialog()"
      @edit="dialogs.openRuleDialog($event)"
      @delete="$emit('delete-rule', $event)"
      @toggle="(id: string, enabled: boolean) => $emit('toggle-rule', { id, enabled })"
      @export="$emit('export-rules')"
      @import="$emit('import-rules')"
      @batch-delete="$emit('batch-delete-rules', $event)"
      @batch-enable="$emit('batch-enable-rules', $event)"
      @batch-disable="$emit('batch-disable-rules', $event)"
    />
  </div>
  <RuleDialog
    v-if="dialogs.ruleDialogVisible.value"
    :visible="dialogs.ruleDialogVisible.value"
    :rule="dialogs.editingRule.value || undefined"
    :accounts="accounts"
    :categories="categories"
    @confirm="(data: any, isEditing: boolean, id?: string) => $emit('rule-confirm', data, isEditing, id)"
    @cancel="dialogs.closeRuleDialog"
  />
</template>

<script setup lang="ts">
import { useBillingStore } from '~/stores/billing'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useRuleDialogs } from '../../composables/useRuleDialogs'
import ImportRuleList from '../ImportRuleList.vue'
import RuleDialog from '../RuleDialog.vue'

const props = defineProps<{
  importRules: any[]
}>()

defineEmits<{
  (e: 'delete-rule', id: string): void
  (e: 'toggle-rule', data: { id: string; enabled: boolean }): void
  (e: 'export-rules'): void
  (e: 'import-rules'): void
  (e: 'batch-delete-rules', ids: string[]): void
  (e: 'batch-enable-rules', ids: string[]): void
  (e: 'batch-disable-rules', ids: string[]): void
  (e: 'rule-confirm', data: any, isEditing: boolean, id?: string): void
}>()

const store = useBillingStore()
const { isMobile } = useDevice()

const dialogs = useRuleDialogs()
const { accounts } = useAccounts()
const { categories } = useBillCategories()
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 移动端规则页返回头部 */
.mobile-rules-header {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 4px;
}

.mobile-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 0;
  border: none;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mobile-back-btn:active {
  opacity: 0.6;
}
</style>
