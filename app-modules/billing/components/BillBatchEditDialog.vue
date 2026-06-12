<template>
  <Teleport to="body">
    <div class="dialog-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="$emit('cancel')">
    <div class="dialog" :class="{ mobile: isMobile }" @click.stop>
      <div class="dialog-header">
        <h3>批量修改</h3>
        <button type="button" class="close-btn" @click="$emit('cancel')">
          <Icon name="solar:close-circle-linear" size="20" />
        </button>
      </div>
      <div class="dialog-body">
        <div class="edit-field">
          <label class="field-toggle">
            <input v-model="editCategory" type="checkbox" />
            <span>修改分类</span>
          </label>
          <CategoryPicker
            v-if="editCategory"
            v-model="categoryId"
            :categories="categories"
            :placeholder="categoryPlaceholder"
          />
          <div v-if="mixedTypesWarning" class="field-warning">
            选中的账单类型不一致，修改分类可能导致类型不匹配
          </div>
        </div>

        <div class="edit-field">
          <label class="field-toggle">
            <input v-model="editFromAccount" type="checkbox" />
            <span>修改出账账户</span>
          </label>
          <AccountPicker
            v-if="editFromAccount"
            v-model="fromAccountId"
            :accounts="accounts"
            :allowed-types="['personal']"
            placeholder="选择出账账户"
          />
        </div>

        <div class="edit-field">
          <label class="field-toggle">
            <input v-model="editToAccount" type="checkbox" />
            <span>修改入账账户</span>
          </label>
          <AccountPicker
            v-if="editToAccount"
            v-model="toAccountId"
            :accounts="accounts"
            :allowed-types="['personal']"
            placeholder="选择入账账户"
          />
        </div>

        <div class="edit-field">
          <label class="field-toggle">
            <input v-model="editDescription" type="checkbox" />
            <span>修改描述</span>
          </label>
          <template v-if="editDescription">
            <div class="desc-mode">
              <button
                v-for="mode in descModes"
                :key="mode.value"
                type="button"
                class="mode-btn"
                :class="{ active: descMode === mode.value }"
                @click="descMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
            <div class="mode-hint">{{ modeHint }}</div>
            <input
              v-model="description"
              type="text"
              class="desc-input"
              :placeholder="descPlaceholder"
            />
          </template>
        </div>

        <div class="edit-field">
          <label class="field-toggle">
            <input v-model="editNote" type="checkbox" />
            <span>修改绑定笔记</span>
          </label>
          <NotePicker
            v-if="editNote"
            v-model="noteId"
            :options="noteOptions"
            placeholder="选择笔记"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="cancel-btn" @click="$emit('cancel')">取消</button>
        <button type="button" class="confirm-btn" :disabled="!hasAnyEdit" @click="handleConfirm">
          确认修改
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Bill, BillCategory, Account } from '~/types/bill'
import { getNextZIndex } from '~/composables/useZIndex'
import CategoryPicker from './CategoryPicker.vue'
import AccountPicker from './AccountPicker.vue'
import NotePicker from './NotePicker.vue'

const { isMobile } = useDevice()

const overlayZIndex = ref<number | undefined>(undefined)
onMounted(() => {
  overlayZIndex.value = getNextZIndex()
})

const props = defineProps<{
  selectedBills: Bill[]
  accounts: Account[]
  categories: BillCategory[]
  noteOptions: { id: string; title: string; level: number }[]
}>()

const emit = defineEmits<{
  confirm: [data: { categoryId?: string; fromAccountId?: string; toAccountId?: string; description?: string; descMode?: 'replace' | 'prefix' | 'suffix'; noteId?: string }]
  cancel: []
}>()

const editCategory = ref(false)
const categoryId = ref('')

const editFromAccount = ref(false)
const fromAccountId = ref('')

const editToAccount = ref(false)
const toAccountId = ref('')

const editDescription = ref(false)
const descMode = ref<'replace' | 'prefix' | 'suffix'>('replace')
const description = ref('')

const editNote = ref(false)
const noteId = ref('')

const descModes = [
  { value: 'replace' as const, label: '替换' },
  { value: 'prefix' as const, label: '追加前缀' },
  { value: 'suffix' as const, label: '追加后缀' },
]

const selectedTypes = computed(() => new Set(props.selectedBills.map(b => b.type)))
const mixedTypesWarning = computed(() => editCategory.value && selectedTypes.value.size > 1)

const categoryPlaceholder = computed(() => {
  if (selectedTypes.value.size === 1) {
    const t = Array.from(selectedTypes.value)[0]
    return t === 'income' ? '选择收入分类' : '选择支出分类'
  }
  return '选择分类'
})

const descPlaceholder = computed(() => {
  if (descMode.value === 'replace') return '新描述'
  if (descMode.value === 'prefix') return '前缀内容'
  return '后缀内容'
})

const modeHint = computed(() => {
  if (descMode.value === 'replace') return '将所有选中账单的描述替换为上方输入的内容'
  if (descMode.value === 'prefix') return '在原有描述前面追加上方输入的内容'
  return '在原有描述后面追加上方输入的内容'
})

const hasAnyEdit = computed(() => {
  if (editCategory.value && categoryId.value) return true
  if (editFromAccount.value && fromAccountId.value) return true
  if (editToAccount.value && toAccountId.value) return true
  if (editDescription.value && description.value) return true
  if (editNote.value && noteId.value) return true
  return false
})

function handleConfirm() {
  const result: { categoryId?: string; fromAccountId?: string; toAccountId?: string; description?: string; descMode?: 'replace' | 'prefix' | 'suffix'; noteId?: string } = {}
  if (editCategory.value && categoryId.value) {
    result.categoryId = categoryId.value
  }
  if (editFromAccount.value && fromAccountId.value) {
    result.fromAccountId = fromAccountId.value
  }
  if (editToAccount.value && toAccountId.value) {
    result.toAccountId = toAccountId.value
  }
  if (editDescription.value && description.value) {
    result.description = description.value
    result.descMode = descMode.value
  }
  if (editNote.value && noteId.value) {
    result.noteId = noteId.value
  }
  emit('confirm', result)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-nested);
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
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}
.dialog.mobile {
  overflow: hidden;
  width: 100%;
  max-height: 90vh;
  border-radius: 20px 20px 0 0;
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
}
.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.edit-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
  user-select: none;
}
.field-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}
.field-warning {
  font-size: 12px;
  color: rgb(255, 149, 0);
  padding: 4px 8px;
  background: rgba(255, 149, 0, 0.08);
  border-radius: 6px;
}
.desc-mode {
  display: flex;
  gap: 6px;
}
.mode-btn {
  flex: 1;
  padding: 6px 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgba(0, 0, 0, 0.78);
}
.mode-btn.active {
  border-color: rgb(0, 122, 255);
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
  font-weight: 600;
}
.mode-hint {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.55);
  line-height: 1.4;
}
.desc-input {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
}
.desc-input:focus {
  border-color: rgb(0, 122, 255);
}
.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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
