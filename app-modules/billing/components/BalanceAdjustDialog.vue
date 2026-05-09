<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" tabindex="-1" @click.stop @keydown="onKeyDown">
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
            <input
              v-model.number="form.balance"
              class="form-input"
              type="number"
              step="0.01"
              placeholder="输入调整后余额"
            />
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}
.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
}
.dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
