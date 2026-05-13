<template>
  <div class="tab-panel">
    <div v-if="isMobile" class="mobile-rules-header">
      <button class="mobile-back-btn" type="button" @click="$emit('back')">
        <Icon name="solar:alt-arrow-left-linear" size="20" />
        <span>返回账单</span>
      </button>
    </div>

    <ImportRuleList
      :rules="importRules"
      :accounts="accounts"
      :categories="categories"
      @add="$emit('add-rule')"
      @edit="$emit('edit-rule', $event)"
      @delete="$emit('delete-rule', $event)"
      @toggle="(id: string, enabled: boolean) => $emit('toggle-rule', { id, enabled })"
      @export="$emit('export-rules')"
      @import="$emit('import-rules')"
      @batch-delete="$emit('batch-delete-rules', $event)"
      @batch-enable="$emit('batch-enable-rules', $event)"
      @batch-disable="$emit('batch-disable-rules', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  importRules: any[]
  accounts: any[]
  categories: any[]
  isMobile: boolean
}>()

defineEmits<{
  (e: 'back'): void
  (e: 'add-rule'): void
  (e: 'edit-rule', rule: any): void
  (e: 'delete-rule', id: string): void
  (e: 'toggle-rule', data: { id: string; enabled: boolean }): void
  (e: 'export-rules'): void
  (e: 'import-rules'): void
  (e: 'batch-delete-rules', ids: string[]): void
  (e: 'batch-enable-rules', ids: string[]): void
  (e: 'batch-disable-rules', ids: string[]): void
}>()
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
