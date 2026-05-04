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

        <div class="picker-list">
          <div v-if="displayGroups.length === 0" class="picker-empty">
            无匹配结果
          </div>
          <template v-else>
            <template v-for="group in displayGroups" :key="group.key">
              <div v-if="group.label" class="group-header">{{ group.label }}</div>
              <div
                v-for="account in group.items"
                :key="account.id"
                class="picker-item"
                :class="{ active: modelValue === account.id }"
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
          <div v-if="showQuickAdd" class="quick-add-form">
            <input
              ref="quickAddInputRef"
              v-model="quickAddName"
              placeholder="账户名称"
              @click.stop
              @keyup.enter.prevent="submitQuickAdd"
            />
            <div v-if="needTypeSelect" class="quick-add-type">
              <button
                v-for="t in quickAddTypeOptions"
                :key="t.value"
                type="button"
                class="type-btn"
                :class="{ active: quickAddType === t.value }"
                @click.stop="quickAddType = t.value"
              >
                {{ t.label }}
              </button>
            </div>
            <div class="quick-add-actions">
              <button
                type="button"
                class="btn-confirm"
                :disabled="!quickAddName.trim()"
                @click.stop="submitQuickAdd"
              >
                添加
              </button>
              <button type="button" class="btn-cancel" @click.stop="showQuickAdd = false">
                取消
              </button>
            </div>
          </div>
          <button v-else type="button" class="quick-add-btn" @click.stop="startQuickAdd">
            <Icon name="solar:add-circle-linear" size="14" />
            新增账户
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Account, AccountType, AccountFormData } from '~/types/bill'
import { nextTick, onBeforeUnmount, onMounted } from 'vue'

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
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  create: [data: AccountFormData]
}>()

const placeholder = computed(() => props.placeholder || '请选择账户')
const open = ref(false)
const searchQuery = ref('')
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
  const personal = list.filter(a => a.type === 'personal')
  const merchants = list.filter(a => a.type === 'merchant')
  const contacts = list.filter(a => a.type === 'contact')
  const others = list.filter(a => a.type === 'other')

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
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: '320px'
  }
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    if (panelRef.value && panelRef.value.contains(target)) return
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
})

/* ---------- 快捷新增 ---------- */
const showQuickAdd = ref(false)
const quickAddName = ref('')
const quickAddType = ref<AccountType>('personal')
const quickAddInputRef = ref<HTMLInputElement>()

const allTypeOptions: { value: AccountType; label: string }[] = [
  { value: 'personal', label: '我的账户' },
  { value: 'merchant', label: '商户' },
  { value: 'contact', label: '联系人' },
  { value: 'other', label: '其他' }
]

const needTypeSelect = computed(() => {
  if (!props.allowedTypes || props.allowedTypes.length === 0) return true
  return props.allowedTypes.length > 1
})

const quickAddTypeOptions = computed(() => {
  if (props.allowedTypes && props.allowedTypes.length > 0) {
    return allTypeOptions.filter(t => props.allowedTypes!.includes(t.value))
  }
  return allTypeOptions
})

function startQuickAdd() {
  showQuickAdd.value = true
  quickAddName.value = ''
  if (quickAddTypeOptions.value.length > 0) {
    quickAddType.value = quickAddTypeOptions.value[0].value
  }
  nextTick(() => quickAddInputRef.value?.focus())
}

function submitQuickAdd() {
  const name = quickAddName.value.trim()
  if (!name) return
  const data: AccountFormData = {
    name,
    type: quickAddType.value,
    currency: 'CNY',
    icon: '',
    color: ''
  }
  if (quickAddType.value === 'personal') {
    data.subtype = 'cash'
  }
  emit('create', data)
  quickAddName.value = ''
  showQuickAdd.value = false
  open.value = false
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
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
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
.picker-item:hover {
  background: rgba(0, 122, 255, 0.08);
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
.quick-add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-add-form input {
  padding: 8px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  color: rgba(0, 0, 0, 0.92);
  background: rgba(255, 255, 255, 0.8);
}
.quick-add-form input:focus {
  border-color: rgb(0, 122, 255);
}
.quick-add-type {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.quick-add-type .type-btn {
  flex: 1;
  min-width: 60px;
  padding: 6px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgba(0, 0, 0, 0.92);
}
.quick-add-type .type-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.quick-add-actions {
  display: flex;
  gap: 8px;
}
.btn-confirm,
.btn-cancel {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-confirm {
  background: rgb(0, 122, 255);
  color: white;
}
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-cancel {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}
</style>
