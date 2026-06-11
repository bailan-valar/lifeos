<template>
  <BaseDialog
    v-model:visible="dialogVisible"
    :title="`${displayNoteName} - ${year}年${month}月账单`"
    size="medium"
  >
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
          <div class="bill-meta">
            <span v-if="bill.noteTag" class="bill-note-tag">{{ bill.noteTag }}</span>
            {{ formatDate(bill.date) }}
          </div>
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

    <template #footer>
      <button class="liquid-glass-button" @click="dialogVisible = false">关闭</button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Bill } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useBillCategories } from '~/composables/useBillCategories'
import BaseDialog from '~/components/ui/BaseDialog.vue'

interface BillWithNoteTag extends Bill {
  noteTag?: string
}

const props = defineProps<{
  visible: boolean
  noteId: string
  noteName: string
  year: number
  month: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const { categories } = useBillCategories()
const { getDescendantNoteIds, notes } = useNotes()

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const loading = ref(false)
const bills = ref<BillWithNoteTag[]>([])

const totalAmount = computed(() => {
  return bills.value.reduce((sum, bill) => {
    return sum + (bill.type === 'expense' ? -bill.amount : bill.amount)
  }, 0)
})

const displayNoteName = computed(() => {
  return props.noteId === '__none__' ? '无关联' : props.noteName
})

function getNoteNameById(noteId: string): string {
  if (!noteId) return ''
  const note = notes.value.find(n => n.id === noteId)
  return note?.title || ''
}

async function loadBills() {
  loading.value = true
  try {
    const prefix = `${props.year}-${String(props.month).padStart(2, '0')}`
    const { getDB } = await import('~/services/db')
    const db = await getDB()

    const isUnlinked = props.noteId === '__none__'

    // 获取当前笔记及所有后代笔记 ID，确保弹框显示内容与 Dashboard 聚合值一致
    const queryNoteIds = isUnlinked ? [] : getDescendantNoteIds(props.noteId)

    // 构建数据库查询条件
    const selector: Record<string, unknown> = {
      date: { $gte: `${prefix}-01`, $lte: `${prefix}-31` }
    }

    if (isUnlinked) {
      // 无关联账单：noteId 为空，在内存中过滤
    } else if (queryNoteIds.length === 1) {
      selector.noteId = queryNoteIds[0]
    } else if (queryNoteIds.length > 1) {
      selector.noteId = { $in: queryNoteIds }
    }

    const result = await db.bills.find({
      selector,
      sort: [{ date: 'desc' }]
    }).exec()

    // 内存中精确过滤
    const allBills = result.map((doc: any) => doc.toJSON())
    const filteredBills: BillWithNoteTag[] = []

    for (const bill of allBills) {
      let rejected = false

      // noteId 匹配
      if (isUnlinked) {
        if (bill.noteId !== '') rejected = true
      } else {
        if (!queryNoteIds.includes(bill.noteId)) rejected = true
      }

      // 排除有子账单的父账单（只显示叶子节点）
      if (!rejected && bill.hasChildren) rejected = true

      // 月份匹配：分摊月份或账单日期
      if (!rejected) {
        const matchAllocated = bill.allocatedMonth === prefix
        const matchDate = bill.date.startsWith(prefix)
        if (!matchAllocated && !matchDate) rejected = true
      }

      // 类型过滤：只显示支出和退款
      if (!rejected) {
        if (bill.type !== 'expense' && !(bill.type === 'income' && bill.isRefund)) {
          rejected = true
        }
      }

      if (!rejected) {
        // 为子笔记的账单添加标签
        const noteTag = (!isUnlinked && bill.noteId !== props.noteId)
          ? getNoteNameById(bill.noteId)
          : undefined

        filteredBills.push({ ...bill, noteTag })
      }
    }

    bills.value = filteredBills
  } catch (e) {
    console.error('[NoteMonthBillsDialog] Failed to load bills:', e)
    bills.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) loadBills()
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
</script>

<style scoped>
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.bill-note-tag {
  display: inline-flex;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  white-space: nowrap;
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
</style>
