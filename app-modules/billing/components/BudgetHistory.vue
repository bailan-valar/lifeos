<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="dialog-overlay"
      :class="{ mobile: isMobile }"
      :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined"
      @click="onCancel"
    >
      <div class="dialog" :class="{ mobile: isMobile }" tabindex="-1" @click.stop @keydown="onKeyDown">
        <div class="dialog-header">
          <h3>预算历史</h3>
          <button type="button" class="close-btn" @click="onCancel">
            <Icon :name="SOLAR_ICONS.action.close" size="20" />
          </button>
        </div>
        <div class="dialog-body">
          <div v-if="categoryName" class="category-info">
            <span class="category-name">{{ categoryName }}</span>
            <span v-if="noteName" class="note-name">({{ noteName }})</span>
          </div>

          <div v-if="historyEntries.length === 0" class="empty-state">
            <Icon :name="SOLAR_ICONS.doc.text" size="48" />
            <p>暂无预算历史</p>
          </div>

          <div v-else class="history-list">
            <div
              v-for="(entry, index) in historyEntries"
              :key="entry.id"
              class="history-item"
              :class="{ current: entry.id === currentBudgetId }"
            >
              <div class="timeline-line" v-if="index < historyEntries.length - 1"></div>
              <div class="timeline-dot"></div>
              <div class="entry-content">
                <div class="entry-header">
                  <span class="entry-period">{{ formatPeriod(entry) }}</span>
                  <span v-if="entry.id === currentBudgetId" class="current-badge">当前</span>
                </div>
                <div class="entry-details">
                  <div class="detail-item">
                    <Icon :name="SOLAR_ICONS.finance.money" size="16" />
                    <span class="amount">{{ formatAmount(entry.amount) }}</span>
                    <span class="cycle-type">{{ formatCycleType(entry.cycleType) }}</span>
                  </div>
                </div>
                <div class="entry-time">{{ formatTime(entry.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button type="button" class="confirm-btn" @click="onCancel">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { BudgetEntry, BillCategory } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'
import { useZIndexOnOpen } from '~/composables/useZIndex'

const { isMobile } = useDevice()

interface NoteOption {
  id: string
  title: string
  level: number
}

const props = defineProps<{
  visible: boolean
  categoryId: string
  categoryName: string
  noteId: string
  noteOptions: NoteOption[]
  currentBudgetId?: string
  historyEntries: BudgetEntry[]
}>()

const overlayZIndex = useZIndexOnOpen(() => props.visible)

const emit = defineEmits<{
  cancel: []
}>()

const noteName = computed(() => {
  const note = props.noteOptions.find(n => n.id === props.noteId)
  return note?.title || ''
})

function formatPeriod(entry: BudgetEntry): string {
  return `${entry.effectiveFromYear}年${entry.effectiveFromMonth}月起`
}

function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

function formatCycleType(cycleType: string): string {
  return cycleType === 'monthly' ? '/月' : '/年'
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function onCancel() {
  emit('cancel')
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
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
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
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

.category-info {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
}

.note-name {
  margin-left: 8px;
  font-size: 14px;
  color: rgba(60, 60, 67, 0.6);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(60, 60, 67, 0.4);
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

.history-list {
  position: relative;
  padding: 8px 0;
}

.history-item {
  position: relative;
  padding-left: 32px;
  padding-bottom: 20px;
}

.history-item:last-child {
  padding-bottom: 0;
}

.timeline-line {
  position: absolute;
  left: 7px;
  top: 24px;
  bottom: -4px;
  width: 2px;
  background: rgba(60, 60, 67, 0.12);
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  border: 3px solid rgba(0, 122, 255, 0.3);
}

.history-item.current .timeline-dot {
  border-color: rgb(0, 122, 255);
  background: rgb(0, 122, 255);
}

.entry-content {
  background: var(--liquid-bg-thin);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s ease;
}

.history-item.current .entry-content {
  background: rgba(0, 122, 255, 0.08);
  border: 1px solid rgba(0, 122, 255, 0.2);
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.entry-period {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.current-badge {
  padding: 2px 8px;
  background: rgb(0, 122, 255);
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
}

.entry-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.amount {
  font-size: 16px;
  font-weight: 600;
  color: rgb(0, 122, 255);
}

.cycle-type {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.6);
  margin-left: 4px;
}

.entry-time {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
}

.dialog-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.12);
}

.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
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
