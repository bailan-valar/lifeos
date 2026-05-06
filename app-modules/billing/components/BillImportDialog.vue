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
          @click="emit('view-record', record.id)"
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
  </div>
</template>

<script setup lang="ts">
import type {
  Account,
  BillCategory,
  BillType,
  ImportSource,
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
import { generateId, now } from '~/services/db'
import {
  matchAccountByCounterparty,
  matchAccountByPaymentMethod,
  inferBillType,
  inferAlipayBillType,
  inferDebtSubtype,
  suggestAccountIds
} from '~/composables/useAccountMatcher'

const props = defineProps<{
  noteId: string
  accounts: Account[]
  categories: BillCategory[]
  existingFingerprints: Set<string>
}>()

const emit = defineEmits<{
  (e: 'record-created', record: ImportRecord): void
  (e: 'view-record', recordId: string): void
  (e: 'open-rule-dialog', form: ImportRuleFormData): void
  (e: 'create-category', data: { name: string; type: CategoryType; parentId?: string }): void
  (e: 'open-category-form', data: { type: CategoryType; defaultParentId?: string; defaultName?: string }): void
  (e: 'create-account', data: AccountFormData): void
  (e: 'tab-change', tab: 'import' | 'history'): void
}>()

const { rules: importRules, applyRules } = useImportRules()
const { records, loading: recordsLoading, insertRecord } = useImportRecords()

const sourceOptions: { value: ImportSource; label: string }[] = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' }
]

const activeTab = ref<'import' | 'history'>('import')
const source = ref<ImportSource>('alipay')
const parseError = ref('')
const parsing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function buildImportRecordItem(parsed: CsvParsedRow): ImportRecordItem {
  const result = applyRules(parsed, source.value)
  const matchedRule = result?.rule ?? null

  let counterpartyAccount = matchAccountByCounterparty(parsed.counterparty, props.accounts)
  let myAccount = matchAccountByPaymentMethod(parsed.paymentMethod || '', props.accounts)

  if (matchedRule?.accountId) {
    const ruleAccount = props.accounts.find(a => a.id === matchedRule.accountId)
    if (ruleAccount) {
      if (result?.matchedField === 'paymentMethod') {
        myAccount = ruleAccount
      } else {
        counterpartyAccount = ruleAccount
      }
    }
  }

  let billType: BillType
  let direction = parsed.direction
  let skipped = false
  let skipReason: string | undefined

  if (source.value === 'alipay' && parsed.rawPaymentDirection) {
    const inferred = inferAlipayBillType(parsed, counterpartyAccount)
    billType = matchedRule?.billType ?? inferred.type
    direction = inferred.direction
    skipped = inferred.skipped
    skipReason = inferred.skipReason
  } else {
    billType = inferBillType(counterpartyAccount, parsed.direction, matchedRule?.billType)
  }

  const debtSubtype = inferDebtSubtype(direction)
  const fingerprint = dedupeKey(parsed.date, parsed.amount, parsed.counterparty)
  const isDuplicate = props.existingFingerprints.has(fingerprint)

  const suggestion = suggestAccountIds(counterpartyAccount, myAccount, direction, billType)

  const categoryId = matchedRule?.categoryId
    || (counterpartyAccount?.type === 'merchant' ? counterpartyAccount.categoryId : undefined)
    || ''

  return {
    rawIndex: parsed.rawIndex,
    date: parsed.date,
    counterparty: parsed.counterparty,
    description: parsed.description,
    amount: parsed.amount,
    direction,
    fingerprint,
    status: 'pending',
    selected: !isDuplicate && !skipped,
    duplicate: isDuplicate,
    skipped,
    skipReason,
    matchedRuleId: matchedRule?.id ?? null,
    matchedAccountId: counterpartyAccount?.id ?? null,
    myAccountId: myAccount?.id ?? null,
    type: billType,
    debtSubtype,
    categoryId,
    fromAccountId: suggestion.fromAccountId || '',
    toAccountId: suggestion.toAccountId || '',
    paymentMethod: parsed.paymentMethod,
    rawType: parsed.rawType
  }
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  parseError.value = ''
  parsing.value = true

  try {
    const text = await decodeCsvFile(file, source.value)
    const parsedRows = source.value === 'alipay' ? parseAlipayCsv(text) : parseWechatCsv(text)
    const items = parsedRows.map(buildImportRecordItem)

    const record: ImportRecord = {
      id: generateId(),
      noteId: props.noteId,
      source: source.value,
      fileName: file.name,
      fileSize: file.size,
      totalParsed: items.length,
      selectedCount: items.filter(i => i.selected && !i.skipped && !i.duplicate).length,
      successCount: 0,
      skippedCount: 0,
      failedCount: 0,
      status: 'pending',
      billIds: [],
      items,
      startedAt: now(),
      finishedAt: '',
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }

    await insertRecord(record)
    emit('record-created', record)

    if (fileInput.value) fileInput.value.value = ''
  } catch (e) {
    parseError.value = e instanceof Error ? e.message : String(e)
  } finally {
    parsing.value = false
  }
}

function setTab(tab: 'import' | 'history') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  emit('tab-change', tab)
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

function reset() {
  parseError.value = ''
  parsing.value = false
  activeTab.value = 'import'
  if (fileInput.value) fileInput.value.value = ''
}

defineExpose({
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
.empty-tip {
  padding: 24px;
  text-align: center;
  color: rgba(60, 60, 67, 0.5);
  font-size: 12px;
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
</style>
