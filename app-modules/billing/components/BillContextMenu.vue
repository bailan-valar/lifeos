<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div
        v-if="visible"
        class="bill-context-menu-overlay"
        @click="close"
        @contextmenu="handleReposition"
      >
        <div
          class="context-menu"
          :class="{ mobile: isMobile }"
          :style="{ left: `${x}px`, top: `${y}px` }"
          @click.stop
        >
          <!-- 复制账单 -->
          <button
            type="button"
            class="menu-item"
            @click="handleCopy"
          >
            <Icon :name="SOLAR_ICONS.action.copy" size="16" />
            <span>复制账单</span>
          </button>

          <!-- 编辑 -->
          <button
            type="button"
            class="menu-item"
            @click="handleEdit"
          >
            <Icon :name="SOLAR_ICONS.action.edit" size="16" />
            <span>编辑</span>
          </button>

          <!-- 拆分 -->
          <button
            v-if="!bill?.parentId && !bill?.hasChildren"
            type="button"
            class="menu-item"
            @click="handleSplit"
          >
            <Icon :name="SOLAR_ICONS.action.split" size="16" />
            <span>拆分账单</span>
          </button>

          <!-- 分摊 -->
          <button
            v-if="!bill?.parentId && !bill?.hasChildren"
            type="button"
            class="menu-item"
            @click="handleAllocate"
          >
            <Icon :name="SOLAR_ICONS.billing.calendar" size="16" />
            <span>分摊到月份</span>
          </button>

          <!-- 退款 -->
          <button
            v-if="!bill?.isRefund"
            type="button"
            class="menu-item"
            @click="handleRefund"
          >
            <Icon :name="SOLAR_ICONS.action.refresh" size="16" />
            <span>退款</span>
          </button>

          <!-- 关联退款（从支出账单出发，选择收入账单关联为退款） -->
          <button
            v-if="canLinkRefund"
            type="button"
            class="menu-item"
            @click="handleLinkRefund"
          >
            <Icon :name="SOLAR_ICONS.action.link" size="16" />
            <span>关联退款</span>
          </button>

          <!-- 关联为退款（从收入账单出发，选择支出账单作为原始账单） -->
          <button
            v-if="canLinkAsRefund"
            type="button"
            class="menu-item"
            @click="handleLinkAsRefund"
          >
            <Icon :name="SOLAR_ICONS.action.link" size="16" />
            <span>关联为退款</span>
          </button>

          <!-- 报销标记（仅支出账单） -->
          <button
            v-if="bill?.type === 'expense'"
            type="button"
            class="menu-item"
            @click="handleToggleReimbursable"
          >
            <Icon :name="bill.isReimbursable ? SOLAR_ICONS.status.success : SOLAR_ICONS.finance.money" size="16" />
            <span>{{ bill.isReimbursable ? '取消报销' : '标记报销' }}</span>
          </button>

          <!-- 加入报销单（未关联的支出账单） -->
          <button
            v-if="canAddToReimburse"
            type="button"
            class="menu-item"
            @click="handleAddToReimburse"
          >
            <Icon :name="SOLAR_ICONS.action.link" size="16" />
            <span>加入报销单</span>
          </button>

          <!-- 从报销单移除 -->
          <button
            v-if="canRemoveFromReimburse"
            type="button"
            class="menu-item"
            @click="handleRemoveFromReimburse"
          >
            <Icon :name="SOLAR_ICONS.action.link" size="16" />
            <span>从报销单移除</span>
          </button>

          <div class="menu-divider" />

          <!-- 删除 -->
          <button
            type="button"
            class="menu-item danger"
            @click="handleDelete"
          >
            <Icon :name="SOLAR_ICONS.action.delete" size="16" />
            <span>删除</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { Bill } from '~/types/bill'

const props = defineProps<{
  visible: boolean
  bill: Bill | null
  x: number
  y: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  copy: [bill: Bill]
  edit: [bill: Bill]
  split: [bill: Bill]
  allocate: [bill: Bill]
  refund: [bill: Bill]
  'link-refund': [bill: Bill]
  'link-as-refund': [bill: Bill]
  'toggle-reimbursable': [bill: Bill]
  'add-to-reimburse': [bill: Bill]
  'remove-from-reimburse': [bill: Bill]
  delete: [bill: Bill]
  reposition: [x: number, y: number]
}>()

const { isMobile } = useDevice()

const canLinkRefund = computed(() => {
  const b = props.bill
  return b && b.type === 'expense' && !b.isRefund && !b.parentId
})

const canLinkAsRefund = computed(() => {
  const b = props.bill
  return b && b.type === 'income' && !b.isRefund && !b.parentId
})

const canAddToReimburse = computed(() => {
  const b = props.bill
  return b && b.type === 'expense' && !b.reimbursementId && !b.isRefund
})

const canRemoveFromReimburse = computed(() => {
  const b = props.bill
  return b && b.reimbursementId && b.reimbursementRole === 'expense'
})

function close() {
  emit('update:visible', false)
}

function handleReposition(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('reposition', event.clientX, event.clientY)
}

function handleCopy() {
  if (props.bill) {
    emit('copy', props.bill)
    close()
  }
}

function handleEdit() {
  if (props.bill) {
    emit('edit', props.bill)
    close()
  }
}

function handleSplit() {
  if (props.bill) {
    emit('split', props.bill)
    close()
  }
}

function handleAllocate() {
  if (props.bill) {
    emit('allocate', props.bill)
    close()
  }
}

function handleRefund() {
  if (props.bill) {
    emit('refund', props.bill)
    close()
  }
}

function handleLinkRefund() {
  if (props.bill) {
    emit('link-refund', props.bill)
    close()
  }
}

function handleLinkAsRefund() {
  if (props.bill) {
    emit('link-as-refund', props.bill)
    close()
  }
}

function handleToggleReimbursable() {
  if (props.bill) {
    emit('toggle-reimbursable', props.bill)
    close()
  }
}

function handleAddToReimburse() {
  if (props.bill) {
    emit('add-to-reimburse', props.bill)
    close()
  }
}

function handleRemoveFromReimburse() {
  if (props.bill) {
    emit('remove-from-reimburse', props.bill)
    close()
  }
}

function handleDelete() {
  if (props.bill) {
    emit('delete', props.bill)
    close()
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(adjustPosition)
  }
})

onKeyStroke('Escape', close)

function adjustPosition() {
  const menu = document.querySelector('.bill-context-menu-overlay .context-menu') as HTMLElement
  if (!menu) return

  const rect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let adjustedX = props.x
  let adjustedY = props.y

  if (adjustedX + rect.width > viewportWidth) {
    adjustedX = viewportWidth - rect.width - 8
  }
  if (adjustedY + rect.height > viewportHeight) {
    adjustedY = viewportHeight - rect.height - 8
  }
  if (adjustedX < 8) adjustedX = 8
  if (adjustedY < 8) adjustedY = 8

  menu.style.left = `${adjustedX}px`
  menu.style.top = `${adjustedY}px`
}
</script>

<style scoped>
.bill-context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.context-menu {
  position: absolute;
  width: 180px;
  padding: 6px;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.92));
  backdrop-filter: blur(var(--liquid-blur, 20px)) saturate(var(--liquid-saturate, 180%));
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--liquid-radius-button, 14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.context-menu.mobile {
  width: 200px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.85);
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.menu-item.danger {
  color: rgb(255, 59, 48);
}

.menu-item.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.menu-divider {
  height: 0.5px;
  margin: 4px 0;
  background: rgba(60, 60, 67, 0.12);
}

/* 过渡动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease;
}

.menu-fade-enter-active .context-menu,
.menu-fade-leave-active .context-menu {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

.menu-fade-enter-from .context-menu,
.menu-fade-leave-to .context-menu {
  opacity: 0;
  transform: scale(0.95);
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .context-menu {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.08));
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .menu-item {
    color: rgba(255, 255, 255, 0.85);
  }

  .menu-item:hover {
    background: rgba(0, 122, 255, 0.15);
  }

  .menu-divider {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
