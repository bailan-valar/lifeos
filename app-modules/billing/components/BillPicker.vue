<template>
  <div class="bill-picker">
    <!-- 搜索栏 -->
    <div class="bill-picker-search">
      <Icon :name="SOLAR_ICONS.search.default" size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        class="liquid-glass-input search-input"
        placeholder="搜索描述、金额、分类、账户..."
      />
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="bill-picker-loading">
      <div class="spinner" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredBills.length === 0" class="bill-picker-empty">
      <Icon :name="SOLAR_ICONS.search.default" size="36" class="empty-icon" />
      <p class="body liquid-text-secondary">{{ searchQuery ? '没有匹配的账单' : emptyText }}</p>
    </div>

    <!-- 账单列表 -->
    <div v-else class="bill-picker-list">
      <div
        v-for="bill in filteredBills"
        :key="bill.id"
        class="bill-picker-item"
        :class="{ selected: selectedId === bill.id }"
        @click="onSelect(bill)"
      >
        <BillListItem
          :bill="bill"
          :category-name="categoryNameMap[bill.categoryId] || ''"
          :account-name="accountNameMap[bill.type === 'income' ? bill.toAccountId : bill.fromAccountId] || ''"
          :show-actions="false"
          :selectable="false"
          :context-menu-enabled="false"
          :refund-badge="'none'"
          :show-children="false"
          compact
        />
        <div v-if="selectedId === bill.id" class="pick-check">
          <Icon :name="SOLAR_ICONS.status.success" size="18" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useBillCategories } from '~/composables/useBillCategories'
import { useAccounts } from '~/composables/useAccounts'
import { getDB } from '~/services/db'
import type { Bill, BillType } from '~/types/bill'
import BillListItem from './BillListItem.vue'

export interface BillPickerFilter {
  noteId?: string
  type?: BillType
  excludeIds?: string[]
  excludeRefund?: boolean
  excludeChild?: boolean
  excludeCancelled?: boolean
}

const props = withDefaults(defineProps<{
  /** 当前选中账单ID */
  modelValue?: string | null
  /** 筛选条件 */
  filter?: BillPickerFilter
  /** 空状态文案 */
  emptyText?: string
  /** 默认搜索内容 */
  defaultSearch?: string
}>(), {
  modelValue: null,
  emptyText: '没有可选择的账单',
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
  select: [bill: Bill]
}>()

const { categories } = useBillCategories()
const { accounts } = useAccounts()

const loading = ref(false)
const bills = ref<Bill[]>([])
const searchQuery = ref('')
const selectedId = ref<string | null>(props.modelValue)

// 分类名映射
const categoryNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const c of categories.value) {
    map[c.id] = c.name
  }
  return map
})

// 账户名映射
const accountNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const a of accounts.value) {
    map[a.id] = a.name
  }
  return map
})

// 模糊搜索：支持描述、金额、分类名、账户名
const filteredBills = computed(() => {
  if (!searchQuery.value) return bills.value
  const q = searchQuery.value.toLowerCase()
  return bills.value.filter(b => {
    // 描述
    if (b.description && b.description.toLowerCase().includes(q)) return true
    // 金额
    if (b.amount.toFixed(2).includes(q) || String(b.amount).includes(q)) return true
    // 分类名
    const catName = categoryNameMap.value[b.categoryId]
    if (catName && catName.toLowerCase().includes(q)) return true
    // 账户名
    const fromName = accountNameMap.value[b.fromAccountId]
    if (fromName && fromName.toLowerCase().includes(q)) return true
    const toName = accountNameMap.value[b.toAccountId]
    if (toName && toName.toLowerCase().includes(q)) return true
    return false
  })
})

function onSelect(bill: Bill) {
  selectedId.value = bill.id
  emit('update:modelValue', bill.id)
  emit('select', bill)
}

async function loadBills() {
  if (!props.filter) return
  loading.value = true
  searchQuery.value = props.defaultSearch || ''

  try {
    const db = await getDB()
    const selector: Record<string, unknown> = {}

    if (props.filter.noteId) selector.noteId = props.filter.noteId
    if (props.filter.type) selector.type = props.filter.type

    const querySelector = Object.keys(selector).length > 0 ? selector : undefined
    const result = querySelector
      ? await db.bills.find({ selector: querySelector, sort: [{ date: 'desc' }] }).exec()
      : await db.bills.find({ sort: [{ date: 'desc' }] }).exec()

    let allBills = result.map((doc: any) => doc.toJSON() as Bill)

    // 内存过滤
    allBills = allBills.filter(b => {
      if (props.filter!.excludeIds?.includes(b.id)) return false
      if (props.filter!.excludeRefund && b.isRefund) return false
      if (props.filter!.excludeChild && b.parentId) return false
      if (props.filter!.excludeCancelled && b.status === 'cancelled') return false
      return true
    })

    bills.value = allBills
  } finally {
    loading.value = false
  }
}

// 外部可调用刷新
defineExpose({ refresh: loadBills })

watch(() => props.modelValue, (val) => {
  selectedId.value = val ?? null
})

// 当 filter 变化时重新加载
watch(() => props.filter, () => {
  loadBills()
}, { deep: true })

// 初始加载
onMounted(() => {
  loadBills()
})
</script>

<style scoped>
.bill-picker {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bill-picker-search {
  position: relative;
  margin-bottom: 8px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--liquid-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding-left: 32px;
}

.bill-picker-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--liquid-bg-thick);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bill-picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 24px;
}

.empty-icon {
  color: var(--liquid-text-tertiary);
}

.bill-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 45vh;
  padding-right: 2px;
}

.bill-picker-list::-webkit-scrollbar {
  width: 4px;
}

.bill-picker-list::-webkit-scrollbar-track {
  background: transparent;
}

.bill-picker-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.bill-picker-item {
  position: relative;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.15s ease;
}

.bill-picker-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.bill-picker-item.selected {
  background: rgba(0, 122, 255, 0.06);
  outline: 1.5px solid rgba(0, 122, 255, 0.25);
}

.bill-picker-item.selected :deep(.bill-item) {
  background: transparent;
  border-color: transparent;
}

.pick-check {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: rgb(0, 122, 255);
  display: flex;
  align-items: center;
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .bill-picker-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .bill-picker-item.selected {
    background: rgba(0, 122, 255, 0.08);
  }
}
</style>
