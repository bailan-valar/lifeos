<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div
        v-if="visible"
        class="context-menu-overlay"
        @click="close"
      >
        <div
          class="context-menu"
          :class="{ mobile: isMobile }"
          :style="{ left: `${x}px`, top: `${y}px` }"
          @click.stop
        >
          <!-- 切换完成状态 -->
          <button
            type="button"
            class="menu-item"
            @click="handleToggleComplete"
          >
            <Icon
              :name="todo?.completed ? SOLAR_ICONS.status.pending : SOLAR_ICONS.status.success"
              size="16"
            />
            <span>{{ todo?.completed ? '标记未完成' : '标记完成' }}</span>
          </button>

          <!-- 编辑任务 -->
          <button
            type="button"
            class="menu-item"
            @click="handleEdit"
          >
            <Icon :name="SOLAR_ICONS.action.edit" size="16" />
            <span>编辑任务</span>
          </button>

          <!-- 添加子任务 -->
          <button
            type="button"
            class="menu-item"
            @click="handleAddChild"
          >
            <Icon :name="SOLAR_ICONS.action.add" size="16" />
            <span>添加子任务</span>
          </button>

          <!-- 设置日期 -->
          <div
            class="menu-item-wrapper"
            @mouseenter="handleDateMenuEnter"
            @mouseleave="handleDateMenuLeave"
          >
            <button
              type="button"
              class="menu-item"
              :class="{ active: dateMenuOpen }"
            >
              <Icon :name="ICONS.calendar" size="16" />
              <span>设置日期</span>
              <Icon :name="SOLAR_ICONS.nav.up" :class="{ 'rotate-180': dateMenuOpen }" size="14" class="ml-auto" />
            </button>
            <Transition name="submenu-slide">
              <div
                v-if="dateMenuOpen"
                class="submenu"
                @mouseenter="handleSubmenuEnter"
                @mouseleave="handleSubmenuLeave"
              >
                <button
                  type="button"
                  class="menu-item submenu-item"
                  @click="handleSetDate('today')"
                >
                  <span>今天</span>
                  <span class="date-hint">{{ dateHints.today }}</span>
                </button>
                <button
                  type="button"
                  class="menu-item submenu-item"
                  @click="handleSetDate('tomorrow')"
                >
                  <span>明天</span>
                  <span class="date-hint">{{ dateHints.tomorrow }}</span>
                </button>
                <button
                  type="button"
                  class="menu-item submenu-item"
                  @click="handleSetDate('nextWeek')"
                >
                  <span>下周</span>
                  <span class="date-hint">{{ dateHints.nextWeek }}</span>
                </button>
                <div class="menu-divider submenu-divider" />
                <button
                  type="button"
                  class="menu-item submenu-item"
                  @click="handleCustomDate"
                >
                  <span>自定义</span>
                </button>
                <input
                  v-if="showDatePicker"
                  ref="datePickerRef"
                  type="date"
                  class="date-picker"
                  :value="customDateValue"
                  @change="handleDateChange"
                  @click.stop
                />
                <button
                  v-if="showDatePicker"
                  type="button"
                  class="menu-item submenu-item danger"
                  @click="handleClearDate"
                >
                  <span>清除日期</span>
                </button>
              </div>
            </Transition>
          </div>

          <div class="menu-divider" />

          <!-- 删除任务 -->
          <button
            type="button"
            class="menu-item danger"
            @click="handleDelete"
          >
            <Icon :name="SOLAR_ICONS.action.delete" size="16" />
            <span>删除任务</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import type { TodoItem } from '~/types/todo'

// 通用任务接口，兼容 TodoItem 和 CellTask
interface BaseTask {
  id: string
  text: string
  completed: boolean
  priority?: 'none' | 'low' | 'medium' | 'high'
  typeId?: string
  statusId?: string
  startDate?: string
  dueDate?: string
  createdAt?: string
  noteId: string
  parentId?: string
}

const props = defineProps<{
  visible: boolean
  todo: BaseTask | null
  x: number
  y: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'toggle-complete': [todo: BaseTask]
  edit: [todo: BaseTask]
  'add-child': [todo: BaseTask]
  delete: [todo: BaseTask]
  'set-date': [todo: BaseTask, date: string | null]
}>()

const { isMobile } = useDevice()

function close() {
  emit('update:visible', false)
}

function handleToggleComplete() {
  if (props.todo) {
    emit('toggle-complete', props.todo)
    close()
  }
}

function handleEdit() {
  if (props.todo) {
    emit('edit', props.todo)
    close()
  }
}

function handleAddChild() {
  if (props.todo) {
    emit('add-child', props.todo)
    close()
  }
}

function handleDelete() {
  if (props.todo) {
    emit('delete', props.todo)
    close()
  }
}

// 日期菜单状态
const dateMenuOpen = ref(false)
const showDatePicker = ref(false)
const customDateValue = ref('')
const datePickerRef = ref<HTMLInputElement | null>(null)
let dateMenuTimer: ReturnType<typeof setTimeout> | null = null

// 计算日期提示
const dateHints = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${month}/${day} ${weekDays[date.getDay()]}`
  }

  return {
    today: formatDate(today),
    tomorrow: formatDate(tomorrow),
    nextWeek: formatDate(nextWeek)
  }
})

// 清除定时器
function clearDateMenuTimer() {
  if (dateMenuTimer) {
    clearTimeout(dateMenuTimer)
    dateMenuTimer = null
  }
}

// 主菜单项 hover 进入
function handleDateMenuEnter() {
  clearDateMenuTimer()
  dateMenuOpen.value = true
}

// 主菜单项 hover 离开
function handleDateMenuLeave() {
  clearDateMenuTimer()
  dateMenuTimer = setTimeout(() => {
    dateMenuOpen.value = false
    showDatePicker.value = false
  }, 150)
}

// 子菜单 hover 进入
function handleSubmenuEnter() {
  clearDateMenuTimer()
}

// 子菜单 hover 离开
function handleSubmenuLeave() {
  clearDateMenuTimer()
  dateMenuTimer = setTimeout(() => {
    dateMenuOpen.value = false
    showDatePicker.value = false
  }, 150)
}

function handleSetDate(type: 'today' | 'tomorrow' | 'nextWeek') {
  if (!props.todo) return

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let targetDate = today

  switch (type) {
    case 'today':
      targetDate = today
      break
    case 'tomorrow':
      targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + 1)
      break
    case 'nextWeek':
      targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + 7)
      break
  }

  // 格式化为 YYYY-MM-DD
  const dateStr = targetDate.toISOString().split('T')[0]
  emit('set-date', props.todo, dateStr)
  close()
}

function handleCustomDate() {
  showDatePicker.value = !showDatePicker.value
  if (showDatePicker.value) {
    nextTick(() => {
      datePickerRef.value?.showPicker()
    })
  }
}

function handleDateChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (props.todo && target.value) {
    emit('set-date', props.todo, target.value)
    close()
  }
}

function handleClearDate() {
  if (props.todo) {
    emit('set-date', props.todo, null)
    close()
  }
}

// 关闭日期菜单当主菜单关闭时
watch(() => props.visible, (visible) => {
  if (!visible) {
    clearDateMenuTimer()
    dateMenuOpen.value = false
    showDatePicker.value = false
  }
  if (visible) {
    nextTick(adjustPosition)
  }
})

// ESC 关闭
onKeyStroke('Escape', close)

// 组件卸载时清除定时器
onUnmounted(() => {
  clearDateMenuTimer()
})

function adjustPosition() {
  const menu = document.querySelector('.todo-context-menu .context-menu') as HTMLElement
  if (!menu) return

  const rect = menu.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let adjustedX = props.x
  let adjustedY = props.y

  // 防止右溢出
  if (adjustedX + rect.width > viewportWidth) {
    adjustedX = viewportWidth - rect.width - 8
  }

  // 防止下溢出
  if (adjustedY + rect.height > viewportHeight) {
    adjustedY = viewportHeight - rect.height - 8
  }

  // 防止左溢出
  if (adjustedX < 8) {
    adjustedX = 8
  }

  // 防止上溢出
  if (adjustedY < 8) {
    adjustedY = 8
  }

  menu.style.left = `${adjustedX}px`
  menu.style.top = `${adjustedY}px`
}
</script>

<style scoped>
.todo-context-menu {
  /* 用于定位 context-menu */
}

.context-menu-overlay {
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

/* 日期子菜单 */
.menu-item-wrapper {
  position: relative;
}

.menu-item.active {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.rotate-180 {
  transform: rotate(180deg);
}

.ml-auto {
  margin-left: auto;
}

.submenu {
  position: absolute;
  left: 100%;
  top: -6px;
  margin-left: 4px;
  width: 160px;
  padding: 6px;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.92));
  backdrop-filter: blur(var(--liquid-blur, 20px)) saturate(var(--liquid-saturate, 180%));
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--liquid-radius-button, 14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1;
}

.context-menu.mobile .submenu {
  position: static;
  margin-left: 0;
  margin-top: 4px;
  width: 100%;
}

.submenu-item {
  padding: 8px 12px;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-hint {
  font-size: 11px;
  opacity: 0.6;
}

.submenu-divider {
  margin: 6px 0;
}

.date-picker {
  width: calc(100% - 24px);
  margin: 4px 12px;
  padding: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  color: rgba(60, 60, 67, 0.85);
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

/* 子菜单动画 */
.submenu-slide-enter-active,
.submenu-slide-leave-active {
  transition: all 0.15s ease;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
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

  .menu-item.active {
    background: rgba(0, 122, 255, 0.15);
    color: rgb(0, 122, 255);
  }

  .submenu {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.08));
    border-color: rgba(255, 255, 255, 0.15);
  }

  .date-picker {
    background: rgba(60, 60, 67, 0.3);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
  }

  .menu-divider {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
