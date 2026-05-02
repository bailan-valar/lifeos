<template>
  <div class="billing-view">
    <div class="billing-header">
      <h3>账单管理</h3>
      <button class="add-btn" type="button" @click="openAddDialog">
        <Icon name="solar:add-circle-linear" size="20" />
        添加账单
      </button>
    </div>

    <div class="billing-list">
      <div
        v-for="bill in sortedBills"
        :key="bill.id"
        class="bill-item"
        :class="{ paid: bill.paid, overdue: isOverdue(bill) }"
      >
        <div class="bill-main">
          <div class="bill-title">{{ bill.title }}</div>
          <div class="bill-amount">
            <span class="amount">{{ formatAmount(bill.amount) }}</span>
            <span class="currency">{{ bill.currency }}</span>
          </div>
        </div>

        <div class="bill-meta">
          <div class="bill-due-date">
            <Icon name="solar:calendar-linear" size="14" />
            <span>到期：{{ formatDate(bill.dueDate) }}</span>
          </div>
          <div v-if="bill.paid" class="bill-status paid">已支付</div>
          <div v-else-if="isOverdue(bill)" class="bill-status overdue">已逾期</div>
          <div v-else class="bill-status pending">待支付</div>
        </div>

        <div class="bill-actions">
          <button
            v-if="!bill.paid"
            class="action-btn pay-btn"
            type="button"
            @click="markAsPaid(bill)"
          >
            标记已付
          </button>
          <button class="action-btn edit-btn" type="button" @click="editBill(bill)">
            <Icon name="solar:pen-linear" size="14" />
          </button>
          <button class="action-btn delete-btn" type="button" @click="deleteBill(bill.id)">
            <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
          </button>
        </div>
      </div>

      <div v-if="sortedBills.length === 0" class="empty-state">
        <Icon name="solar:wallet-money-linear" size="48" />
        <p>暂无账单记录</p>
        <button class="empty-add-btn" type="button" @click="openAddDialog">
          添加第一个账单
        </button>
      </div>
    </div>

    <div v-if="sortedBills.length > 0" class="billing-footer">
      <div class="billing-summary">
        <div class="summary-item">
          <span class="summary-label">总金额：</span>
          <span class="summary-value">{{ totalAmount }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">已支付：</span>
          <span class="summary-value paid">{{ paidAmount }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">待支付：</span>
          <span class="summary-value pending">{{ pendingAmount }}</span>
        </div>
      </div>
    </div>

    <div v-if="dialogVisible" class="dialog-overlay" @click="closeDialog">
      <div class="bill-dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ editingBill ? '编辑账单' : '添加账单' }}</h3>
          <button class="close-btn" type="button" @click="closeDialog">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>

        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input
              v-model="billForm.title"
              class="form-input"
              type="text"
              placeholder="输入账单标题"
            />
          </div>

          <div class="form-group">
            <label class="form-label">金额</label>
            <div class="amount-input-group">
              <input
                v-model="billForm.amount"
                class="form-input amount-input"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              <select v-model="billForm.currency" class="form-select">
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">到期日期</label>
            <input
              v-model="billForm.dueDate"
              class="form-input"
              type="date"
            />
          </div>

          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea
              v-model="billForm.note"
              class="form-textarea"
              placeholder="输入备注信息（可选）"
              rows="3"
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button class="cancel-btn" type="button" @click="closeDialog">
            取消
          </button>
          <button class="confirm-btn" type="button" @click="saveBill">
            {{ editingBill ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useModuleBase } from '~/composables/useModuleBase'

interface BillItem {
  id: string
  title: string
  amount: number
  currency: string
  dueDate: string
  paid: boolean
  note?: string
  createdAt: string
}

interface ModuleBaseProps {
  noteId: string
  moduleData?: { bills: BillItem[] } | undefined
  onDataChange?: (data: unknown) => void
}

const props = defineProps<ModuleBaseProps>()

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'error', error: Error): void
  (e: 'data-change', data: unknown): void
}>()

const { internalData, handleDataChange, handleError, markReady } = useModuleBase(props, emit)

const bills = ref<BillItem[]>([])
const dialogVisible = ref(false)
const editingBill = ref<BillItem | null>(null)

const billForm = ref({
  title: '',
  amount: 0,
  currency: 'CNY',
  dueDate: new Date().toISOString().split('T')[0],
  note: ''
})

const sortedBills = computed(() => {
  return [...bills.value].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
})

const totalAmount = computed(() => {
  const sum = bills.value.reduce((acc, b) => acc + b.amount, 0)
  return formatAmount(sum)
})

const paidAmount = computed(() => {
  const sum = bills.value.filter((b) => b.paid).reduce((acc, b) => acc + b.amount, 0)
  return formatAmount(sum)
})

const pendingAmount = computed(() => {
  const sum = bills.value.filter((b) => !b.paid).reduce((acc, b) => acc + b.amount, 0)
  return formatAmount(sum)
})

const loadBills = () => {
  try {
    const data = internalData.value as { bills: BillItem[] } | undefined
    if (data?.bills && Array.isArray(data.bills)) {
      bills.value = data.bills
    } else {
      bills.value = []
    }
    markReady()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const openAddDialog = () => {
  editingBill.value = null
  billForm.value = {
    title: '',
    amount: 0,
    currency: 'CNY',
    dueDate: new Date().toISOString().split('T')[0],
    note: ''
  }
  dialogVisible.value = true
}

const editBill = (bill: BillItem) => {
  editingBill.value = bill
  billForm.value = {
    title: bill.title,
    amount: bill.amount,
    currency: bill.currency,
    dueDate: bill.dueDate,
    note: bill.note || ''
  }
  dialogVisible.value = true
}

const saveBill = () => {
  if (!billForm.value.title || billForm.value.amount <= 0) {
    return
  }

  try {
    if (editingBill.value) {
      const index = bills.value.findIndex((b) => b.id === editingBill.value!.id)
      if (index !== -1) {
        bills.value[index] = {
          ...editingBill.value,
          ...billForm.value
        }
      }
    } else {
      const newBill: BillItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        title: billForm.value.title,
        amount: billForm.value.amount,
        currency: billForm.value.currency,
        dueDate: billForm.value.dueDate,
        paid: false,
        note: billForm.value.note,
        createdAt: new Date().toISOString()
      }
      bills.value.push(newBill)
    }
    handleDataChange({ bills: [...bills.value] })
    closeDialog()
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const markAsPaid = (bill: BillItem) => {
  try {
    bill.paid = true
    handleDataChange({ bills: [...bills.value] })
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const deleteBill = (id: string) => {
  bills.value = bills.value.filter((b) => b.id !== id)
  try {
    handleDataChange({ bills: [...bills.value] })
  } catch (e) {
    handleError(e instanceof Error ? e : new Error(String(e)))
  }
}

const closeDialog = () => {
  dialogVisible.value = false
  editingBill.value = null
}

const formatAmount = (amount: number) => {
  return amount.toFixed(2)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const isOverdue = (bill: BillItem) => {
  if (bill.paid) return false
  const now = new Date()
  const due = new Date(bill.dueDate)
  return due < now
}

watch(() => props.moduleData, (newData) => {
  if (newData) {
    loadBills()
  }
}, { immediate: true })
</script>

<style scoped>
.billing-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 16px;
}

.billing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.billing-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.add-btn:hover {
  background: rgb(0, 110, 250);
}

.add-btn:active {
  transform: scale(0.96);
}

.billing-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.bill-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 12px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.bill-item:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(60, 60, 67, 0.18);
}

.bill-item.paid {
  opacity: 0.6;
  border-color: rgba(52, 199, 89, 0.3);
  background: rgba(52, 199, 89, 0.04);
}

.bill-item.overdue {
  border-color: rgba(255, 59, 48, 0.5);
  background: rgba(255, 59, 48, 0.04);
}

.bill-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.bill-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.bill-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.amount {
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.currency {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.6);
}

.bill-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.bill-due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
}

.bill-status {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.bill-status.paid {
  background: rgba(52, 199, 89, 0.15);
  color: rgb(52, 199, 89);
}

.bill-status.overdue {
  background: rgba(255, 59, 48, 0.15);
  color: rgb(255, 59, 48);
}

.bill-status.pending {
  background: rgba(255, 149, 0, 0.15);
  color: rgb(255, 149, 0);
}

.bill-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.pay-btn {
  background: rgb(52, 199, 89);
  color: white;
}

.pay-btn:hover {
  background: rgb(46, 160, 67);
}

.edit-btn {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
}

.edit-btn:hover {
  background: rgba(0, 122, 255, 0.16);
}

.delete-btn {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.16);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.empty-add-btn {
  padding: 10px 20px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.empty-add-btn:hover {
  background: rgb(0, 110, 250);
}

.billing-footer {
  padding-top: 12px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.billing-summary {
  display: flex;
  gap: 20px;
  justify-content: space-around;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.summary-value.paid {
  color: rgb(52, 199, 89);
}

.summary-value.pending {
  color: rgb(255, 149, 0);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.bill-dialog {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border-radius: 16px;
  overflow: hidden;
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
  color: rgba(0, 0, 0, 0.92);
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
  transition: background-color 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
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

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: rgb(0, 122, 255);
  background: rgba(255, 255, 255, 1);
}

.amount-input-group {
  display: flex;
  gap: 8px;
}

.amount-input {
  flex: 1;
}

.form-select {
  min-width: 80px;
  cursor: pointer;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cancel-btn {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.78);
}

.cancel-btn:hover {
  background: rgba(60, 60, 67, 0.16);
}

.confirm-btn {
  background: rgb(0, 122, 255);
  color: white;
}

.confirm-btn:hover {
  background: rgb(0, 110, 250);
}
</style>
