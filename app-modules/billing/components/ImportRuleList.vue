<template>
  <div class="rule-list">
    <div class="list-header">
      <div class="list-title">导入规则</div>
      <div class="header-actions">
        <div class="search-box">
          <Icon name="solar:magnifer-linear" size="14" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索规则..."
            class="search-input"
          />
          <button v-if="searchQuery" type="button" class="search-clear" @click="searchQuery = ''">
            <Icon name="solar:close-circle-linear" size="14" />
          </button>
        </div>
        <template v-if="!batchMode">
          <button type="button" class="btn-secondary" @click="$emit('export')">
            <Icon name="solar:export-linear" size="14" />
            <span>导出</span>
          </button>
          <button type="button" class="btn-secondary" @click="$emit('import')">
            <Icon name="solar:import-linear" size="14" />
            <span>导入</span>
          </button>
          <button type="button" class="btn-secondary" @click="enterBatchMode">
            <Icon name="solar:checklist-minimalistic-linear" size="14" />
            <span>批量</span>
          </button>
          <button type="button" class="btn-primary" @click="$emit('add')">
            <Icon name="solar:add-circle-linear" size="14" />
            <span>新建规则</span>
          </button>
        </template>
      </div>
    </div>

    <RuleBatchToolbar
      v-if="batchMode"
      :selected-count="selectedIds.length"
      :total-count="rules.length"
      @toggle-select-all="handleToggleSelectAll"
      @batch-delete="$emit('batch-delete', selectedIds)"
      @batch-enable="$emit('batch-enable', selectedIds)"
      @batch-disable="$emit('batch-disable', selectedIds)"
      @exit="exitBatchMode"
    />

    <div v-if="filteredRules.length === 0" class="empty">
      <Icon name="solar:filter-linear" size="32" />
      <span>{{ rules.length === 0 ? '暂无规则,点击新建' : '无匹配规则' }}</span>
    </div>

    <div v-else class="rule-items">
      <div
        v-for="rule in filteredRules"
        :key="rule.id"
        class="rule-item"
        :class="{ disabled: !rule.enabled, selected: isSelected(rule.id) }"
        @click="handleRowClick(rule.id)"
      >
        <label v-if="batchMode" class="row-checkbox" @click.stop>
          <input
            type="checkbox"
            :checked="isSelected(rule.id)"
            @change="toggleSelect(rule.id)"
          />
        </label>
        <label v-else class="enabled-toggle" :title="rule.enabled ? '已启用' : '已禁用'" @click.stop>
          <input
            type="checkbox"
            :checked="rule.enabled"
            @change="onToggle(rule, ($event.target as HTMLInputElement).checked)"
          />
        </label>
        <div class="rule-info">
          <div class="rule-row">
            <span class="rule-keyword">{{ rule.pattern || '(空)' }}</span>
            <span class="rule-badge" :class="matchModeClass(rule.matchMode)">{{ matchModeLabel(rule.matchMode) }}</span>
            <span class="rule-badge source">{{ sourceLabel(rule.source) }}</span>
            <span class="rule-badge field">{{ matchFieldLabel(rule.matchField) }}</span>
            <span class="rule-priority">优先级 {{ rule.priority }}</span>
          </div>
          <div class="rule-meta">
            <span v-if="rule.matchField !== 'description'">匹配账户: {{ accountName(rule.accountId) || '未指定' }}</span>
            <span>匹配分类: {{ categoryName(rule.categoryId) || '未指定' }}</span>
          </div>
        </div>
        <div v-if="!batchMode" class="rule-actions">
          <button type="button" class="action-btn" title="编辑" @click.stop="$emit('edit', rule)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button type="button" class="action-btn danger" title="删除" @click.stop="$emit('delete', rule.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportRule, ImportRuleMatchMode, ImportRuleMatchField, ImportSource, Account, BillCategory } from '~/types/bill'
import RuleBatchToolbar from './RuleBatchToolbar.vue'

const props = defineProps<{
  rules: ImportRule[]
  accounts: Account[]
  categories: BillCategory[]
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'edit', rule: ImportRule): void
  (e: 'delete', id: string): void
  (e: 'toggle', id: string, enabled: boolean): void
  (e: 'export'): void
  (e: 'import'): void
  (e: 'batch-delete', ids: string[]): void
  (e: 'batch-enable', ids: string[]): void
  (e: 'batch-disable', ids: string[]): void
}>()

const batchMode = ref(false)
const selectedIds = ref<string[]>([])
const searchQuery = ref('')

const filteredRules = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.rules
  return props.rules.filter(rule => {
    if (rule.pattern?.toLowerCase().includes(q)) return true
    if (matchModeLabel(rule.matchMode).includes(q)) return true
    if (sourceLabel(rule.source).includes(q)) return true
    if (matchFieldLabel(rule.matchField).includes(q)) return true
    if (accountName(rule.accountId).toLowerCase().includes(q)) return true
    if (categoryName(rule.categoryId).toLowerCase().includes(q)) return true
    return false
  })
})

function enterBatchMode() {
  batchMode.value = true
  selectedIds.value = []
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = []
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

function handleRowClick(id: string) {
  if (!batchMode.value) return
  toggleSelect(id)
}

function handleToggleSelectAll(select: boolean) {
  if (select) {
    selectedIds.value = props.rules.map(r => r.id)
  } else {
    selectedIds.value = []
  }
}

function onToggle(rule: ImportRule, enabled: boolean) {
  emit('toggle', rule.id, enabled)
}

function matchModeLabel(m: ImportRuleMatchMode): string {
  if (m === 'exact') return '精确'
  if (m === 'fuzzy') return '模糊'
  return '正则'
}

function matchModeClass(m: ImportRuleMatchMode): string {
  if (m === 'exact') return 'exact'
  if (m === 'fuzzy') return 'fuzzy'
  return 'regex'
}

function sourceLabel(s: ImportSource | 'all'): string {
  if (s === 'alipay') return '支付宝'
  if (s === 'wechat') return '微信'
  if (s === 'cmb') return '招商银行'
  return '全部'
}

function matchFieldLabel(f: ImportRuleMatchField | undefined): string {
  if (f === 'account') return '账户'
  if (f === 'description') return '商品说明'
  return '账户'
}

function accountName(id: string): string {
  return props.accounts.find(a => a.id === id)?.name || ''
}

function categoryName(id: string): string {
  return props.categories.find(c => c.id === id)?.name || ''
}
</script>

<style scoped>
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 13px;
  cursor: pointer;
}
.btn-primary:hover {
  background: rgb(0, 100, 220);
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 8px;
  color: rgba(60, 60, 67, 0.4);
  pointer-events: none;
}
.search-input {
  padding: 6px 24px 6px 28px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.78);
  outline: none;
  width: 160px;
  transition: width 0.2s ease, border-color 0.2s ease;
}
.search-input:focus {
  width: 200px;
  border-color: rgba(0, 122, 255, 0.4);
  background: rgba(255, 255, 255, 0.9);
}
.search-input::placeholder {
  color: rgba(60, 60, 67, 0.35);
}
.search-clear {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  padding: 0;
}
.search-clear:hover {
  color: rgba(60, 60, 67, 0.7);
}
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(0, 0, 0, 0.78);
  font-size: 13px;
  cursor: pointer;
}
.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.04);
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: rgba(60, 60, 67, 0.5);
  font-size: 14px;
}
.rule-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  transition: opacity 0.15s ease, background 0.15s ease;
  cursor: default;
}
.rule-item.disabled {
  opacity: 0.5;
}
.rule-item.selected {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.25);
}
.enabled-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.enabled-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.row-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.row-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: rgb(0, 122, 255);
}
.rule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rule-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.rule-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.rule-badge.exact {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.rule-badge.fuzzy {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.rule-badge.regex {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}
.rule-badge.source {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
}
.rule-badge.field {
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
}
.rule-priority {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}
.rule-keyword {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rule-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.rule-actions {
  display: flex;
  gap: 4px;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}
.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}
.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
</style>
