<template>
  <Teleport to="body">
    <Transition name="record-modal">
      <div v-if="visible" ref="overlayRef" class="record-modal-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined">
        <div class="record-modal-card" @click.stop>
          <div class="record-modal-header">
            <h4>{{ isPending ? '导入详情 - 待导入' : '导入详情' }}</h4>
            <button type="button" class="close-btn" @click="emit('close')">
              <Icon name="solar:close-circle-linear" size="18" />
            </button>
          </div>

          <div class="record-modal-body">
            <!-- 元信息 -->
            <div class="record-meta">
              <div class="meta-row">
                <span class="meta-label">时间</span>
                <span>{{ formatDateTime(record.createdAt) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">来源</span>
                <span>{{ sourceLabel(record.source) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">文件</span>
                <span>{{ record.fileName || '-' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">状态</span>
                <span class="history-status" :class="record.status">{{ statusLabel(record.status) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">统计</span>
                <span>
                  总 {{ record.totalParsed }} · 选中 {{ isPending ? selectedCount : record.selectedCount }} ·
                  成功 {{ isPending ? 0 : record.successCount }} ·
                  跳过 {{ isPending ? skippedCount : record.skippedCount }} ·
                  失败 {{ isPending ? 0 : record.failedCount }}
                </span>
              </div>
            </div>

            <!-- Pending 编辑态 -->
            <template v-if="isPending">
              <div class="preview-summary">
                <div class="filter-tabs">
                  <button
                    v-for="f in filterOptions"
                    :key="f.value"
                    type="button"
                    class="filter-tab"
                    :class="{ active: filter === f.value }"
                    @click="filter = f.value"
                  >
                    {{ f.label }} ({{ counts[f.value] }})
                  </button>
                </div>
                <button type="button" class="btn-link" @click="toggleAll">
                  {{ allSelected ? '全不选' : '全选(跳过重复)' }}
                </button>
              </div>

              <div v-if="filteredItems.length === 0" class="empty-tip">当前筛选下无记录</div>
              <VirtualList
                v-else
                :items="filteredItems"
                :item-height="100"
                :container-height="400"
                :buffer="5"
                :gap="4"
                class="preview-list"
              >
                <template #default="{ item }">
                  <ImportPreviewRow
                    :key="item.rawIndex"
                    :row="item"
                    :accounts="accounts"
                    :categories="categories"
                    :matched-rule="ruleById(item.matchedRuleId) ?? ruleById(item.paymentMethodRuleId) ?? ruleById(item.descriptionRuleId)"
                    @update:row="(v) => onItemUpdate(item.rawIndex, v)"
                    @save-as-rule="openRuleOverlay"
                    @save-counterparty-rule="openCounterpartyRule"
                    @save-payment-method-rule="openPaymentMethodRule"
                    @save-description-rule="openDescriptionRule"
                  />
                </template>
              </VirtualList>
            </template>

            <!-- 已完成只读态 -->
            <template v-else>
              <div class="record-items">
                <div
                  v-for="item in record.items"
                  :key="item.rawIndex"
                  class="record-item"
                  :class="item.status"
                >
                  <div class="item-main">
                    <span class="item-counterparty">{{ item.counterparty || '-' }}</span>
                    <span class="item-amount" :class="item.direction">
                      {{ item.direction === 'in' ? '+' : '-' }}{{ item.amount.toFixed(2) }}
                    </span>
                  </div>
                  <div class="item-meta">
                    <span>{{ item.date }}</span>
                    <span class="item-status">{{ itemStatusLabel(item.status) }}</span>
                  </div>
                  <div v-if="item.errorMessage" class="item-error">{{ item.errorMessage }}</div>
                </div>
              </div>
            </template>
          </div>

          <div class="record-modal-footer">
            <button type="button" class="cancel-btn" @click="emit('close')">关闭</button>
            <template v-if="isPending">
              <button type="button" class="secondary-btn" :disabled="importing" @click="applyAllRules">应用规则</button>
              <button type="button" class="danger-btn" :disabled="importing" @click="onDelete">删除</button>
              <button
                type="button"
                class="confirm-btn"
                :disabled="!canImport || importing"
                @click="onImport"
              >
                <span v-if="importing">导入中...</span>
                <span v-else>导入选中 ({{ selectedCount }})</span>
              </button>
            </template>
            <button
              v-else-if="record.status !== 'rolled_back' && (record.billIds?.length || 0) > 0"
              type="button"
              class="confirm-btn danger"
              @click="onRollback"
            >
              一键回滚
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  ImportRecord,
  ImportRecordItem,
  ImportRecordStatus,
  ImportRule,
  ImportRuleFormData,
  ImportSource
} from '~/types/bill'
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useImportRules } from '~/composables/useImportRules'
import { useImportRecords } from '~/composables/useImportRecords'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import { useConfirm } from '~/composables/useConfirm'
import { suggestAccountIds } from '~/composables/useAccountMatcher'
import ImportPreviewRow from './ImportPreviewRow.vue'
import VirtualList from './VirtualList.vue'

const props = defineProps<{
  visible: boolean
  record: ImportRecord
  accounts: Account[]
  categories: BillCategory[]
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import', record: ImportRecord): void
  (e: 'rollback', record: ImportRecord): void
  (e: 'delete', recordId: string): void
  (e: 'open-rule-dialog', form: ImportRuleFormData, options?: { onSaved?: () => void }): void
}>()

// 点击弹框外关闭 + ESC 关闭
const overlayRef = ref<HTMLDivElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

function handleDocumentClick(e: MouseEvent) {
  if (!props.visible || !overlayRef.value) return
  if (e.target === overlayRef.value) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleDocumentClick)
})

const { rules: importRules, applyRules } = useImportRules()
const { updateRecordItems } = useImportRecords()
const { confirm } = useConfirm()

const importing = ref(false)
const filter = ref<'all' | 'unmatched' | 'matched' | 'duplicate'>('all')
const filterOptions = [
  { value: 'all' as const, label: '全部' },
  { value: 'unmatched' as const, label: '未完善' },
  { value: 'matched' as const, label: '已完善' },
  { value: 'duplicate' as const, label: '重复' }
]

function isIncomplete(row: ImportRecordItem): boolean {
  if ((row.type === 'income' || row.type === 'expense') && !row.categoryId) return true
  if (row.type === 'expense' && !row.fromAccountId) return true
  if (row.type === 'income' && !row.toAccountId) return true
  if ((row.type === 'transfer' || row.type === 'debt') && (!row.fromAccountId || !row.toAccountId)) return true
  return false
}

const isPending = computed(() => props.record.status === 'pending')

// 本地编辑态（pending 时使用）
const localItems = ref<ImportRecordItem[]>([])

watch(() => props.record.id, (id) => {
  if (id) {
    localItems.value = props.record.items.map(item => ({ ...item }))
    filter.value = 'all'
  }
}, { immediate: true })

// 防抖保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (isPending.value) {
      updateRecordItems(props.record.id, localItems.value.map(i => ({ ...i })))
    }
  }, 500)
}

const counts = computed(() => ({
  all: localItems.value.length,
  unmatched: localItems.value.filter(i => !i.skipped && !i.duplicate && isIncomplete(i)).length,
  matched: localItems.value.filter(i => !i.skipped && !i.duplicate && !isIncomplete(i)).length,
  duplicate: localItems.value.filter(i => i.duplicate).length
}))

const filteredItems = computed(() => {
  switch (filter.value) {
    case 'unmatched':
      return localItems.value.filter(i => !i.skipped && !i.duplicate && isIncomplete(i))
    case 'matched':
      return localItems.value.filter(i => !i.skipped && !i.duplicate && !isIncomplete(i))
    case 'duplicate':
      return localItems.value.filter(i => i.duplicate)
    default:
      return localItems.value
  }
})

const allSelected = computed(() => {
  const eligible = filteredItems.value.filter(i => !i.duplicate && !i.skipped)
  return eligible.length > 0 && eligible.every(i => i.selected)
})

const selectedCount = computed(() => localItems.value.filter(i => i.selected && !i.skipped && !i.duplicate).length)
const skippedCount = computed(() => localItems.value.filter(i => i.skipped || i.duplicate || !i.selected).length)
const canImport = computed(() => selectedCount.value > 0)

function ruleById(id: string | null | undefined): ImportRule | null {
  if (!id) return null
  return importRules.value.find(r => r.id === id) ?? null
}

function onItemUpdate(rawIndex: number, value: ImportRecordItem) {
  const idx = localItems.value.findIndex(i => i.rawIndex === rawIndex)
  if (idx !== -1) {
    localItems.value[idx] = value
    scheduleSave()
  }
}

function toggleAll() {
  const next = !allSelected.value
  const idsInFilter = new Set(filteredItems.value.map(i => i.rawIndex))
  localItems.value = localItems.value.map(i => {
    if (!idsInFilter.has(i.rawIndex)) return i
    if (i.duplicate || i.skipped) return i
    return { ...i, selected: next }
  })
  scheduleSave()
}

async function promptApplyRuleAfterSave() {
  const yes = await confirm({
    title: '应用规则',
    message: '规则已保存，是否立即应用规则到当前导入记录？',
    confirmText: '应用',
    cancelText: '暂不'
  })
  if (yes) {
    applyAllRules()
  }
}

function openRuleOverlay(item: ImportRecordItem) {
  const counterparty = (item.counterparty || '').trim()
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchMode: 'fuzzy',
    pattern: counterparty,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { onSaved: promptApplyRuleAfterSave })
}

function openCounterpartyRule(item: ImportRecordItem) {
  const counterparty = (item.counterparty || '').trim()
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchMode: 'fuzzy',
    pattern: counterparty,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { onSaved: promptApplyRuleAfterSave })
}

function openPaymentMethodRule(item: ImportRecordItem) {
  const paymentMethod = (item.paymentMethod || '').trim()
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchMode: 'fuzzy',
    pattern: paymentMethod,
    categoryId: '',
    accountId: item.myAccountId || '',
    billType: undefined,
    priority: 100,
    enabled: true
  }, { onSaved: promptApplyRuleAfterSave })
}

function openDescriptionRule(item: ImportRecordItem) {
  const description = (item.description || '').trim()
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'description',
    matchMode: 'fuzzy',
    pattern: description,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { onSaved: promptApplyRuleAfterSave })
}

function onImport() {
  importing.value = true
  // 把本地编辑态写回 record
  const updatedRecord: ImportRecord = {
    ...props.record,
    items: localItems.value.map(i => ({ ...i })),
    selectedCount: selectedCount.value
  }
  emit('import', updatedRecord)
}

function setImporting(val: boolean) {
  importing.value = val
}

defineExpose({ setImporting })

function onRollback() {
  emit('rollback', props.record)
}

function onDelete() {
  emit('delete', props.record.id)
}

function applyAllRules() {
  const source = props.record.source
  let changed = false

  localItems.value = localItems.value.map(item => {
    if (item.skipped || item.duplicate) return item

    const result = applyRules(item as any, source)
    if (!result) return item

    const updates: Partial<ImportRecordItem> = {}

    if (result.counterpartyRule) {
      updates.matchedRuleId = result.counterpartyRule.id
      if (result.counterpartyRule.categoryId) {
        updates.categoryId = result.counterpartyRule.categoryId
      }
      if (result.counterpartyRule.accountId) {
        updates.matchedAccountId = result.counterpartyRule.accountId
      }
      if (result.counterpartyRule.billType) {
        updates.type = result.counterpartyRule.billType
      }
    }

    if (result.paymentMethodRule) {
      updates.paymentMethodRuleId = result.paymentMethodRule.id
      if (result.paymentMethodRule.accountId) {
        updates.myAccountId = result.paymentMethodRule.accountId
      }
      if (!updates.type && result.paymentMethodRule.billType) {
        updates.type = result.paymentMethodRule.billType
      }
    }

    if (result.descriptionRule) {
      updates.descriptionRuleId = result.descriptionRule.id
      if (result.descriptionRule.categoryId) {
        updates.categoryId = result.descriptionRule.categoryId
      }
      if (result.descriptionRule.accountId) {
        updates.matchedAccountId = result.descriptionRule.accountId
      }
      if (!updates.type && result.descriptionRule.billType) {
        updates.type = result.descriptionRule.billType
      }
    }

    if (Object.keys(updates).length > 0) {
      changed = true
      const next = { ...item, ...updates }

      // 根据匹配账户推导 from/to
      const counterpartyAccount = props.accounts.find(a => a.id === next.matchedAccountId) || null
      const myAccount = props.accounts.find(a => a.id === next.myAccountId) || null
      const suggestion = suggestAccountIds(
        counterpartyAccount,
        myAccount,
        next.direction,
        next.type || item.type || 'expense'
      )
      if (suggestion.fromAccountId) next.fromAccountId = suggestion.fromAccountId
      if (suggestion.toAccountId) next.toAccountId = suggestion.toAccountId

      return next
    }
    return item
  })

  if (changed) {
    scheduleSave()
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sourceLabel(s: ImportSource): string {
  return s === 'alipay' ? '支付宝' : s === 'wechat' ? '微信' : s
}

function statusLabel(s: ImportRecordStatus): string {
  switch (s) {
    case 'pending': return '待导入'
    case 'success': return '成功'
    case 'partial': return '部分成功'
    case 'failed': return '失败'
    case 'rolled_back': return '已回滚'
    default: return s
  }
}

function itemStatusLabel(s: ImportRecordItem['status']): string {
  switch (s) {
    case 'pending': return '待导入'
    case 'created': return '已导入'
    case 'skipped_duplicate': return '跳过(重复)'
    case 'skipped_unselected': return '跳过(未选)'
    case 'failed': return '失败'
    default: return s
  }
}
</script>

<style scoped>
.record-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  overflow-y: auto;
}
.record-modal-card {
  width: 100%;
  max-width: 760px;
  max-height: 85vh;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.85) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.record-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.record-modal-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.close-btn {
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.record-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.record-modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 12px 20px 16px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
/* Transition */
.record-modal-enter-active,
.record-modal-leave-active {
  transition: opacity 0.2s ease;
}
.record-modal-enter-active .record-modal-card,
.record-modal-leave-active .record-modal-card {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.record-modal-enter-from,
.record-modal-leave-to {
  opacity: 0;
}
.record-modal-enter-from .record-modal-card,
.record-modal-leave-to .record-modal-card {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}
.cancel-btn,
.confirm-btn,
.danger-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}
.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
}
.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.confirm-btn.danger {
  background: rgb(255, 59, 48);
}
.danger-btn {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
.secondary-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.record-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
}
.meta-row {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.86);
}
.meta-label {
  flex-shrink: 0;
  width: 56px;
  color: rgba(60, 60, 67, 0.6);
  font-size: 12px;
}
.history-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.history-status.pending {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.history-status.success {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.history-status.partial {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.history-status.failed {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}
.history-status.rolled_back {
  background: rgba(60, 60, 67, 0.12);
  color: rgba(60, 60, 67, 0.6);
}
.preview-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: rgba(60, 60, 67, 0.78);
  padding: 6px 0;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.filter-tab {
  padding: 4px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}
.filter-tab.active {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.4);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.btn-link {
  border: none;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.btn-link:hover {
  text-decoration: underline;
}
.empty-tip {
  padding: 24px;
  text-align: center;
  color: rgba(60, 60, 67, 0.5);
  font-size: 12px;
}
.preview-list {
  max-height: 50vh;
}
.record-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.record-item {
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.record-item.failed {
  border-color: rgba(255, 59, 48, 0.3);
  background: rgba(255, 59, 48, 0.04);
}
.record-item.skipped_duplicate,
.record-item.skipped_unselected {
  opacity: 0.7;
}
.item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.item-counterparty {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.86);
}
.item-amount {
  font-weight: 600;
}
.item-amount.in {
  color: rgb(52, 199, 89);
}
.item-amount.out {
  color: rgb(255, 59, 48);
}
.item-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: rgba(60, 60, 67, 0.6);
}
.item-status {
  font-weight: 500;
}
.item-error {
  font-size: 11px;
  color: rgb(255, 59, 48);
}
</style>