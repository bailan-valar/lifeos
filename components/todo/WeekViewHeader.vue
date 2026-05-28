<template>
  <header class="week-header">
    <div class="header-left">
      <button class="nav-btn" @click="$emit('prevWeek')" title="上一周">
        <Icon :name="ICONS.altArrowLeft" size="20" />
      </button>
      <button class="nav-btn" @click="$emit('nextWeek')" title="下一周">
        <Icon :name="ICONS.altArrowRight" size="20" />
      </button>
      <div class="week-info">
        <span class="week-text">{{ weekTitle }} · {{ weekRange }}</span>
      </div>
    </div>
    <div class="header-right">
      <button
        v-if="!isCurrentWeek"
        class="action-btn"
        @click="$emit('goToday')"
      >
        <Icon :name="ICONS.calendar" size="16" />
        今天
      </button>
      <button class="action-btn" @click="$emit('openSettings')" title="设置">
        <Icon name="solar:settings-linear" size="18" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ICONS } from '~/composables/useIcons'

interface Props {
  weekStart: Date
  timeStart?: number
  timeEnd?: number
  colorMode?: string
}

const props = withDefaults(defineProps<Props>(), {
  timeStart: 8,
  timeEnd: 23,
  colorMode: 'priority'
})

const emit = defineEmits<{
  prevWeek: []
  nextWeek: []
  goToday: []
  openSettings: []
}>()

// 格式化本地日期为 YYYY-MM-DD
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = new Date()

const weekTitle = computed(() => {
  const start = new Date(props.weekStart)
  const end = new Date(props.weekStart)
  end.setDate(end.getDate() + 6)

  if (start.getMonth() === end.getMonth()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月`
  } else {
    return `${start.getMonth() + 1}月 - ${end.getMonth() + 1}月`
  }
})

const weekRange = computed(() => {
  const start = new Date(props.weekStart)
  const end = new Date(props.weekStart)
  end.setDate(end.getDate() + 6)

  const format = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
  return `${format(start)} - ${format(end)}`
})

const isCurrentWeek = computed(() => {
  const weekEnd = new Date(props.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return today >= props.weekStart && today <= weekEnd
})
</script>

<style scoped>
.week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.3);
  min-height: 44px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--liquid-radius-button, 14px);
  background: transparent;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.nav-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.9);
}

.week-info {
  display: flex;
  align-items: center;
}

.week-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
  white-space: nowrap;
}

.header-right {
  display: flex;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button, 14px);
  background: rgba(255, 255, 255, 0.5);
  color: rgba(60, 60, 67, 0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.action-btn:hover {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .week-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.08);
  }

  .nav-btn {
    color: rgba(255, 255, 255, 0.6);
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .week-text {
    color: rgba(255, 255, 255, 0.85);
  }

  .action-btn {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
