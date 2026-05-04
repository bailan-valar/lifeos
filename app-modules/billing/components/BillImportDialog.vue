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
        <span>共 {{ rows.length }} 条 · 已选 {{ selectedCount }} · 重复 {{ duplicateCount }} · 命中规则 {{ matchedCount }}</span>
        <button type="button" class="btn-link" @click="toggleAll">
          {{ allSelected ? '全不选' : '全选(跳过重复)' }}
        </button>
      </div>
      <div class="preview-list">
        <ImportPreviewRow
          v-for="(row, idx) in rows"
          :key="idx"
          :row="row"
          :accounts="accounts"
          :categories="categories"
          @update:row="(v) => onRowUpdate(idx, v)"
        />
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
  BillFormData
} from '~/types/bill'
import { decodeCsvFile, parseAlipayCsv, parseWechatCsv, dedupeKey } from '~/services/csvImport'
import { useImportRules } from '~/composables/useImportRules'
import ImportPreviewRow from './ImportPreviewRow.vue'

const props = defineProps<{
  accounts: Account[]
  categories: BillCategory[]
  existingFingerprints: Set<string>
}>()

const emit = defineEmits<{
  (e: 'submit', bills: BillFormData[]): void
  (e: 'cancel'): void
}>()

const { applyRules, inferBillType } = useImportRules()

const sourceOptions: { value: ImportSource; label: string }[] = [
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' }
]

const source = ref<ImportSource>('alipay')
const rows = ref<IPRow[]>([])
const parseError = ref('')
const parsing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const selectedCount = computed(() => rows.value.filter(r => r.selected).length)
const duplicateCount = computed(() => rows.value.filter(r => r.duplicate).length)
const matchedCount = computed(() => rows.value.filter(r => r.matchedRuleId).length)

const allSelected = computed(() => {
  const eligible = rows.value.filter(r => !r.duplicate)
  return eligible.length > 0 && eligible.every(r => r.selected)
})

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

    rows.value = parsedRows.map(parsed => {
      const matched = applyRules(parsed, source.value)
      const billType = inferBillType(parsed.direction)
      const fingerprint = dedupeKey(parsed.date, parsed.amount, parsed.counterparty)
      const isDuplicate = props.existingFingerprints.has(fingerprint)

      return {
        ...parsed,
        selected: !isDuplicate,
        duplicate: isDuplicate,
        matchedRuleId: matched?.id ?? null,
        type: billType,
        categoryId: matched?.categoryId ?? '',
        fromAccountId: matched?.fromAccountId ?? '',
        toAccountId: matched?.toAccountId ?? '',
        title: parsed.counterparty || parsed.description || '导入账单'
      }
    })
  } catch (e) {
    parseError.value = e instanceof Error ? e.message : String(e)
  } finally {
    parsing.value = false
  }
}

function onRowUpdate(idx: number, value: IPRow) {
  rows.value = rows.value.map((r, i) => (i === idx ? value : r))
}

function toggleAll() {
  const next = !allSelected.value
  rows.value = rows.value.map(r => (r.duplicate ? r : { ...r, selected: next }))
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
    debtSubtype: 'lend',
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
.preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 50vh;
  overflow-y: auto;
}
</style>
