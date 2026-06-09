<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="dialog-overlay"
      :class="{ mobile: isMobile }"
      :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined"
      @click="onCancel"
    >
      <div class="dialog" :class="{ mobile: isMobile }" tabindex="-1" @click.stop @keydown="onKeyDown">
        <div class="dialog-header">
          <h3>{{ noteName }} - {{ year }}年{{ month }}月账单</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon :name="SOLAR_ICONS.action.close" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>

          <div v-else-if="bills.length === 0" class="empty-state">
            <Icon :name="SOLAR_ICONS.doc.default" size="48" />
            <p>该月份暂无账单</p>
          </div>

          <div v-else class="bills-list">
            <div v-for="bill in bills" :key="bill.id" class="bill-item">
              <div class="bill-icon">{{ getCategoryIcon(bill.categoryId) }}</div>
              <div class="bill-info">
                <div class="bill-category">{{ getCategoryName(bill.categoryId) }}</div>
                <div class="bill-meta">{{ formatDate(bill.date) }}</div>
              </div>
              <div class="bill-amount" :class="{ expense: bill.type === 'expense', income: bill.type === 'income' }">
                {{ bill.type === 'expense' ? '-' : '+' }}¥{{ bill.amount.toFixed(2) }}
              </div>
            </div>
            <div class="summary-row">
              <span>合计</span>
              <span class="summary-amount" :class="{ expense: totalAmount < 0, income: totalAmount >= 0 }">
                {{ totalAmount >= 0 ? '+' : '' }}¥{{ totalAmount.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="confirm-btn" @click="onCancel">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Bill } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import { useBillCategories } from '~/composables/useBillCategories'

const { isMobile } = useDevice()
const { categories } = useBillCategories()

const props = defineProps<{
  visible: boolean
  noteId: string
  noteName: string
  year: number
  month: number
}>()

const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  cancel: []
}>()

const loading = ref(false)
const bills = ref<Bill[]>([])

const totalAmount = computed(() => {
  return bills.value.reduce((sum, bill) => {
    return sum + (bill.type === 'expense' ? -bill.amount : bill.amount)
  }, 0)
})

async function loadBills() {
  if (!props.noteId) return

  loading.value = true
  try {
    const prefix = `${props.year}-${String(props.month).padStart(2, '0')}`
    const db = await (async () => {
      const { getDB } = await import('~/services/db')
      return getDB()
    })()

    // 查询该笔记在指定月份的所有账单
    const result = await db.bills.find({
      selector: {
        noteId: props.noteId,
        date: { $gte: `${prefix}-01`, $lt: `${prefix}-31` }
      },
      sort: [{ date: 'desc' }]
    }).exec()

    bills.value = result.map((doc: any) => doc.toJSON())
  } catch (e) {
    console.error('Failed to load bills:', e)
    bills.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    loadBills()
  }
})

function getCategoryName(categoryId: string): string {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.name || '未分类'
}

function getCategoryIcon(categoryId: string): string {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.icon || '📁'
}

function formatDate(date: string): string {
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function onCancel() {
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}

.dialog-overlay.mobile {
  align-items: flex-end;
  padding: 0;
  background: rgba(0, 0, 0, 0.35);
}

.dialog {
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  overflow: hidden;
  background: var(--liquid-bg);
  backdrop-filter: blur(var(--liquid-blur)) saturate(var(--liquid-saturate));
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--liquid-radius);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.dialog.mobile {
  overflow: hidden;
  width: 100%;
  max-height: 90vh;
  border-radius: var(--liquid-radius) var(--liquid-radius) 0 0;
  border-bottom: none;
}

.dialog.mobile .dialog-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.dialog-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.dialog-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(60, 60, 67, 0.5);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(60, 60, 67, 0.15);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 12px;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(60, 60, 67, 0.4);
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

.bills-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--liquid-bg-thin);
  border-radius: 10px;
  transition: all 0.15s ease;
}

.bill-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.bill-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  flex-shrink: 0;
}

.bill-info {
  flex: 1;
  min-width: 0;
}

.bill-category {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-meta {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  margin-top: 2px;
}

.bill-amount {
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}

.bill-amount.expense {
  color: rgb(255, 59, 48);
}

.bill-amount.income {
  color: rgb(52, 199, 89);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.summary-amount {
  font-size: 16px;
}

.summary-amount.expense {
  color: rgb(255, 59, 48);
}

.summary-amount.income {
  color: rgb(52, 199, 89);
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: rgb(0, 122, 255);
  color: white;
}

.dialog-body::-webkit-scrollbar {
  width: 5px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}
</style>
