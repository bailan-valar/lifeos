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
      <div class="tab-bar-spacer" />
      <button
        type="button"
        class="tab-btn tab-btn-rule"
        @click="emit('open-rules')"
      >
        <Icon name="solar:filter-linear" size="14" />
        规则管理
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
            @click="onSourceChange(s.value)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-if="source === 'cmb' || source === 'cmb_credit'" class="form-group">
        <label class="form-label">默认账户</label>
        <AccountPicker
          v-model="defaultAccountId"
          :accounts="props.accounts"
          placeholder="不设置（逐条匹配）"
          clearable
        />
        <div class="form-hint">设置后，未匹配规则的交易将统一使用此账户</div>
      </div>

      <div v-if="source === 'email'" class="email-import-wrapper">
        <EmailImportPanel
          :note-id="props.noteId"
          @file-loaded="handleEmailFileLoaded"
        />
      </div>

      <div v-else class="form-group">
        <label class="form-label">账单文件</label>
        <input ref="fileInput" type="file" :accept="fileAccept" class="file-input" @change="onFileChange" />
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
              <template v-if="record.editingDurationMs">· ⏱️ {{ formatDuration(record.editingDurationMs) }}</template>
            </span>
          </div>
          <div v-if="record.billStartDate || record.billEndDate" class="history-row history-date-range">
            <span class="date-range-label">账单时间</span>
            <span class="date-range-value">{{ formatDateRange(record.billStartDate, record.billEndDate) }}</span>
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
  ImportRecord,
  ImportRecordItem,
  ImportRecordStatus
} from '~/types/bill'
import { decodeCsvFile, parseAlipayCsv, parseWechatCsv, parseWechatXlsx, parseCmbPdf, parseCmbCreditPdf, buildExactDuplicateFingerprint, buildDuplicateFingerprint, dedupeKey } from '~/services/csvImport'
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
import AccountPicker from './AccountPicker.vue'
import EmailImportPanel from './EmailImportPanel.vue'

/**
 * 中间数据：账户匹配结果
 */
interface AccountMatchResult {
  counterpartyAccount: Account | null
  myAccount: Account | null
  counterpartyRule: ImportRule | null
  paymentMethodRule: ImportRule | null
  descriptionRule: ImportRule | null
  rawTypeRule: ImportRule | null
}

const props = defineProps<{
  noteId: string
  accounts: Account[]
  categories: BillCategory[]
  existingFingerprints: Set<string>
  /**
   * 按基础指纹统计的数量（用于计算序号）
   * key: "date|amount|fromId?|toId?", value: 已存在数量
   */
  existingFingerprintCounts: Map<string, number>
}>()

const emit = defineEmits<{
  (e: 'record-created', record: ImportRecord): void
  (e: 'view-record', recordId: string): void
  (e: 'tab-change', tab: 'import' | 'history'): void
  (e: 'open-rules'): void
}>()

const { rules: importRules, applyRules } = useImportRules()
const { records, loading: recordsLoading, insertRecord } = useImportRecords()

const sourceOptions: { value: ImportSource; label: string }[] = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'cmb', label: '招商银行储蓄卡' },
  { value: 'cmb_credit', label: '招商信用卡' },
  { value: 'email', label: '邮件' }
]

const activeTab = ref<'import' | 'history'>('import')
const source = ref<ImportSource>('alipay')
const parseError = ref('')
const parsing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const defaultAccountId = ref('')

const fileAccept = computed(() => {
  if (source.value === 'cmb' || source.value === 'cmb_credit') return '.pdf'
  return '.csv,.xlsx'
})

// 根据来源筛选默认账户的可选账户类型
const defaultAccountSubtypes = computed(() => {
  if (source.value === 'cmb') return ['debit_card']
  if (source.value === 'cmb_credit') return ['credit_card']
  return undefined
})

// 可用于默认账户的账户列表
const eligibleDefaultAccounts = computed(() => {
  if (!defaultAccountSubtypes.value) return []
  return props.accounts.filter(a => a.type === 'personal' && defaultAccountSubtypes.value?.includes(a.subtype || 'cash'))
})

/**
 * 匹配账户和规则（不生成导入项）
 */
function matchAccount(parsed: CsvParsedRow): AccountMatchResult {
  const result = applyRules(parsed, source.value)
  const counterpartyRule = result?.counterpartyRule ?? null
  const paymentMethodRule = result?.paymentMethodRule ?? null
  const descriptionRule = result?.descriptionRule ?? null
  const rawTypeRule = result?.rawTypeRule ?? null

  let counterpartyAccount = matchAccountByCounterparty(parsed.counterparty, props.accounts)
  let myAccount = matchAccountByPaymentMethod(parsed.paymentMethod || '', props.accounts)

  // 交易对方匹配到的规则 → 对方账户(由 suggestAccountIds 映射为入账账户)
  if (counterpartyRule?.accountId) {
    const ruleAccount = props.accounts.find(a => a.id === counterpartyRule.accountId)
    if (ruleAccount) counterpartyAccount = ruleAccount
  }

  // 收/付款方式匹配到的规则 → 我的账户(由 suggestAccountIds 映射为出账账户)
  if (paymentMethodRule?.accountId) {
    const ruleAccount = props.accounts.find(a => a.id === paymentMethodRule.accountId)
    if (ruleAccount) myAccount = ruleAccount
  }

  // 默认账户 → 我的账户（仅在未通过规则匹配时使用）
  if (!myAccount && defaultAccountId.value) {
    const defaultAccount = props.accounts.find(a => a.id === defaultAccountId.value)
    if (defaultAccount) myAccount = defaultAccount
  }

  // 商品说明匹配到的规则 → 也映射为对方账户（若未设置则不影响）
  if (descriptionRule?.accountId) {
    const ruleAccount = props.accounts.find(a => a.id === descriptionRule.accountId)
    if (ruleAccount && !counterpartyAccount) counterpartyAccount = ruleAccount
  }

  return { counterpartyAccount, myAccount, counterpartyRule, paymentMethodRule, descriptionRule, rawTypeRule }
}

/**
 * 构建导入记录项
 * @param parsed 解析后的行
 * @param matchResult 账户匹配结果
 * @param fingerprintIndex 指纹序号（用于同日多笔相同金额）
 */
function buildImportRecordItem(
  parsed: CsvParsedRow,
  matchResult: AccountMatchResult,
  fingerprintIndex: number = 0
): ImportRecordItem {
  const { counterpartyAccount, myAccount, counterpartyRule, paymentMethodRule, descriptionRule, rawTypeRule } = matchResult

  let billType: BillType
  let direction = parsed.direction
  let skipped = false
  let skipReason: string | undefined

  const overrideBillType = counterpartyRule?.billType ?? paymentMethodRule?.billType ?? descriptionRule?.billType ?? rawTypeRule?.billType

  if (source.value === 'alipay' && parsed.rawPaymentDirection) {
    const inferred = inferAlipayBillType(parsed, counterpartyAccount)
    billType = overrideBillType ?? inferred.type
    direction = inferred.direction
    skipped = inferred.skipped
    skipReason = inferred.skipReason
  } else {
    billType = inferBillType(counterpartyAccount, parsed.direction, overrideBillType)
  }

  const debtSubtype = inferDebtSubtype(direction)

  // 获取建议的账户 ID
  const suggestion = suggestAccountIds(counterpartyAccount, myAccount, direction, billType)

  // 构建指纹：日期|金额|出账账户|入账账户（商户/其他/空账户不参与）
  const fromAccountId = suggestion.fromAccountId || null
  const toAccountId = suggestion.toAccountId || null
  const fromAccountType = fromAccountId ? props.accounts.find(a => a.id === fromAccountId)?.type : undefined
  const toAccountType = toAccountId ? props.accounts.find(a => a.id === toAccountId)?.type : undefined

  // 生成精确指纹
  const exactFingerprint = buildExactDuplicateFingerprint(
    parsed.date,
    parsed.amount,
    fromAccountId,
    toAccountId,
    fromAccountType,
    toAccountType,
    fingerprintIndex
  )

  // 检查是否重复
  const isDuplicate = props.existingFingerprints.has(exactFingerprint)

  // 调试信息
  console.log('[导入重复判断]', {
    日期: parsed.date,
    金额: parsed.amount,
    出账账户: fromAccountId,
    出账账户类型: fromAccountType,
    入账账户: toAccountId,
    入账账户类型: toAccountType,
    序号: fingerprintIndex,
    精确指纹: exactFingerprint,
    是否重复: isDuplicate
  })

  const categoryId = counterpartyRule?.categoryId
    || paymentMethodRule?.categoryId
    || descriptionRule?.categoryId
    || rawTypeRule?.categoryId
    || (counterpartyAccount?.type === 'merchant' ? counterpartyAccount.categoryId : undefined)
    || ''

  return {
    rawIndex: parsed.rawIndex,
    date: parsed.date,
    counterparty: parsed.counterparty,
    description: parsed.description,
    amount: parsed.amount,
    direction,
    fingerprint: exactFingerprint,
    status: 'pending',
    selected: !isDuplicate && !skipped,
    duplicate: isDuplicate,
    skipped,
    skipReason,
    matchedRuleId: counterpartyRule?.id ?? paymentMethodRule?.id ?? descriptionRule?.id ?? rawTypeRule?.id ?? null,
    paymentMethodRuleId: paymentMethodRule?.id ?? null,
    descriptionRuleId: descriptionRule?.id ?? null,
    rawTypeRuleId: rawTypeRule?.id ?? null,
    matchedAccountId: counterpartyAccount?.id ?? null,
    myAccountId: myAccount?.id ?? null,
    type: billType,
    debtSubtype,
    categoryId,
    fromAccountId: suggestion.fromAccountId || '',
    toAccountId: suggestion.toAccountId || '',
    paymentMethod: parsed.paymentMethod,
    rawType: parsed.rawType,
    noteId: props.noteId
  }
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  parseError.value = ''
  parsing.value = true

  try {
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx')
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    let parsedRows: CsvParsedRow[]

    if (source.value === 'cmb') {
      if (!isPdf) {
        throw new Error('招商银行储蓄卡仅支持 pdf 格式导入')
      }
      const buffer = await file.arrayBuffer()
      parsedRows = await parseCmbPdf(buffer)
    } else if (source.value === 'cmb_credit') {
      if (!isPdf) {
        throw new Error('招商信用卡仅支持 pdf 格式导入')
      }
      const buffer = await file.arrayBuffer()
      parsedRows = await parseCmbCreditPdf(buffer)
    } else if (isXlsx) {
      if (source.value !== 'wechat') {
        throw new Error('仅微信支持 xlsx 格式导入')
      }
      const buffer = await file.arrayBuffer()
      parsedRows = parseWechatXlsx(buffer)
    } else {
      const text = await decodeCsvFile(file, source.value)
      parsedRows = source.value === 'alipay' ? parseAlipayCsv(text) : parseWechatCsv(text)
    }

    let items: ImportRecordItem[]

    // 所有来源：按账户分组统计基础指纹数量
    const matchResults = parsedRows.map(row => matchAccount(row))

    // 按基础指纹统计数量（用于计算序号）
    const baseFingerprintCount = new Map<string, number>()
    const fingerprintCountMap = new Map<number, number>() // 记录每行的序号

    for (let i = 0; i < matchResults.length; i++) {
      const matchResult = matchResults[i]
      const parsed = parsedRows[i]

      // 获取建议的账户 ID（用于构建指纹）
      const tempBillType = source.value === 'alipay' && parsed.rawPaymentDirection
        ? inferAlipayBillType(parsed, matchResult.counterpartyAccount).type
        : inferBillType(matchResult.counterpartyAccount, parsed.direction)
      const tempDirection = parsed.direction
      const tempSuggestion = suggestAccountIds(matchResult.counterpartyAccount, matchResult.myAccount, tempDirection, tempBillType)

      const fromAccountId = tempSuggestion.fromAccountId || null
      const toAccountId = tempSuggestion.toAccountId || null
      const fromAccountType = fromAccountId ? props.accounts.find(a => a.id === fromAccountId)?.type : undefined
      const toAccountType = toAccountId ? props.accounts.find(a => a.id === toAccountId)?.type : undefined

      // 构建基础指纹（不带序号）
      const baseFingerprint = buildDuplicateFingerprint(
        parsed.date,
        parsed.amount,
        fromAccountId,
        toAccountId,
        fromAccountType,
        toAccountType
      )

      const count = baseFingerprintCount.get(baseFingerprint) || 0
      fingerprintCountMap.set(i, count)
      baseFingerprintCount.set(baseFingerprint, count + 1)
    }

    // 生成导入记录项
    items = parsedRows.map((row, idx) => {
      const matchResult = matchResults[idx]
      const fingerprintIndex = fingerprintCountMap.get(idx) || 0
      return buildImportRecordItem(row, matchResult, fingerprintIndex)
    })

    const dates = items.map(i => i.date).filter(Boolean).sort()
    const billStartDate = dates[0] || ''
    const billEndDate = dates[dates.length - 1] || ''

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
      billStartDate,
      billEndDate,
      startedAt: now(),
      finishedAt: '',
      createdAt: now(),
      updatedAt: now(),
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

async function handleEmailFileLoaded(data: { name: string; content: ArrayBuffer; source: 'alipay' | 'wechat' | 'cmb' | 'cmb_credit' }) {
  parseError.value = ''
  parsing.value = true

  try {
    const { name, content, source: fileSource } = data

    let parsedRows: CsvParsedRow[]

    if (fileSource === 'cmb') {
      parsedRows = await parseCmbPdf(content)
    } else if (fileSource === 'cmb_credit') {
      parsedRows = await parseCmbCreditPdf(content)
    } else if (name.toLowerCase().endsWith('.xlsx')) {
      parsedRows = parseWechatXlsx(content)
    } else {
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(content)
      parsedRows = fileSource === 'alipay' ? parseAlipayCsv(text) : parseWechatCsv(text)
    }

    let items: ImportRecordItem[]

    const matchResults = parsedRows.map(row => matchAccount(row))
    const baseFingerprintCount = new Map<string, number>()
    const fingerprintCountMap = new Map<number, number>()

    for (let i = 0; i < matchResults.length; i++) {
      const matchResult = matchResults[i]
      const parsed = parsedRows[i]

      // 获取建议的账户 ID（用于构建指纹）
      const tempBillType = fileSource === 'alipay' && parsed.rawPaymentDirection
        ? inferAlipayBillType(parsed, matchResult.counterpartyAccount).type
        : inferBillType(matchResult.counterpartyAccount, parsed.direction)
      const tempDirection = parsed.direction
      const tempSuggestion = suggestAccountIds(matchResult.counterpartyAccount, matchResult.myAccount, tempDirection, tempBillType)

      const fromAccountId = tempSuggestion.fromAccountId || null
      const toAccountId = tempSuggestion.toAccountId || null
      const fromAccountType = fromAccountId ? props.accounts.find(a => a.id === fromAccountId)?.type : undefined
      const toAccountType = toAccountId ? props.accounts.find(a => a.id === toAccountId)?.type : undefined

      // 构建基础指纹（不带序号）
      const baseFingerprint = buildDuplicateFingerprint(
        parsed.date,
        parsed.amount,
        fromAccountId,
        toAccountId,
        fromAccountType,
        toAccountType
      )

      const count = baseFingerprintCount.get(baseFingerprint) || 0
      fingerprintCountMap.set(i, count)
      baseFingerprintCount.set(baseFingerprint, count + 1)
    }

    items = parsedRows.map((row, idx) => {
      const matchResult = matchResults[idx]
      const fingerprintIndex = fingerprintCountMap.get(idx) || 0
      return buildImportRecordItem(row, matchResult, fingerprintIndex)
    })

    const dates = items.map(i => i.date).filter(Boolean).sort()
    const billStartDate = dates[0] || ''
    const billEndDate = dates[dates.length - 1] || ''

    const record: ImportRecord = {
      id: generateId(),
      noteId: props.noteId,
      source: fileSource,
      fileName: name,
      fileSize: content.byteLength,
      totalParsed: items.length,
      selectedCount: items.filter(i => i.selected && !i.skipped && !i.duplicate).length,
      successCount: 0,
      skippedCount: 0,
      failedCount: 0,
      status: 'pending',
      billIds: [],
      items,
      billStartDate,
      billEndDate,
      startedAt: now(),
      finishedAt: '',
      createdAt: now(),
      updatedAt: now(),
    }

    await insertRecord(record)
    emit('record-created', record)
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

function onSourceChange(newSource: ImportSource) {
  source.value = newSource
  // 切换来源时重置默认账户
  defaultAccountId.value = ''
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return ''
  if (start === end) return start.slice(0, 10)
  return `${start.slice(0, 10)} ~ ${end.slice(0, 10)}`
}

function sourceLabel(s: ImportSource): string {
  return s === 'alipay' ? '支付宝' : s === 'wechat' ? '微信' : s === 'cmb' ? '招商银行储蓄卡' : s === 'cmb_credit' ? '招商信用卡' : s === 'email' ? '邮件' : s
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function statusLabel(s: ImportRecordStatus): string {
  switch (s) {
    case 'pending': return '待导入'
    case 'processing': return '待处理'
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
  defaultAccountId.value = ''
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
  align-items: center;
}
.tab-bar-spacer {
  flex: 1;
}
.tab-btn-rule {
  margin-left: auto;
  color: rgba(0, 122, 255, 0.8);
  font-size: 12px;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: none;
  border-radius: 6px;
}
.tab-btn-rule:hover {
  background: rgba(0, 122, 255, 0.08);
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
}

.email-import-wrapper {
  padding: 4px 0;
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
.history-status.processing {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
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
.history-date-range {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
  gap: 6px;
}
.date-range-label {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(60, 60, 67, 0.06);
  font-size: 10px;
}
</style>
