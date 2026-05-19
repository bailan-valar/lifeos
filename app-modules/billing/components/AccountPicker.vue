<template>
  <div class="account-picker">
    <div ref="triggerRef" class="picker-trigger" @click.stop="toggleOpen">
      <span :class="{ placeholder: !selectedName }">{{ selectedName || placeholder }}</span>
      <div class="trigger-right">
        <button
          v-if="clearable && modelValue"
          type="button"
          class="clear-btn"
          @click.stop="clear"
        >
          <Icon name="solar:close-circle-linear" size="14" />
        </button>
        <Icon
          name="solar:alt-arrow-down-linear"
          size="14"
          class="arrow"
          :class="{ open: open }"
        />
      </div>
    </div>

    <!-- 复用账户对话框 -->
    <AccountDialog
      :visible="showAccountDialog"
      :default-name="dialogDefaultName"
      :categories="categories"
      @confirm="handleCreateAccount"
      @cancel="showAccountDialog = false"
    />

    <Teleport to="body">
      <div v-if="open" ref="panelRef" class="picker-panel account-picker-panel" :style="panelStyle">
        <div class="picker-search">
          <Icon name="solar:magnifer-linear" size="14" />
          <input
            ref="searchRef"
            v-model="searchQuery"
            placeholder="搜索账户..."
            @click.stop
          />
        </div>

        <div ref="listRef" class="picker-list">
          <div v-if="displayGroups.length === 0" class="picker-empty">
            无匹配结果
          </div>
          <template v-else>
            <template v-for="(group, gIdx) in displayGroups" :key="group.key">
              <div v-if="group.label" class="group-header">{{ group.label }}</div>
              <div
                v-for="(account, aIdx) in group.items"
                :key="account.id"
                class="picker-item"
                :class="{
                  active: modelValue === account.id,
                  'is-active': activeIndex === flatIndex(gIdx, aIdx)
                }"
                @mouseenter="activeIndex = flatIndex(gIdx, aIdx)"
                @click.stop="select(account)"
              >
                <div class="item-left">
                  <span class="item-name">{{ account.name }}</span>
                  <span class="item-badge" :class="badgeClass(account)">{{ badgeLabel(account) }}</span>
                </div>
                <Icon
                  v-if="modelValue === account.id"
                  name="solar:check-circle-linear"
                  size="14"
                  class="check-icon"
                />
              </div>
            </template>
          </template>
        </div>

        <div class="picker-footer">
          <button type="button" class="quick-add-btn" @click.stop="startQuickAdd">
            <Icon name="solar:add-circle-linear" size="14" />
            {{ searchQuery.trim() ? `新增账户「${searchQuery.trim()}」` : '新增账户' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Account, AccountType, BillCategory, AccountFormData } from '~/types/bill'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { getNextZIndex } from '~/composables/useZIndex'
import { useAccounts } from '~/composables/useAccounts'
import AccountDialog from './AccountDialog.vue'

interface AccountGroup {
  key: string
  label: string
  items: Account[]
}

const props = defineProps<{
  modelValue: string
  accounts: Account[]
  allowedTypes?: AccountType[]
  placeholder?: string
  clearable?: boolean
  categories?: BillCategory[]
  frequencyMap?: Map<string, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()

const { createAccount } = useAccounts()
const effectiveFrequencyMap = computed(() => props.frequencyMap)

const placeholder = computed(() => props.placeholder || '请选择账户')
const open = ref(false)
const searchQuery = ref('')
const showAccountDialog = ref(false)
const dialogDefaultName = ref('')
const triggerRef = ref<HTMLElement>()
const searchRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})

const selectedName = computed(() => {
  const acc = props.accounts.find(a => a.id === props.modelValue)
  return acc?.name || ''
})

/* ---------- 过滤与分组 ---------- */
const filteredAccounts = computed(() => {
  let list = props.accounts
  if (props.allowedTypes && props.allowedTypes.length > 0) {
    list = list.filter(a => props.allowedTypes!.includes(a.type))
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(a => {
    if (a.name.toLowerCase().includes(q)) return true
    if (a.aliases?.some(alias => alias.toLowerCase().includes(q))) return true
    return false
  })
})

const displayGroups = computed((): AccountGroup[] => {
  const list = filteredAccounts.value
  function sortByFrequency(items: Account[]) {
    if (!effectiveFrequencyMap.value) return items
    return [...items].sort((a, b) => {
      const fa = effectiveFrequencyMap.value!.get(a.id) || 0
      const fb = effectiveFrequencyMap.value!.get(b.id) || 0
      return fb - fa
    })
  }

  const personal = sortByFrequency(list.filter(a => a.type === 'personal'))
  const merchants = sortByFrequency(list.filter(a => a.type === 'merchant'))
  const contacts = sortByFrequency(list.filter(a => a.type === 'contact'))
  const others = sortByFrequency(list.filter(a => a.type === 'other'))

  const result: AccountGroup[] = []

  if (personal.length > 0) {
    result.push({ key: 'personal-header', label: '我的账户', items: [] })
    const cash = personal.filter(a => (a.subtype || 'cash') === 'cash')
    const debit = personal.filter(a => a.subtype === 'debit_card')
    const credit = personal.filter(a => a.subtype === 'credit_card')
    const online = personal.filter(a => a.subtype === 'online_account')
    if (cash.length > 0) result.push({ key: 'cash', label: '现金', items: cash })
    if (debit.length > 0) result.push({ key: 'debit', label: '储蓄卡', items: debit })
    if (credit.length > 0) result.push({ key: 'credit', label: '信用卡', items: credit })
    if (online.length > 0) result.push({ key: 'online', label: '网络账户', items: online })
  }
  if (merchants.length > 0) {
    result.push({ key: 'merchant', label: '商户', items: merchants })
  }
  if (contacts.length > 0) {
    result.push({ key: 'contact', label: '联系人', items: contacts })
  }
  if (others.length > 0) {
    result.push({ key: 'other', label: '其他', items: others })
  }

  return result
})

/* ---------- badge ---------- */
function badgeLabel(a: Account): string {
  if (a.type === 'merchant') return '商户'
  if (a.type === 'contact') return '联系人'
  if (a.type === 'other') return '其他'
  const sub = a.subtype || 'cash'
  if (sub === 'debit_card') return '储蓄卡'
  if (sub === 'credit_card') return '信用卡'
  if (sub === 'online_account') return '网络'
  return '现金'
}

function badgeClass(a: Account): string {
  if (a.type === 'merchant') return 'merchant'
  if (a.type === 'contact') return 'contact'
  if (a.type === 'other') return 'other'
  const sub = a.subtype || 'cash'
  if (sub === 'credit_card') return 'credit'
  if (sub === 'debit_card') return 'debit'
  if (sub === 'online_account') return 'online'
  return 'personal'
}

/* ---------- 交互 ---------- */
function select(account: Account) {
  emit('update:modelValue', account.id)
  open.value = false
  searchQuery.value = ''
}

function clear() {
  emit('update:modelValue', '')
}

function toggleOpen() {
  if (open.value) {
    open.value = false
  } else {
    open.value = true
    nextTick(() => {
      updatePanelPosition()
      searchRef.value?.focus()
    })
  }
}

function updatePanelPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const MARGIN = 4
  const MIN_HEIGHT = 120
  const PANEL_MAX_HEIGHT = 320

  const spaceBelow = window.innerHeight - rect.bottom - MARGIN
  const spaceAbove = rect.top - MARGIN

  // 默认向下展开；如果下方空间不足且上方更宽敞，则向上展开
  const placeAbove = spaceBelow < MIN_HEIGHT && spaceAbove > spaceBelow

  let top: number
  let maxHeight: number

  if (placeAbove) {
    maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceAbove)
    top = rect.top - maxHeight - MARGIN
  } else {
    maxHeight = Math.min(PANEL_MAX_HEIGHT, spaceBelow)
    top = rect.bottom + MARGIN
  }

  // 兜底：确保不超出视口
  if (top < MARGIN) top = MARGIN
  if (top + maxHeight > window.innerHeight - MARGIN) {
    maxHeight = window.innerHeight - top - MARGIN
  }

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(getNextZIndex())
  }
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    if (panelRef.value && panelRef.value.contains(target)) return
    open.value = false
  }
}

function flatIndex(groupIdx: number, itemIdx: number): number {
  let count = 0
  for (let i = 0; i < displayGroups.value.length; i++) {
    if (i === groupIdx) return count + itemIdx
    count += displayGroups.value[i].items.length
  }
  return -1
}

/* ---------- 键盘导航 ---------- */
const activeIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)

function resetActiveIndex() {
  nextTick(() => {
    if (filteredAccounts.value.length === 0) {
      activeIndex.value = -1
      return
    }
    if (props.modelValue) {
      const flat = filteredAccounts.value
      const idx = flat.findIndex(a => a.id === props.modelValue)
      if (idx !== -1) {
        activeIndex.value = idx
        return
      }
    }
    activeIndex.value = 0
  })
}

function moveSelection(delta: number) {
  const len = filteredAccounts.value.length
  if (len === 0) return
  activeIndex.value = (activeIndex.value + delta + len) % len
  nextTick(() => {
    const el = listRef.value?.children[activeIndex.value] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function selectActive() {
  const account = filteredAccounts.value[activeIndex.value]
  if (account) select(account)
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value || filteredAccounts.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    moveSelection(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    moveSelection(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    selectActive()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    open.value = false
  }
}

// 性能优化：合并 watchers，仅在打开时重置
watch([() => open.value, searchQuery, filteredAccounts], ([isOpen]) => {
  if (isOpen) resetActiveIndex()
}, { flush: 'post' })

// 性能优化：仅在面板打开时添加滚动监听
watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('scroll', updatePanelPosition, true)
  } else {
    window.removeEventListener('scroll', updatePanelPosition, true)
  }
})

// 性能优化：节流 updatePanelPosition
let rafId: number | null = null
function throttledUpdatePanelPosition() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    updatePanelPosition()
    rafId = null
  })
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('resize', throttledUpdatePanelPosition)
  window.addEventListener('keydown', onKeyDown, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', throttledUpdatePanelPosition)
  window.removeEventListener('keydown', onKeyDown, { capture: true } as any)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

/* ---------- 快捷新增 ---------- */
function startQuickAdd() {
  dialogDefaultName.value = searchQuery.value.trim()
  open.value = false
  showAccountDialog.value = true
}

async function handleCreateAccount(data: AccountFormData) {
  try {
    const account = await createAccount(data)
    showAccountDialog.value = false
    searchQuery.value = ''
    emit('update:modelValue', account.id)
  } catch (e) {
    console.error('创建账户失败:', e)
  }
}
</script>

<style scoped>
.account-picker {
  position: relative;
}
.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  cursor: pointer;
  transition: border-color 0.15s ease;
  user-select: none;
}
.picker-trigger:hover {
  border-color: rgba(60, 60, 67, 0.35);
}
.picker-trigger .placeholder {
  color: rgba(60, 60, 67, 0.4);
}
.trigger-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  padding: 2px;
}
.clear-btn:hover {
  color: rgba(60, 60, 67, 0.7);
}
.arrow {
  color: rgba(60, 60, 67, 0.4);
  transition: transform 0.15s ease;
}
.arrow.open {
  transform: rotate(180deg);
}

.picker-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: var(--z-picker);
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
  color: rgba(60, 60, 67, 0.5);
}
.picker-search input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
  color: rgba(0, 0, 0, 0.92);
}
.picker-search input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}

.picker-list {
  overflow-y: auto;
  max-height: 240px;
}
.picker-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.5);
}
.group-header {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.1s ease;
  color: rgba(0, 0, 0, 0.92);
}
.picker-item:hover:not(.disabled) {
  background: rgba(0, 122, 255, 0.08);
}
.picker-item.is-active:not(.disabled) {
  background: rgba(0, 122, 255, 0.14);
}
.picker-item.active {
  color: rgb(0, 122, 255);
  font-weight: 500;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-name {
  color: inherit;
}
.item-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
.item-badge.personal {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}
.item-badge.debit {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}
.item-badge.credit {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}
.item-badge.online {
  background: rgba(90, 200, 250, 0.12);
  color: rgb(0, 122, 255);
}
.item-badge.merchant {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}
.item-badge.contact {
  background: rgba(88, 86, 214, 0.1);
  color: rgb(88, 86, 214);
}
.item-badge.other {
  background: rgba(175, 82, 222, 0.1);
  color: rgb(175, 82, 222);
}
.check-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}

.picker-footer {
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
  padding-top: 8px;
}
.quick-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.quick-add-btn:hover {
  background: rgba(0, 122, 255, 0.08);
}
</style>
