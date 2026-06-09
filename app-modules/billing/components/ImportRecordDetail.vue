<template>
  <Teleport to="body">
    <Transition name="record-modal">
      <div v-if="visible" ref="overlayRef" class="record-modal-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined">
        <div class="record-modal-card" @click.stop>
          <div class="record-modal-header">
            <div class="header-left">
              <h4>{{ isPending ? '导入详情 - 待导入' : isProcessing ? '导入详情 - 待处理' : '导入详情' }}</h4>
              <span v-if="isPending" class="edit-timer">⏱️ {{ formatElapsed(totalElapsedMs) }}</span>
            </div>
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
                :item-height="isMobile ? 130 : 100"
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
                    @save-raw-type-rule="openRawTypeRule"
                    @edit-remark="openRemarkEditor"
                    @open-mobile-editor="openMobileEditor"
                  />
                </template>
              </VirtualList>
            </template>

            <!-- 已完成只读态 -->
            <template v-else>
              <VirtualList
                :items="record.items"
                :item-height="72"
                :container-height="400"
                :buffer="5"
                :gap="4"
                class="record-items"
              >
                <template #default="{ item }">
                  <div
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
                    <div v-if="item.remark" class="item-remark">📝 {{ item.remark }}</div>
                    <div v-if="item.errorMessage" class="item-error">{{ item.errorMessage }}</div>
                  </div>
                </template>
              </VirtualList>
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
            <template v-else-if="isProcessing">
              <button type="button" class="secondary-btn" @click="onRollback">回滚</button>
              <button type="button" class="confirm-btn" @click="onConfirmComplete">确认完成</button>
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

          <!-- 移动端二级编辑弹框 -->
          <MobileImportItemEditor
            v-model:visible="mobileEditor.visible"
            :item="mobileEditor.item"
            :accounts="accounts"
            :categories="categories"
            :current-index="mobileEditor.currentIndex"
            :total="filteredItems.length"
            :has-prev="mobileEditor.currentIndex > 0"
            :has-next="mobileEditor.currentIndex < filteredItems.length - 1"
            :has-next-incomplete="hasNextIncompleteInFiltered(mobileEditor.currentIndex)"
            @update:item="onMobileItemUpdate"
            @navigate="onMobileNavigate"
            @save-as-rule="openRuleOverlay"
            @save-counterparty-rule="openCounterpartyRule"
            @save-payment-method-rule="openPaymentMethodRule"
            @save-description-rule="openDescriptionRule"
            @save-raw-type-rule="openRawTypeRule"
            @edit-remark="openRemarkEditorFromMobile"
          />

          <!-- 备注编辑弹框 -->
          <div v-if="remarkEditor.visible" class="remark-overlay" @click="closeRemarkEditor">
            <div class="remark-card" @click.stop>
              <div class="remark-header">
                <span>编辑备注</span>
                <button type="button" class="close-btn" @click="closeRemarkEditor">
                  <Icon name="solar:close-circle-linear" size="16" />
                </button>
              </div>
              <textarea
                v-model="remarkEditor.text"
                class="remark-textarea"
                rows="3"
                placeholder="输入备注内容..."
                @keydown.stop
              />
              <div class="remark-footer">
                <button type="button" class="cancel-btn" @click="closeRemarkEditor">取消</button>
                <button type="button" class="confirm-btn" @click="saveRemark">保存</button>
              </div>
            </div>
          </div>

          <!-- 应用规则确认弹框（保存规则后） -->
          <div v-if="applyRuleConfirm.visible" class="remark-overlay" @click="onApplyRuleCancel">
            <div class="remark-card" @click.stop>
              <div class="remark-header">
                <span>应用规则</span>
                <button type="button" class="close-btn" @click="onApplyRuleCancel">
                  <Icon name="solar:close-circle-linear" size="16" />
                </button>
              </div>
              <p class="confirm-message-text">规则已保存，是否立即应用？</p>
              <div class="remark-footer three-actions">
                <button type="button" class="cancel-btn" @click="onApplyRuleCancel">不应用</button>
                <button type="button" class="secondary-btn" @click="onApplyRuleCurrent">仅应用当前</button>
                <button type="button" class="confirm-btn" @click="onApplyRuleAll">应用全部</button>
              </div>
            </div>
          </div>

          <!-- 应用全部规则确认弹框 -->
          <div v-if="applyAllRulesConfirm" class="remark-overlay" @click="onApplyAllRulesCancel">
            <div class="remark-card" @click.stop>
              <div class="remark-header">
                <span>应用规则</span>
                <button type="button" class="close-btn" @click="onApplyAllRulesCancel">
                  <Icon name="solar:close-circle-linear" size="16" />
                </button>
              </div>
              <p class="confirm-message-text">选择应用范围</p>
              <div class="remark-footer three-actions">
                <button type="button" class="cancel-btn" @click="onApplyAllRulesCancel">取消</button>
                <button type="button" class="secondary-btn" @click="() => onApplyAllRulesConfirm(false)">仅未完善</button>
                <button type="button" class="confirm-btn" @click="() => onApplyAllRulesConfirm(true)">应用全部</button>
              </div>
            </div>
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
  ImportRuleMatchField,
  ImportSource
} from '~/types/bill'
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useImportRules } from '~/composables/useImportRules'
import { useImportRecords } from '~/composables/useImportRecords'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import { suggestAccountIds } from '~/composables/useAccountMatcher'
import { now } from '~/services/db'
import ImportPreviewRow from './ImportPreviewRow.vue'
import MobileImportItemEditor from './MobileImportItemEditor.vue'
import VirtualList from './VirtualList.vue'

const { isMobile } = useDevice()
const { success: showSuccess, error: showError } = useToast()

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
  (e: 'open-rule-dialog', form: ImportRuleFormData, options?: { rule?: ImportRule; onSaved?: (rule?: ImportRule) => void }): void
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
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopTimer()
  saveDuration()
})

const { rules: importRules, applyRules } = useImportRules()
const { updateRecord, updateRecordItems } = useImportRecords()
const { confirm } = useConfirm()

const importing = ref(false)
const filter = ref<'all' | 'unmatched' | 'matched' | 'duplicate'>('all')


// 应用规则确认弹框（保存规则后）
const applyRuleConfirm = ref<{
  visible: boolean
  rule: ImportRule | null
  targetItem: ImportRecordItem | null
}>({ visible: false, rule: null, targetItem: null })

// 应用全部规则确认弹框
const applyAllRulesConfirm = ref(false)

// 备注编辑弹框
const remarkEditor = ref<{
  visible: boolean
  rawIndex: number | null
  text: string
}>({ visible: false, rawIndex: null, text: '' })

function openRemarkEditor(item: ImportRecordItem) {
  remarkEditor.value = {
    visible: true,
    rawIndex: item.rawIndex,
    text: item.remark || ''
  }
}

function closeRemarkEditor() {
  remarkEditor.value.visible = false
  remarkEditor.value.rawIndex = null
}

function saveRemark() {
  const { rawIndex, text } = remarkEditor.value
  if (rawIndex !== null) {
    const idx = localItems.value.findIndex(i => i.rawIndex === rawIndex)
    if (idx !== -1) {
      localItems.value[idx] = { ...localItems.value[idx], remark: text.trim() || undefined }
      scheduleSave()
    }
  }
  closeRemarkEditor()
}

// 移动端二级编辑弹框
const mobileEditor = ref<{
  visible: boolean
  item: ImportRecordItem
  currentIndex: number
}>({
  visible: false,
  item: {} as ImportRecordItem,
  currentIndex: 0
})

function openMobileEditor(item: ImportRecordItem) {
  const idx = filteredItems.value.findIndex(i => i.rawIndex === item.rawIndex)
  mobileEditor.value = {
    visible: true,
    item: { ...item },
    currentIndex: idx
  }
}

function onMobileItemUpdate(value: ImportRecordItem) {
  onItemUpdate(value.rawIndex, value)
  mobileEditor.value.item = { ...value }
}

function hasNextIncompleteInFiltered(currentIndex: number): boolean {
  for (let i = currentIndex + 1; i < filteredItems.value.length; i++) {
    const item = filteredItems.value[i]
    if (!item.skipped && !item.duplicate && isIncomplete(item)) {
      return true
    }
  }
  return false
}

function onMobileNavigate(direction: 'prev' | 'next' | 'next-incomplete') {
  let targetIndex = mobileEditor.value.currentIndex

  if (direction === 'prev') {
    targetIndex = Math.max(0, targetIndex - 1)
  } else if (direction === 'next') {
    targetIndex = Math.min(filteredItems.value.length - 1, targetIndex + 1)
  } else if (direction === 'next-incomplete') {
    for (let i = targetIndex + 1; i < filteredItems.value.length; i++) {
      const item = filteredItems.value[i]
      if (!item.skipped && !item.duplicate && isIncomplete(item)) {
        targetIndex = i
        break
      }
    }
  }

  if (targetIndex !== mobileEditor.value.currentIndex && targetIndex >= 0 && targetIndex < filteredItems.value.length) {
    mobileEditor.value.currentIndex = targetIndex
    mobileEditor.value.item = { ...filteredItems.value[targetIndex] }
  }
}

function openRemarkEditorFromMobile(item: ImportRecordItem) {
  openRemarkEditor(item)
}

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
const isProcessing = computed(() => props.record.status === 'processing')

const baseDurationMs = ref(0)
const sessionElapsedMs = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
let sessionStartAt = 0
let hiddenAt = 0

function tickTimer() {
  sessionElapsedMs.value = Date.now() - sessionStartAt
}

function beginInterval() {
  timerInterval = setInterval(tickTimer, 1000)
}

function startTimer() {
  if (!isPending.value) return
  baseDurationMs.value = props.record.editingDurationMs || 0
  sessionElapsedMs.value = 0
  sessionStartAt = Date.now()
  beginInterval()
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    hiddenAt = Date.now()
    stopTimer()
  } else {
    if (hiddenAt) {
      const gone = Date.now() - hiddenAt
      if (gone > 10000) {
        sessionStartAt += gone
      }
      hiddenAt = 0
    }
    if (isPending.value && props.visible && !timerInterval) {
      tickTimer()
      beginInterval()
    }
  }
}

function currentTotalDuration(): number {
  return baseDurationMs.value + sessionElapsedMs.value
}

function saveDuration() {
  const total = currentTotalDuration()
  if (total > 0 && isPending.value && props.record.id) {
    updateRecord(props.record.id, { editingDurationMs: total }).catch(() => {})
  }
}

const totalElapsedMs = computed(() => baseDurationMs.value + sessionElapsedMs.value)

// 本地编辑态（pending 时使用）
const localItems = ref<ImportRecordItem[]>([])

watch(() => props.record.id, (id) => {
  if (id) {
    localItems.value = props.record.items.map(item => ({ ...item }))
    filter.value = 'all'
  }
}, { immediate: true })

watch(() => props.visible, (visible) => {
  if (visible && isPending.value) {
    stopTimer()
    startTimer()
  } else {
    stopTimer()
    saveDuration()
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

function findMatchingRule(field: ImportRuleMatchField, target: string, direction?: 'in' | 'out'): ImportRule | null {
  if (!target) return null
  const candidates = importRules.value.filter(r =>
    r.enabled &&
    (r.source === 'all' || r.source === props.record.source) &&
    (r.matchField ?? 'account') === field &&
    (!r.matchDirection || r.matchDirection === direction)
  )
  for (const rule of candidates) {
    const pattern = rule.pattern.toLowerCase()
    const t = target.toLowerCase()
    switch (rule.matchMode) {
      case 'exact':
        if (target === rule.pattern) return rule
        break
      case 'fuzzy':
        if (t.includes(pattern)) return rule
        break
      case 'regex':
        try {
          if (new RegExp(rule.pattern, 'i').test(target)) return rule
        } catch { /* ignore invalid regex */ }
        break
    }
  }
  return null
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

function promptApplyRuleAfterSave(rule?: ImportRule, targetItem?: ImportRecordItem) {
  if (!rule) return
  applyRuleConfirm.value = {
    visible: true,
    rule,
    targetItem: targetItem || null
  }
}

function onApplyRuleCurrent() {
  const { rule, targetItem } = applyRuleConfirm.value
  if (rule && targetItem) {
    applySingleRuleToItem(targetItem, rule)
  }
  applyRuleConfirm.value.visible = false
}

function onApplyRuleAll() {
  const { rule } = applyRuleConfirm.value
  if (rule) {
    applySingleRuleToAllItems(rule)
  }
  applyRuleConfirm.value.visible = false
}

function onApplyRuleCancel() {
  applyRuleConfirm.value.visible = false
}

function matchOne(rule: ImportRule, target: string): boolean {
  if (!target) return false
  switch (rule.matchMode) {
    case 'exact':
      return target === rule.pattern
    case 'fuzzy':
      return target.toLowerCase().includes(rule.pattern.toLowerCase())
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(target)
      } catch {
        return false
      }
    default:
      return false
  }
}

function buildRuleUpdates(item: ImportRecordItem, rule: ImportRule): Partial<ImportRecordItem> | null {
  if (!rule.enabled) return null
  if (rule.source !== 'all' && rule.source !== props.record.source) return null

  const field = rule.matchField ?? 'account'
  let matched = false

  if (field === 'account') {
    if (matchOne(rule, item.counterparty || '')) matched = true
    else if (matchOne(rule, item.paymentMethod || '')) matched = true
  } else if (field === 'description') {
    if (matchOne(rule, item.description || '')) matched = true
  } else if (field === 'rawType') {
    if (matchOne(rule, item.rawType || '')) matched = true
  }

  if (!matched) return null

  const updates: Partial<ImportRecordItem> = {}

  if (field === 'account') {
    if (matchOne(rule, item.counterparty || '')) {
      updates.matchedRuleId = rule.id
      if (rule.categoryId) updates.categoryId = rule.categoryId
      if (rule.accountId) updates.matchedAccountId = rule.accountId
      if (rule.billType) updates.type = rule.billType
    }
    if (matchOne(rule, item.paymentMethod || '')) {
      updates.paymentMethodRuleId = rule.id
      if (rule.accountId) updates.myAccountId = rule.accountId
      if (!updates.type && rule.billType) updates.type = rule.billType
    }
  } else if (field === 'description') {
    updates.descriptionRuleId = rule.id
    if (rule.categoryId) updates.categoryId = rule.categoryId
    if (rule.accountId) updates.matchedAccountId = rule.accountId
    if (!updates.type && rule.billType) updates.type = rule.billType
  } else if (field === 'rawType') {
    updates.rawTypeRuleId = rule.id
    if (rule.categoryId) updates.categoryId = rule.categoryId
    if (rule.accountId) updates.matchedAccountId = rule.accountId
    if (!updates.type && rule.billType) updates.type = rule.billType
  }

  return updates
}

function applySingleRuleToItem(item: ImportRecordItem, rule: ImportRule) {
  const idx = localItems.value.findIndex(i => i.rawIndex === item.rawIndex)
  if (idx === -1) return

  const updates = buildRuleUpdates(localItems.value[idx], rule)
  if (!updates || Object.keys(updates).length === 0) return

  const next = { ...localItems.value[idx], ...updates }

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

  localItems.value[idx] = next
  scheduleSave()
}

function applySingleRuleToAllItems(rule: ImportRule) {
  let changed = false
  localItems.value = localItems.value.map(item => {
    if (item.skipped || item.duplicate) return item

    const updates = buildRuleUpdates(item, rule)
    if (!updates || Object.keys(updates).length === 0) return item

    changed = true
    const next = { ...item, ...updates }

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
  })

  if (changed) scheduleSave()
}

function openRuleOverlay(item: ImportRecordItem) {
  const counterparty = (item.counterparty || '').trim()
  const existingRule = item.matchedRuleId
    ? ruleById(item.matchedRuleId)
    : findMatchingRule('account', counterparty, item.direction)
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchDirection: item.direction,
    matchMode: 'fuzzy',
    pattern: counterparty,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { rule: existingRule ?? undefined, onSaved: (rule) => promptApplyRuleAfterSave(rule, item) })
}

function openCounterpartyRule(item: ImportRecordItem) {
  const counterparty = (item.counterparty || '').trim()
  const existingRule = item.matchedRuleId
    ? ruleById(item.matchedRuleId)
    : findMatchingRule('account', counterparty, item.direction)
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchDirection: item.direction,
    matchMode: 'fuzzy',
    pattern: counterparty,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { rule: existingRule ?? undefined, onSaved: (rule) => promptApplyRuleAfterSave(rule, item) })
}

function openPaymentMethodRule(item: ImportRecordItem) {
  const paymentMethod = (item.paymentMethod || '').trim()
  const existingRule = item.paymentMethodRuleId
    ? ruleById(item.paymentMethodRuleId)
    : findMatchingRule('account', paymentMethod, item.direction)
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'account',
    matchDirection: item.direction,
    matchMode: 'fuzzy',
    pattern: paymentMethod,
    categoryId: '',
    accountId: item.myAccountId || '',
    billType: undefined,
    priority: 100,
    enabled: true
  }, { rule: existingRule ?? undefined, onSaved: (rule) => promptApplyRuleAfterSave(rule, item) })
}

function openDescriptionRule(item: ImportRecordItem) {
  const description = (item.description || '').trim()
  const existingRule = item.descriptionRuleId
    ? ruleById(item.descriptionRuleId)
    : findMatchingRule('description', description, item.direction)
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'description',
    matchDirection: item.direction,
    matchMode: 'fuzzy',
    pattern: description,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { rule: existingRule ?? undefined, onSaved: (rule) => promptApplyRuleAfterSave(rule, item) })
}

function openRawTypeRule(item: ImportRecordItem) {
  const rawType = (item.rawType || '').trim()
  const existingRule = item.rawTypeRuleId
    ? ruleById(item.rawTypeRuleId)
    : findMatchingRule('rawType', rawType, item.direction)
  emit('open-rule-dialog', {
    source: props.record.source,
    matchField: 'rawType',
    matchDirection: item.direction,
    matchMode: 'fuzzy',
    pattern: rawType,
    categoryId: item.categoryId || '',
    accountId: item.matchedAccountId || '',
    billType: item.type,
    priority: 100,
    enabled: true
  }, { rule: existingRule ?? undefined, onSaved: (rule) => promptApplyRuleAfterSave(rule, item) })
}

function onImport() {
  stopTimer()
  saveDuration()
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

async function onConfirmComplete() {
  try {
    await updateRecord(props.record.id, { status: 'success', updatedAt: now() })
    showSuccess('已确认完成')
    emit('close')
  } catch (e) {
    showError(e instanceof Error ? e.message : '确认失败')
  }
}

function applyAllRules() {
  applyAllRulesConfirm.value = true
}

function onApplyAllRulesCancel() {
  applyAllRulesConfirm.value = false
}

function onApplyAllRulesConfirm(applyAll: boolean) {
  applyAllRulesConfirm.value = false
  const source = props.record.source
  let changed = false

  localItems.value = localItems.value.map(item => {
    // 仅未完善模式：跳过已完善的
    if (!applyAll && !isIncomplete(item)) return item
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

    if (result.rawTypeRule) {
      updates.rawTypeRuleId = result.rawTypeRule.id
      if (result.rawTypeRule.categoryId) {
        updates.categoryId = result.rawTypeRule.categoryId
      }
      if (result.rawTypeRule.accountId) {
        updates.matchedAccountId = result.rawTypeRule.accountId
      }
      if (!updates.type && result.rawTypeRule.billType) {
        updates.type = result.rawTypeRule.billType
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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sourceLabel(s: ImportSource): string {
  return s === 'alipay' ? '支付宝' : s === 'wechat' ? '微信' : s === 'cmb' ? '招商银行' : s
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
  position: relative;
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
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.edit-timer {
  font-size: 12px;
  color: rgba(0, 122, 255, 0.9);
  background: rgba(0, 122, 255, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
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
  max-height: 50vh;
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
.item-remark {
  font-size: 11px;
  color: rgba(0, 122, 255, 0.85);
  background: rgba(0, 122, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.remark-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: 16px;
}
.remark-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.remark-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.1);
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.remark-textarea {
  margin: 12px 16px;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  resize: vertical;
  font-family: inherit;
  min-height: 60px;
}
.remark-textarea:focus {
  border-color: rgb(0, 122, 255);
}
.remark-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 0 16px 12px;
}
.remark-footer.three-actions {
  gap: 6px;
}
.remark-footer.three-actions .cancel-btn,
.remark-footer.three-actions .secondary-btn,
.remark-footer.three-actions .confirm-btn {
  padding: 8px 10px;
  font-size: 13px;
}
.confirm-message-text {
  margin: 0 16px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.6);
}
</style>