<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" :class="{ mobile: isMobile }" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click="onCancel">
      <div class="dialog" :class="{ mobile: isMobile }" tabindex="-1" @click.stop @keydown="onKeyDown">
        <div class="dialog-header">
          <h3>{{ isEditing ? '编辑账户' : '添加账户' }}</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon name="solar:close-circle-linear" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <AccountForm v-model="form" :categories="categories" />
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
import type { Account, AccountFormData, BillCategory, AccountType } from '~/types/bill'
import { useToast } from '~/composables/useToast'
import { useZIndexOnOpen } from '~/composables/useZIndex'
import AccountForm from './AccountForm.vue'

const { isMobile } = useDevice()
const { warning: showWarning } = useToast()

const props = defineProps<{
  visible: boolean
  account?: Account
  categories?: BillCategory[]
  defaultName?: string
  defaultType?: AccountType
}>()
const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  confirm: [data: AccountFormData, isEditing: boolean, id?: string]
  cancel: []
}>()

const form = ref<AccountFormData>({
  name: '', type: 'personal', currency: 'CNY', icon: '', color: '', subtype: 'cash', aliases: []
})

const isEditing = computed(() => !!props.account)

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.account) {
    const base: AccountFormData = {
      name: props.account.name,
      type: props.account.type,
      currency: props.account.currency,
      icon: props.account.icon || '',
      color: props.account.color || '',
      aliases: Array.isArray(props.account.aliases) ? [...props.account.aliases] : [],
      categoryId: props.account.categoryId
    }
    if (props.account.type === 'personal') {
      base.subtype = props.account.subtype || 'cash'
      if (base.subtype === 'credit_card') {
        base.creditLimit = props.account.creditLimit ?? 0
        base.billingDay = props.account.billingDay ?? 1
        base.repaymentDay = props.account.repaymentDay ?? 1
      }
    }
    form.value = base
  } else {
    form.value = {
      name: props.defaultName || '',
      type: props.defaultType || 'personal',
      currency: 'CNY',
      icon: '',
      color: '',
      subtype: 'cash',
      aliases: []
    }
  }
}, { immediate: true })

function onConfirm() {
  if (!form.value.name.trim()) {
    showWarning('请输入账户名称')
    return
  }
  emit('confirm', form.value, isEditing.value, props.account?.id)
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
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
