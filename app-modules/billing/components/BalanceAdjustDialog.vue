<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" :class="{ mobile: isMobile }" tabindex="-1" @click.stop @keydown="onKeyDown">
        <div class="dialog-header">
          <h3>调整余额</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">当前余额</label>
            <div class="current-balance">{{ formatBalance(currentBalance) }} {{ account?.currency }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">调整时间</label>
            <DateTimePicker v-model="form.date" />
          </div>
          <div class="form-group">
            <label class="form-label">调整后余额</label>
            <AmountInput v-model="form.balance" placeholder="输入调整后余额" :allow-negative="true" />
          </div>
          <div class="form-group">
            <label class="form-label">备注（可选）</label>
            <input v-model="form.note" class="form-input" type="text" placeholder="如：银行对账、初始化" />
          </div>
          <div v-if="props.adjustments && props.adjustments.length > 0" class="history-section">
            <div class="history-title">调整历史</div>
            <BalanceAdjustHistory
              :adjustments="props.adjustments"
              @delete="(id) => $emit('delete-record', id)"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="cancel-btn" @click="onCancel">取消</button>
          <button type="button" class="confirm-btn" :disabled="!canConfirm" @click="onConfirm">确认调整</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Account, BalanceAdjustment } from '~/types/bill'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import DateTimePicker from './DateTimePicker.vue'
import BalanceAdjustHistory from './BalanceAdjustHistory.vue'
import AmountInput from './AmountInput.vue'

const { isMobile } = useDevice()

const props = defineProps<{
  visible: boolean
  account?: Account
  adjustments?: BalanceAdjustment[]
}>()

const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  confirm: [data: { date: string; balance: number; note: string }]
  cancel: []
  'delete-record': [id: string]
}>()

const form = ref({
  date: new Date().toISOString().slice(0, 16),
  balance: 0,
  note: ''
})

const currentBalance = computed(() => props.account?.balance ?? 0)

watch(() => props.visible, (v) => {
  if (!v) return
  form.value = {
    date: new Date().toISOString().slice(0, 16),
    balance: currentBalance.value,
    note: ''
  }
}, { immediate: true })

const canConfirm = computed(() => {
  return form.value.balance !== currentBalance.value && props.account
})

function onConfirm() {
  if (!canConfirm.value) return
  emit('confirm', {
    date: form.value.date,
    balance: Number(form.value.balance),
    note: form.value.note.trim()
  })
}

function onCancel() {
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  }
}

function formatBalance(n: number) {
  return n.toFixed(2)
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
.current-balance {
  padding: 10px 12px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  font-feature-settings: 'tnum';
}
.form-input {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  font-family: inherit;
}
.form-input:focus {
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
.history-section {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}
.history-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
