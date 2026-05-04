<template>
  <div class="form-body">
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
        />
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
          />
        </div>
        <div class="rule-overlay-footer">
          <button type="button" class="cancel-btn" @click="closeRuleOverlay">取消</button>
          <button type="button" class="confirm-btn" @click="saveRuleOverlay">保存规则</button>
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
  BillFormData
} from '~/types/bill'
import { decodeCsvFile, parseAlipayCsv, parseWechatCsv, dedupeKey } from '~/services/csvImport'
import { useImportRules } from '~/composables/useImportRules'
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
  (e: 'submit', bills: BillFormData[]): void
  (e: 'cancel'): void
  (e: 'rule-created', rule: ImportRule): void
}>()

const { rules: importRules, applyRules, createImportRule } = useImportRules()

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

const source = ref<ImportSource>('alipay')
const rows = ref<IPRow[]>([])
const parseError = ref('')
const parsing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const filter = ref<FilterValue>('all')
const ruleOverlayVisible = ref(false)
const ruleOverlayForm = ref<ImportRuleFormData>(emptyRuleForm())

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

function toIsoMinutes(date: string): string {
  return date.length >= 16 ? date.slice(0, 16).replace(' ', 'T') : date
}

function rowToBillFormData(row: IPRow): BillFormData {
  return {
    type: row.type,
    amount: row.amount,
    currency: 'CNY',
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    categoryId: row.categoryId,
    title: row.title || row.counterparty || '导入账单',
    description: row.description,
    date: toIsoMinutes(row.date),
    debtSubtype: row.debtSubtype,
    relatedPersonId: ''
  }
}

function getValidBills(): BillFormData[] {
  return rows.value
    .filter(r => r.selected && !r.duplicate)
    .map(rowToBillFormData)
}

function reset() {
  rows.value = []
  parseError.value = ''
  parsing.value = false
  filter.value = 'all'
  ruleOverlayVisible.value = false
  ruleOverlayForm.value = emptyRuleForm()
  if (fileInput.value) fileInput.value.value = ''
}

defineExpose({
  getValidBills,
  reset
})
</script>

<style scoped>
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
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
</style>
