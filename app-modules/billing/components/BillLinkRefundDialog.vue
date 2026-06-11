<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="link-refund-overlay" @click="close">
        <div class="link-refund-sheet liquid-glass-sheet" @click.stop>
          <!-- 头部 -->
          <div class="sheet-header">
            <h3 class="title3">{{ dialogTitle }}</h3>
            <button class="liquid-glass-button close-btn" @click="close">
              <Icon :name="SOLAR_ICONS.action.close" size="20" />
            </button>
          </div>

          <!-- 搜索 -->
          <div class="search-bar">
            <Icon :name="SOLAR_ICONS.search.default" size="16" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              class="liquid-glass-input search-input"
              placeholder="搜索描述或金额..."
            />
          </div>

          <!-- 加载中 -->
          <div v-if="loading" class="loading-state">
            <div class="spinner" />
            <span class="body">加载中...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="filteredBills.length === 0" class="empty-state">
            <Icon :name="SOLAR_ICONS.search.default" size="48" class="empty-icon" />
            <p class="body liquid-text-secondary">{{ searchQuery ? '没有匹配的账单' : '没有可关联的账单' }}</p>
          </div>

          <!-- 账单列表 -->
          <div v-else class="bills-list">
            <div
              v-for="bill in filteredBills"
              :key="bill.id"
              class="bill-item liquid-glass-list-item"
              :class="{ selected: selectedBillId === bill.id }"
              @click="selectedBillId = bill.id"
            >
              <div class="bill-info">
                <div class="bill-desc headline">{{ bill.description || '(无描述)' }}</div>
                <div class="bill-meta caption2 liquid-text-tertiary">
                  <span>{{ formatDate(bill.date) }}</span>
                  <span v-if="categoryNameMap[bill.categoryId]" class="bill-cat">{{ categoryNameMap[bill.categoryId] }}</span>
                </div>
              </div>
              <div class="bill-amount" :class="bill.type">
                {{ bill.type === 'income' ? '+' : '-' }}{{ bill.amount.toFixed(2) }}
              </div>
              <div v-if="selectedBillId === bill.id" class="bill-check">
                <Icon :name="SOLAR_ICONS.status.success" size="18" />
              </div>
            </div>
          </div>

          <!-- 金额不一致警告 -->
          <div v-if="amountMismatch" class="amount-warning">
            <Icon :name="SOLAR_ICONS.status.warning" size="16" />
            <span class="caption1">退款金额 (¥{{ selectedBillData?.amount.toFixed(2) }}) 与原账单金额 (¥{{ sourceBill?.amount.toFixed(2) }}) 不一致</span>
          </div>

          <!-- 底部按钮 -->
          <div class="sheet-footer">
            <button class="liquid-glass-button" @click="close">取消</button>
            <button
              class="liquid-glass-button liquid-glass-button-primary"
              :disabled="!selectedBillId"
              @click="confirm"
            >
              确认关联
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getDB } from '~/services/db'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useBillCategories } from '~/composables/useBillCategories'
import type { Bill } from '~/types/bill'

const props = defineProps<{
  visible: boolean
  sourceBill: Bill | null
  mode: 'link-refund' | 'link-as-refund'
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [bill: Bill]
  close: []
}>()

const { categories } = useBillCategories()

const loading = ref(false)
const candidateBills = ref<Bill[]>([])
const searchQuery = ref('')
const selectedBillId = ref<string | null>(null)

const categoryNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const c of categories.value) {
    map[c.id] = c.name
  }
  return map
})

const dialogTitle = computed(() =>
  props.mode === 'link-refund' ? '选择退款账单' : '选择原始支出账单'
)

const selectedBillData = computed(() =>
  candidateBills.value.find(b => b.id === selectedBillId.value) ?? null
)

const amountMismatch = computed(() => {
  if (!selectedBillData.value || !props.sourceBill) return false
  return selectedBillData.value.amount !== props.sourceBill.amount
})

const filteredBills = computed(() => {
  if (!searchQuery.value) return candidateBills.value
  const q = searchQuery.value.toLowerCase()
  return candidateBills.value.filter(b =>
    (b.description && b.description.toLowerCase().includes(q)) ||
    b.amount.toFixed(2).includes(q)
  )
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function close() {
  emit('update:visible', false)
  emit('close')
}

function confirm() {
  if (!selectedBillData.value) return
  emit('select', selectedBillData.value)
}

async function loadCandidateBills() {
  if (!props.sourceBill) return
  loading.value = true
  selectedBillId.value = null
  searchQuery.value = ''

  try {
    const db = await getDB()
    const targetBillType = props.mode === 'link-refund' ? 'income' : 'expense'

    const result = await db.bills.find({
      selector: {
        noteId: props.sourceBill.noteId,
        type: targetBillType,
      },
      sort: [{ date: 'desc' }],
    }).exec()

    const allBills = result.map((doc: any) => doc.toJSON() as Bill)

    candidateBills.value = allBills.filter(b =>
      !b.isRefund &&
      !b.parentId &&
      b.id !== props.sourceBill!.id &&
      b.status !== 'cancelled'
    )
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    loadCandidateBills()
  }
})
</script>

<style scoped>
.link-refund-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: env(safe-area-inset-bottom) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.link-refund-sheet {
  width: 100%;
  max-width: 600px;
  max-height: 70vh;
  border-radius: var(--liquid-radius, 20px) var(--liquid-radius, 20px) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
}

.sheet-header h3 {
  margin: 0;
  color: var(--liquid-text-primary);
}

.close-btn {
  padding: 6px;
  min-width: 32px;
}

.search-bar {
  position: relative;
  padding: 8px 16px;
}

.search-icon {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--liquid-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 32px;
}

.bills-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: var(--liquid-radius-button, 14px);
  transition: background 0.15s ease;
}

.bill-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.bill-item.selected {
  background: rgba(0, 122, 255, 0.1);
}

.bill-info {
  flex: 1;
  min-width: 0;
}

.bill-desc {
  color: var(--liquid-text-primary);
  font-weight: 500;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-meta {
  display: flex;
  gap: 8px;
  color: var(--liquid-text-tertiary);
}

.bill-cat {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-amount {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
}

.bill-amount.expense {
  color: rgb(255, 59, 48);
}

.bill-amount.income {
  color: rgb(52, 199, 89);
}

.bill-check {
  color: rgb(0, 122, 255);
  display: flex;
  align-items: center;
}

.amount-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 149, 0, 0.08);
  color: rgb(255, 149, 0);
}

.sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.06);
}

.sheet-footer button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* sheet 过渡 */
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .sheet-header {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .bill-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .bill-item.selected {
    background: rgba(0, 122, 255, 0.15);
  }

  .sheet-footer {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
}

@media (max-width: 640px) {
  .link-refund-sheet {
    max-height: 80vh;
  }
}
</style>
