<template>
  <div class="form-body">
    <div class="tab-bar">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'import' }"
        @click="setTab('import')"
      >
        导入
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'history' }"
        @click="setTab('history')"
      >
        历史
        <span v-if="records.length" class="tab-badge">{{ records.length }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'import'" class="tab-pane">
      <div class="form-group">
        <label class="form-label">来源</label>
        <div class="type-selector">
          <button
            v-for="s in sourceOptions"
            :key="s.value"
            type="button"
            class="type-btn"
            :class="{ active: source === s.value }"
            @click="source = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">CSV 文件</label>
        <input ref="fileInput" type="file" accept=".csv" class="file-input" @change="onFileChange" />
        <div v-if="parsing" class="form-hint">解析中...</div>
        <div v-if="parseError" class="form-hint warn">{{ parseError }}</div>
        <div v-if="rows.length" class="form-hint">
          已解析 {{ rows.length }} 条记录,可在下方调整后保存。
        </div>
      </div>

      <div v-if="rows.length" class="preview-wrap">
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
        <div v-if="filteredRows.length === 0" class="empty-tip">当前筛选下无记录</div>
        <div v-else class="preview-list">
          <ImportPreviewRow
            v-for="row in filteredRows"
            :key="row.rawIndex"
            :row="row"
            :accounts="accounts"
            :categories="categories"
            :matched-rule="ruleById(row.matchedRuleId)"
            @update:row="(v) => onRowUpdate(row.rawIndex, v)"
            @save-as-rule="openRuleOverlay"
            @create-category="emit('create-category', $event)"
            @open-category-form="emit('open-category-form', $event)"
            @create-account="emit('create-account', $event)"
          />
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'history'" class="tab-pane">
      <div v-if="recordsLoading" class="empty-tip">加载中...</div>
      <div v-else-if="records.length === 0" class="empty-tip">暂无导入记录</div>
      <div v-else class="history-list">
        <button
          v-for="record in records"
          :key="record.id"
          type="button"
          class="history-card"
          :class="{ rolled: record.status === 'rolled_back' }"
          @click="openRecord(record.id)"
        >
          <div class="history-row">
            <span class="history-time">{{ formatDateTime(record.createdAt) }}</span>
            <span class="history-source">{{ sourceLabel(record.source) }}</span>
            <span class="history-status" :class="record.status">{{ statusLabel(record.status) }}</span>
          </div>
          <div class="history-row history-meta">
            <span class="history-file" :title="record.fileName">{{ record.fileName || '-' }}</span>
            <span class="history-stats">
              成功 {{ record.successCount }} · 跳过 {{ record.skippedCount }} · 失败 {{ record.failedCount }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div v-if="ruleOverlayVisible" class="rule-overlay" @click="closeRuleOverlay">
      <div class="rule-overlay-card" @click.stop>
        <div class="rule-overlay-header">
          <h4>保存为规则</h4>
          <button type="button" class="close-btn" @click="closeRuleOverlay">
            <Icon name="solar:close-circle-linear" size="18" />
          </button>
        </div>
        <div class="rule-overlay-body">
          <ImportRuleForm
            v-model="ruleOverlayForm"
            :accounts="accounts"
            :categories="categories"
            @create-category="emit('create-category', $event)"
            @open-category-form="emit('open-category-form', $event)"
            @create-account="emit('create-account', $event)"
          />
        </div>
        <div class="rule-overlay-footer">
          <button type="button" class="cancel-btn" @click="closeRuleOverlay">取消</button>
          <button type="button" class="confirm-btn" @click="saveRuleOverlay">保存规则</button>
        </div>
      </div>
    </div>

    <div v-if="viewingRecord" class="rule-overlay" @click="closeRecord">
      <div class="rule-overlay-card record-card" @click.stop>
        <div class="rule-overlay-header">
          <h4>导入详情</h4>
          <button type="button" class="close-btn" @click="closeRecord">
            <Icon name="solar:close-circle-linear" size="18" />
          </button>
        </div>
        <div class="rule-overlay-body">
          <div class="record-meta">
            <div class="meta-row">
              <span class="meta-label">时间</span>
              <span>{{ formatDateTime(viewingRecord.createdAt) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">来源</span>
              <span>{{ sourceLabel(viewingRecord.source) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">文件</span>
              <span>{{ viewingRecord.fileName || '-' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">状态</span>
              <span class="history-status" :class="viewingRecord.status">{{ statusLabel(viewingRecord.status) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">统计</span>
              <span>
                总 {{ viewingRecord.totalParsed }} · 选中 {{ viewingRecord.selectedCount }} ·
                成功 {{ viewingRecord.successCount }} · 跳过 {{ viewingRecord.skippedCount }} ·
                失败 {{ viewingRecord.failedCount }}
              </span>
            </div>
          </div>
          <div class="record-items">
            <div
              v-for="item in viewingRecord.items"
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
        </div>
        <div class="rule-overlay-footer">
          <button type="button" class="cancel-btn" @click="closeRecord">关闭</button>
          <button
            v-if="viewingRecord.status !== 'rolled_back' && viewingRecord.billIds.length > 0"
            type="button"
            class="confirm-btn danger"
            @click="onRollback"
          >
            一键回滚
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  ImportSource,
  ImportPreviewRow as IPRow,
  ImportRuleFormData,
  ImportRule,
  CsvParsedRow,
  CategoryType,
  AccountFormData,
  ImportRecord,
  ImportRecordItem,
  ImportRecordStatus
} from '~/types/bill'
import { decodeCsvFile, parseAlipayCsv, parseWechatCsv, dedupeKey } from '~/services/csvImport'
import { useImportRules } from '~/composables/useImportRules'
import { useImportRecords } from '~/composables/useImportRecords'
import { useConfirm } from '~/composables/useConfirm'
import {
  matchAccountByCounterparty,
  inferBillType,
  inferDebtSubtype,
  suggestAccountIds
} from '~/composables/useAccountMatcher'
import ImportPreviewRow from './ImportPreviewRow.vue'
import ImportRuleForm from './ImportRuleForm.vue'

const props = defineProps<{
  accounts: Account[]
  categories: BillCategory[]
  existingFingerprints: Set<string>
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'rule-created', rule: ImportRule): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string }): void
  (e: 'create-account', data: AccountFormData): void
  (e: 'tab-change', tab: 'import' | 'history'): void
}>()

const { rules: importRules, applyRules, createImportRule } = useImportRules()
const { records, loading: recordsLoading, getById, rollback } = useImportRecords()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()

const sourceOptions: { value: ImportSource; label: string }[] = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' }
]

type FilterValue = 'all' | 'unmatched' | 'matched' | 'duplicate'
const filterOptions: { value: FilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unmatched', label: '未匹配' },
  { value: 'matched', label: '已匹配' },
  { value: 'duplicate', label: '重复' }
]

function emptyRuleForm(): ImportRuleFormData {
  return {
    name: '',
    source: 'all',
    matchMode: 'fuzzy',
    pattern: '',
    categoryId: '',
    fromAccountId: '',
    toAccountId: '',
    priority: 100,
    enabled: true
  }
}

const activeTab = ref<'import' | 'history'>('import')
const source = ref<ImportSource>('alipay')
const rows = ref<IPRow[]>([])
const parseError = ref('')
const parsing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const filter = ref<FilterValue>('all')
const ruleOverlayVisible = ref(false)
const ruleOverlayForm = ref<ImportRuleFormData>(emptyRuleForm())
const fileName = ref('')
const fileSize = ref(0)
const viewingRecordId = ref<string | null>(null)

const viewingRecord = computed<ImportRecord | null>(() =>
  viewingRecordId.value ? getById(viewingRecordId.value) : null
)

const counts = computed(() => ({
  all: rows.value.length,
  unmatched: rows.value.filter(r => !r.matchedRuleId && !r.matchedAccountId && !r.duplicate).length,
  matched: rows.value.filter(r => (r.matchedRuleId || r.matchedAccountId) && !r.duplicate).length,
  duplicate: rows.value.filter(r => r.duplicate).length
}))

const filteredRows = computed(() => {
  switch (filter.value) {
    case 'unmatched':
      return rows.value.filter(r => !r.matchedRuleId && !r.matchedAccountId && !r.duplicate)
    case 'matched':
      return rows.value.filter(r => (r.matchedRuleId || r.matchedAccountId) && !r.duplicate)
    case 'duplicate':
      return rows.value.filter(r => r.duplicate)
    default:
      return rows.value
  }
})

const allSelected = computed(() => {
  const eligible = filteredRows.value.filter(r => !r.duplicate)
  return eligible.length > 0 && eligible.every(r => r.selected)
})

function ruleById(id: string | null): ImportRule | null {
  if (!id) return null
  return importRules.value.find(r => r.id === id) ?? null
}

function rowToParsed(r: IPRow): CsvParsedRow {
  return {
    rawIndex: r.rawIndex,
    date: r.date,
    counterparty: r.counterparty,
    description: r.description,
    amount: r.amount,
    direction: r.direction,
    rawType: r.rawType
  }
}

function buildPreviewRow(parsed: CsvParsedRow): IPRow {
  const matchedRule = applyRules(parsed, source.value)
  const matchedAccount = matchAccountByCounterparty(parsed.counterparty, props.accounts)
  const billType = inferBillType(matchedAccount, parsed.direction, matchedRule?.billType)
  const debtSubtype = inferDebtSubtype(parsed.direction)
  const fingerprint = dedupeKey(parsed.date, parsed.amount, parsed.counterparty)
  const isDuplicate = props.existingFingerprints.has(fingerprint)
  const suggestion = suggestAccountIds(matchedAccount, parsed.direction, billType)
  const fromAccountId = matchedRule?.fromAccountId || suggestion.fromAccountId || ''
  const toAccountId = matchedRule?.toAccountId || suggestion.toAccountId || ''
  const categoryId = matchedRule?.categoryId || ''

  return {
    ...parsed,
    selected: !isDuplicate,
    duplicate: isDuplicate,
    matchedRuleId: matchedRule?.id ?? null,
    matchedAccountId: matchedAccount?.id ?? null,
    type: billType,
    debtSubtype,
    categoryId,
    fromAccountId,
    toAccountId,
    title: parsed.counterparty || parsed.description || '导入账单'
  }
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  parseError.value = ''
  parsing.value = true
  rows.value = []
  fileName.value = file.name
  fileSize.value = file.size

  try {
    const text = await decodeCsvFile(file, source.value)
    const parsedRows = source.value === 'alipay' ? parseAlipayCsv(text) : parseWechatCsv(text)
    rows.value = parsedRows.map(buildPreviewRow)
  } catch (e) {
    parseError.value = e instanceof Error ? e.message : String(e)
  } finally {
    parsing.value = false
  }
}

function onRowUpdate(rawIndex: number, value: IPRow) {
  rows.value = rows.value.map(r => (r.rawIndex === rawIndex ? value : r))
}

function toggleAll() {
  const next = !allSelected.value
  const idsInFilter = new Set(filteredRows.value.map(r => r.rawIndex))
  rows.value = rows.value.map(r => {
    if (!idsInFilter.has(r.rawIndex)) return r
    if (r.duplicate) return r
    return { ...r, selected: next }
  })
}

function openRuleOverlay(row: IPRow) {
  const counterparty = row.counterparty.trim()
  ruleOverlayForm.value = {
    name: counterparty || '新规则',
    source: source.value,
    matchMode: 'fuzzy',
    pattern: counterparty,
    categoryId: row.categoryId,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    billType: row.type,
    priority: 100,
    enabled: true
  }
  ruleOverlayVisible.value = true
}

function closeRuleOverlay() {
  ruleOverlayVisible.value = false
}

async function saveRuleOverlay() {
  const form = ruleOverlayForm.value
  if (!form.name.trim() || !form.pattern.trim()) return
  const created = await createImportRule({
    ...form,
    name: form.name.trim(),
    pattern: form.pattern.trim()
  })
  ruleOverlayVisible.value = false
  ruleOverlayForm.value = emptyRuleForm()
  rows.value = rows.value.map(r => {
    if (r.duplicate) return r
    const parsed = rowToParsed(r)
    const matched = applyRules(parsed, source.value)
    if (matched && matched.id !== r.matchedRuleId) {
      return buildPreviewRow(parsed)
    }
    return r
  })
  emit('rule-created', created)
}

function setTab(tab: 'import' | 'history') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  emit('tab-change', tab)
}

function openRecord(id: string) {
  viewingRecordId.value = id
}

function closeRecord() {
  viewingRecordId.value = null
}

async function onRollback() {
  const record = viewingRecord.value
  if (!record) return
  const ok = await confirm(`确定回滚此次导入?将删除 ${record.billIds.length} 条账单并恢复账户余额。`)
  if (!ok) return
  try {
    const { rolledBack, missing } = await rollback(record.id)
    if (missing > 0) {
      showSuccess(`已回滚 ${rolledBack} 条,${missing} 条已不存在`)
    } else {
      showSuccess(`已回滚 ${rolledBack} 条`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
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
    case 'success': return '成功'
    case 'partial': return '部分成功'
    case 'failed': return '失败'
    case 'rolled_back': return '已回滚'
    default: return s
  }
}

function itemStatusLabel(s: ImportRecordItem['status']): string {
  switch (s) {
    case 'created': return '已写入'
    case 'skipped_duplicate': return '跳过(重复)'
    case 'skipped_unselected': return '跳过(未选)'
    case 'failed': return '失败'
    default: return s
  }
}

function getImportPayload(): { rows: IPRow[]; fileName: string; fileSize: number; source: ImportSource } {
  return {
    rows: rows.value,
    fileName: fileName.value,
    fileSize: fileSize.value,
    source: source.value
  }
}

function reset() {
  rows.value = []
  parseError.value = ''
  parsing.value = false
  filter.value = 'all'
  ruleOverlayVisible.value = false
  ruleOverlayForm.value = emptyRuleForm()
  fileName.value = ''
  fileSize.value = 0
  viewingRecordId.value = null
  activeTab.value = 'import'
  if (fileInput.value) fileInput.value.value = ''
}

defineExpose({
  getImportPayload,
  reset,
  activeTab
})
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.tab-btn {
  position: relative;
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-btn:hover {
  color: rgba(0, 0, 0, 0.86);
}
.tab-btn.active {
  color: rgb(0, 122, 255);
  border-bottom-color: rgb(0, 122, 255);
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}
.type-selector {
  display: flex;
  gap: 8px;
}
.type-btn {
  flex: 1;
  padding: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.type-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.file-input {
  padding: 8px;
  font-size: 13px;
}
.form-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}
.form-hint.warn {
  color: rgb(255, 59, 48);
}
.preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 50vh;
  overflow-y: auto;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
}
.history-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}
.history-card:hover {
  background: rgba(0, 122, 255, 0.04);
  border-color: rgba(0, 122, 255, 0.3);
}
.history-card.rolled {
  opacity: 0.6;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-wrap: wrap;
}
.history-time {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.86);
}
.history-source {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
  font-size: 11px;
}
.history-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
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
.history-meta {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
  justify-content: space-between;
}
.history-file {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.rule-overlay {
  position: absolute;
  inset: -20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 12px;
  z-index: 10;
  overflow-y: auto;
}
.rule-overlay-card {
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.96);
  border: 0.5px solid rgba(60, 60, 67, 0.16);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}
.record-card {
  max-width: 600px;
}
.rule-overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.rule-overlay-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
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
.rule-overlay-body {
  padding: 16px 18px;
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rule-overlay-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.cancel-btn,
.confirm-btn {
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
.confirm-btn.danger {
  background: rgb(255, 59, 48);
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
