<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" :class="{ mobile: isMobile }" tabindex="-1" @click.stop @keydown="onKeyDown">
        <div class="dialog-header">
          <h3>{{ isEditing ? '编辑项目预算' : '设置项目预算' }}</h3>
          <div class="header-actions">
            <button
              type="button"
              class="history-btn"
              @click="onShowHistory"
              title="查看预算历史"
            >
              <Icon :name="SOLAR_ICONS.doc.text" size="18" />
            </button>
            <button type="button" class="close-btn" @click="onCancel">
              <Icon :name="SOLAR_ICONS.action.close" size="20" />
            </button>
          </div>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>笔记</label>
            <NotePicker
              v-model="form.noteId"
              :options="extendedNoteOptions"
              placeholder="选择笔记"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>预算周期</label>
              <select v-model="form.cycleType" class="form-select">
                <option value="monthly">按月</option>
                <option value="yearly">按年</option>
              </select>
            </div>
            <div class="form-group">
              <label>预算金额</label>
              <input
                v-model.number="form.amount"
                type="number"
                class="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>生效年份</label>
              <input
                v-model.number="form.effectiveFromYear"
                type="number"
                class="form-input"
                min="2020"
                max="2100"
              />
            </div>
            <div class="form-group">
              <label>生效月份</label>
              <input
                v-model.number="form.effectiveFromMonth"
                type="number"
                class="form-input"
                min="1"
                max="12"
              />
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="onCancel">取消</button>
          <button type="button" class="confirm-btn" @click="onConfirm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BudgetEntry, BudgetFormData } from '~/types/bill'
import { useToast } from '~/composables/useToast'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import NotePicker from './NotePicker.vue'

const { isMobile } = useDevice()
const { warning: showWarning } = useToast()

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  visible: boolean
  budget?: BudgetEntry
  noteOptions: NoteOption[]
  defaultNoteId?: string
  defaultYear?: number
  defaultMonth?: number
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

// 扩展笔记选项，添加"无关联"选项
const extendedNoteOptions = computed(() => {
  return [
    { id: '__none__', title: '无关联', level: 0 },
    ...props.noteOptions
  ]
})

const emit = defineEmits<{
  confirm: [data: BudgetFormData]
  cancel: []
  showHistory: [noteId: string]
}>()

const form = ref<BudgetFormData>({
  noteId: '', categoryId: '', cycleType: 'monthly', amount: 0,
  effectiveFromYear: new Date().getFullYear(), effectiveFromMonth: new Date().getMonth() + 1
})

const isEditing = computed(() => !!props.budget)

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.budget) {
    // 从 categoryId 中提取 noteId（去掉 note: 前缀）
    const noteId = props.budget.categoryId.startsWith('note:')
      ? props.budget.categoryId.slice(5)
      : props.budget.noteId
    form.value = {
      noteId,
      categoryId: props.budget.categoryId,
      cycleType: props.budget.cycleType,
      amount: props.budget.amount,
      effectiveFromYear: props.budget.effectiveFromYear,
      effectiveFromMonth: props.budget.effectiveFromMonth
    }
  } else {
    form.value = {
      noteId: props.defaultNoteId || '',
      categoryId: '',
      cycleType: 'monthly',
      amount: 0,
      effectiveFromYear: props.defaultYear ?? new Date().getFullYear(),
      effectiveFromMonth: props.defaultMonth ?? new Date().getMonth() + 1
    }
  }
}, { immediate: true })

function onConfirm() {
  if (!form.value.noteId) {
    showWarning('请选择笔记')
    return
  }
  if (form.value.amount <= 0) {
    showWarning('预算金额必须大于 0')
    return
  }
  // 项目预算使用 note: 前缀
  const data = {
    ...form.value,
    categoryId: `note:${form.value.noteId}`
  }
  emit('confirm', data)
}

function onCancel() {
  emit('cancel')
}

function onShowHistory() {
  if (!form.value.noteId) {
    showWarning('请先选择笔记')
    return
  }
  emit('showHistory', form.value.noteId)
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  }
}

function setNoteId(id: string) {
  form.value = { ...form.value, noteId: id }
}

defineExpose({ setNoteId })
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.history-btn {
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

.history-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.75);
}

.form-input,
.form-select {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.6);
  color: rgba(0, 0, 0, 0.85);
  transition: all 0.15s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: rgb(0, 122, 255);
  background: rgba(255, 255, 255, 0.9);
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
