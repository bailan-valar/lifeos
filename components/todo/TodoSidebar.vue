<template>
  <aside class="todo-sidebar">
    <!-- 视图切换 -->
    <div class="sidebar-section">
      <h4 class="section-title">视图</h4>
      <nav class="view-tabs">
        <button
          v-for="view in views"
          :key="view.id"
          class="view-tab"
          :class="{ active: modelValue === view.id }"
          @click="$emit('update:modelValue', view.id)"
        >
          <Icon :name="view.icon" size="18" />
          <span>{{ view.label }}</span>
          <span v-if="view.count !== undefined" class="view-count">{{ view.count }}</span>
        </button>
      </nav>
    </div>

    <!-- 分组方式 -->
    <div class="sidebar-section">
      <h4 class="section-title">分组</h4>
      <SelectPicker
        :model-value="groupBy"
        :options="groupOptions"
        @update:model-value="(v) => $emit('update:groupBy', v as GroupBy)"
      />
    </div>

    <!-- 排序方式 -->
    <div class="sidebar-section">
      <h4 class="section-title">排序</h4>
      <SelectPicker
        :model-value="sortBy"
        :options="sortOptions"
        @update:model-value="(v) => $emit('update:sortBy', v as SortBy)"
      />
    </div>

    <!-- 状态筛选 -->
    <div class="sidebar-section">
      <div class="section-header">
        <h4 class="section-title">状态</h4>
        <div class="header-actions">
          <button
            v-if="hasStatusFilter"
            class="clear-btn"
            @click="$emit('clearStatus')"
          >
            清除
          </button>
          <button
            class="icon-btn"
            title="管理状态"
            @click="$emit('manageStatus')"
          >
            <Icon name="solar:settings-linear" size="14" />
          </button>
        </div>
      </div>
      <div class="filter-chips">
        <button
          v-for="status in statuses"
          :key="status.id"
          class="filter-chip"
          :class="{ active: activeStatuses.includes(status.id) }"
          :style="{ borderColor: activeStatuses.includes(status.id) ? status.color : undefined }"
          @click="$emit('toggleStatus', status.id)"
        >
          <Icon :name="status.icon || ICONS.round" size="14" />
          {{ status.name }}
        </button>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="sidebar-section">
      <div class="section-header">
        <h4 class="section-title">类型</h4>
        <div class="header-actions">
          <button
            v-if="hasTypeFilter"
            class="clear-btn"
            @click="$emit('clearType')"
          >
            清除
          </button>
          <button
            class="icon-btn"
            title="管理类型"
            @click="$emit('manageType')"
          >
            <Icon name="solar:folder-linear" size="14" />
          </button>
        </div>
      </div>
      <div class="filter-chips">
        <button
          v-for="type in types"
          :key="type.id"
          class="filter-chip"
          :class="{ active: activeTypes.includes(type.id) }"
          :style="{ borderColor: activeTypes.includes(type.id) ? type.color : undefined }"
          @click="$emit('toggleType', type.id)"
        >
          <Icon :name="type.icon || ICONS.folder" size="14" />
          {{ type.name }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import { useTodoStatus } from '~/composables/useTodoStatus'
import { useTodoTypes } from '~/composables/useTodoTypes'
import type { ViewMode, GroupBy, SortBy } from '~/stores/todo'
import type { TodoStatus, TodoType } from '~/types/todo'

interface Props {
  modelValue: ViewMode
  groupBy: GroupBy
  sortBy: SortBy
  stats?: {
    all: number
    today: number
    week: number
    overdue: number
    important: number
    completed: number
  }
  activeStatuses?: string[]
  activeTypes?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  activeStatuses: () => [],
  activeTypes: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ViewMode): void
  (e: 'update:groupBy', value: GroupBy): void
  (e: 'update:sortBy', value: SortBy): void
  (e: 'toggleStatus', statusId: string): void
  (e: 'clearStatus'): void
  (e: 'toggleType', typeId: string): void
  (e: 'clearType'): void
  (e: 'manageStatus'): void
  (e: 'manageType'): void
}>()

const { statuses } = useTodoStatus()
const { defaultTypes: types } = useTodoTypes()

const views = computed(() => [
  { id: 'project' as ViewMode, label: '项目', icon: ICONS.layers, count: props.stats?.all },
  { id: 'all' as ViewMode, label: '全部', icon: ICONS.list, count: props.stats?.all },
  { id: 'today' as ViewMode, label: '今日', icon: ICONS.calendar, count: props.stats?.today },
  { id: 'week' as ViewMode, label: '周视图', icon: ICONS.calendar, count: props.stats?.week },
  { id: 'overdue' as ViewMode, label: '逾期', icon: ICONS.dangerCircle, count: props.stats?.overdue },
  { id: 'important' as ViewMode, label: '重要', icon: ICONS.starCircle, count: props.stats?.important }
])

const groupOptions = computed(() => [
  { label: '不分组', value: 'none' },
  { label: '按日期', value: 'date' },
  { label: '按笔记', value: 'note' },
  { label: '按状态', value: 'status' },
  { label: '按优先级', value: 'priority' }
])

const sortOptions = computed(() => [
  { label: '创建时间', value: 'created' },
  { label: '截止日期', value: 'dueDate' },
  { label: '优先级', value: 'priority' },
  { label: '任务名称', value: 'name' }
])

const hasStatusFilter = computed(() => props.activeStatuses.length > 0)
const hasTypeFilter = computed(() => props.activeTypes.length > 0)
</script>

<style scoped>
.todo-sidebar {
  width: 240px;
  padding: 16px;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.15));
  backdrop-filter: blur(var(--liquid-blur, 20px)) saturate(var(--liquid-saturate, 180%));
  border-right: 0.5px solid rgba(60, 60, 67, 0.12);
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

.clear-btn {
  padding: 2px 8px;
  font-size: 11px;
  background: transparent;
  border: none;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.clear-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.8);
}

/* 视图切换 */
.view-tabs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--liquid-radius-button, 14px);
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.75);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.view-tab:hover {
  background: rgba(60, 60, 67, 0.08);
  color: rgba(0, 0, 0, 0.9);
}

.view-tab.active {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 122, 255);
  font-weight: 600;
}

.view-count {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(60, 60, 67, 0.1);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.view-tab.active .view-count {
  background: rgba(0, 122, 255, 0.2);
  color: rgb(0, 122, 255);
}

/* 筛选标签 */
.filter-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.filter-chip:hover {
  background: rgba(60, 60, 67, 0.05);
  border-color: rgba(60, 60, 67, 0.25);
}

.filter-chip.active {
  background: currentColor;
  background-color: currentColor;
  opacity: 0.15;
  font-weight: 500;
}

/* SelectPicker 样式覆盖 */
:deep(.select-picker) {
  width: 100%;
}

:deep(.select-picker-trigger) {
  background: rgba(255, 255, 255, 0.5);
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: var(--liquid-radius-button, 14px);
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .todo-sidebar {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.08));
    border-right-color: rgba(255, 255, 255, 0.1);
  }

  .section-title {
    color: rgba(255, 255, 255, 0.6);
  }

  .view-tab {
    color: rgba(255, 255, 255, 0.75);
  }

  .view-tab:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .filter-chip {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .filter-chip:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .icon-btn {
    color: rgba(255, 255, 255, 0.5);
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .todo-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
    padding: 12px;
  }
}
</style>
