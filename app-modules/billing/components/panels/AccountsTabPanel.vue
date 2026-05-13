<template>
  <div class="tab-panel">
    <div class="panel-header">
      <SelectPicker
        v-if="isMobile"
        v-model="localActiveSubTab"
        :options="accountSubTabOptions"
        :min-width="120"
        plain
        @change="$emit('account-sub-tab-change', $event)"
      />
      <h4 v-else>{{ accountSubTabTitle }}</h4>
      <button type="button" class="add-btn" @click="$emit('add-account')">
        <Icon name="solar:add-circle-linear" size="18" />
        添加账户
      </button>
    </div>
    <div class="list-container">
      <AccountList
        :accounts="filteredAccounts"
        @edit="$emit('edit-account', $event)"
        @delete="$emit('delete-account', $event)"
        @view-statements="$emit('view-statements', $event)"
        @adjust-balance="$emit('adjust-balance', $event)"
        @view-detail="$emit('view-account-detail', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SelectPicker from '../SelectPicker.vue'
import AccountList from '../AccountList.vue'

type AccountType = 'personal' | 'contact' | 'merchant' | 'other'

const props = defineProps<{
  accounts: any[]
  activeAccountSubTab: AccountType
  accountSubTabTitle: string
  accountSubTabOptions: { value: AccountType; label: string }[]
  isMobile: boolean
}>()

defineEmits<{
  (e: 'account-sub-tab-change', type: AccountType): void
  (e: 'add-account'): void
  (e: 'edit-account', account: any): void
  (e: 'delete-account', id: string): void
  (e: 'view-statements', account: any): void
  (e: 'adjust-balance', account: any): void
  (e: 'view-account-detail', account: any): void
}>()

const localActiveSubTab = ref(props.activeAccountSubTab)

watch(() => props.activeAccountSubTab, (val) => {
  localActiveSubTab.value = val
})

const filteredAccounts = computed(() => {
  return props.accounts.filter(a => a.type === props.activeAccountSubTab)
})
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
