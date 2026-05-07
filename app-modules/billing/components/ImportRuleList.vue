<template>
  <div class="rule-list">
    <div class="list-header">
      <div class="list-title">导入规则</div>
      <div class="header-actions">
        <button type="button" class="btn-secondary" @click="$emit('export')">
          <Icon name="solar:export-linear" size="14" />
          <span>导出</span>
        </button>
        <button type="button" class="btn-secondary" @click="$emit('import')">
          <Icon name="solar:import-linear" size="14" />
          <span>导入</span>
        </button>
        <button type="button" class="btn-primary" @click="$emit('add')">
          <Icon name="solar:add-circle-linear" size="14" />
          <span>新建规则</span>
        </button>
      </div>
    </div>

    <div v-if="rules.length === 0" class="empty">
      <Icon name="solar:filter-linear" size="32" />
      <span>暂无规则,点击新建</span>
    </div>

    <div v-else class="rule-items">
      <div v-for="rule in rules" :key="rule.id" class="rule-item" :class="{ disabled: !rule.enabled }">
        <label class="enabled-toggle" :title="rule.enabled ? '已启用' : '已禁用'">
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
        <div class="rule-actions">
          <button type="button" class="action-btn" title="编辑" @click="$emit('edit', rule)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button type="button" class="action-btn danger" title="删除" @click="$emit('delete', rule.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportRule, ImportRuleMatchMode, ImportRuleMatchField, ImportSource, Account, BillCategory } from '~/types/bill'

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
}>()

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
}
.rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  transition: opacity 0.15s ease;
}
.rule-item.disabled {
  opacity: 0.5;
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
