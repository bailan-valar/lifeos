<template>
  <div class="dtp-root">
    <div ref="triggerRef" class="dtp-trigger" :class="{ active: open }" @mousedown="onTriggerMousedown">
      <Icon name="solar:calendar-linear" size="14" class="trigger-icon" />
      <input
        ref="inputRef"
        v-model="inputText"
        type="text"
        class="dtp-input"
        :placeholder="placeholder || 'YYYY-MM-DD HH:mm'"
        autocomplete="off"
        spellcheck="false"
        @focus="ensureOpen"
        @input="onInputChange"
        @keydown.esc.prevent="onInputEsc"
        @keydown.enter.prevent="onInputEnter"
      />
      <div class="trigger-right">
        <button
          v-if="clearable && (modelValue || inputText)"
          type="button"
          class="clear-btn"
          @click.stop="clearValue"
        >
          <Icon name="solar:close-circle-linear" size="14" />
        </button>
        <button type="button" class="arrow-btn" @click.stop="toggle">
          <Icon
            name="solar:alt-arrow-down-linear"
            size="14"
            class="arrow"
            :class="{ open }"
          />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="dtp-panel"
        :style="panelStyle"
        @click.stop
        @keydown.esc.prevent="close"
      >
        <div class="cal-header">
          <button type="button" class="nav-btn" @click="shiftMonth(-1)">
            <Icon name="solar:alt-arrow-left-linear" size="14" />
          </button>
          <div class="header-title">{{ viewYear }}年{{ viewMonth }}月</div>
          <button type="button" class="nav-btn" @click="shiftMonth(1)">
            <Icon name="solar:alt-arrow-right-linear" size="14" />
          </button>
        </div>

        <div class="cal-weekdays">
          <div v-for="w in weekdayLabels" :key="w" class="weekday">{{ w }}</div>
        </div>

        <div class="cal-grid">
          <div
            v-for="(cell, idx) in calendarCells"
            :key="idx"
            class="cal-cell"
            :class="{
              'out-of-month': !cell.inMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected
            }"
            @click="pickDay(cell)"
          >
            {{ cell.day }}
          </div>
        </div>

        <div class="time-row">
          <div class="time-block">
            <button type="button" class="step-btn" @click="stepHour(1)">
              <Icon name="solar:alt-arrow-up-linear" size="12" />
            </button>
            <input
              type="text"
              class="time-input"
              :value="hourText"
              maxlength="2"
              inputmode="numeric"
              @input="onHourInput"
              @blur="onHourBlur"
              @keydown.up.prevent="stepHour(1)"
              @keydown.down.prevent="stepHour(-1)"
            />
            <button type="button" class="step-btn" @click="stepHour(-1)">
              <Icon name="solar:alt-arrow-down-linear" size="12" />
            </button>
          </div>
          <span class="time-colon">:</span>
          <div class="time-block">
            <button type="button" class="step-btn" @click="stepMinute(props.minuteStep || 1)">
              <Icon name="solar:alt-arrow-up-linear" size="12" />
            </button>
            <input
              type="text"
              class="time-input"
              :value="minuteText"
              maxlength="2"
              inputmode="numeric"
              @input="onMinuteInput"
              @blur="onMinuteBlur"
              @keydown.up.prevent="stepMinute(props.minuteStep || 1)"
              @keydown.down.prevent="stepMinute(-(props.minuteStep || 1))"
            />
            <button type="button" class="step-btn" @click="stepMinute(-(props.minuteStep || 1))">
              <Icon name="solar:alt-arrow-down-linear" size="12" />
            </button>
          </div>
        </div>

        <div class="dtp-footer">
          <button type="button" class="footer-btn" @click="setToday">今天</button>
          <button type="button" class="footer-btn" @click="setNow">现在</button>
          <button type="button" class="footer-btn" @click="clearAndClose">清空</button>
          <button type="button" class="footer-btn primary" @click="confirmAndClose">确定</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface DateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

interface CalCell {
  year: number
  month: number
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  clearable?: boolean
  minuteStep?: number
}>(), {
  minuteStep: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/* ---------- 工具函数 ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function pad4(n: number): string {
  return String(n).padStart(4, '0')
}
function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.trunc(n)))
}
function parseLocal(s: string): DateParts | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/.exec(s)
  if (!m) return null
  const year = +m[1]
  const month = +m[2]
  const day = +m[3]
  const hour = +m[4]
  const minute = +m[5]
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null
  return { year, month, day, hour, minute }
}
function formatLocal(p: DateParts): string {
  return `${pad4(p.year)}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`
}
function formatDisplay(p: DateParts): string {
  return `${pad4(p.year)}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}`
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
function getFirstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}
function todayParts(): DateParts {
  const d = new Date()
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes()
  }
}
function snapMinute(m: number, step: number): number {
  if (step <= 1) return clampInt(m, 0, 59)
  return clampInt(Math.floor(m / step) * step, 0, 59)
}
/**
 * 宽松解析用户输入
 * 支持: YYYY-MM-DD / YYYY/MM/DD / YYYY-MM-DD HH / YYYY-MM-DD HH:mm / YYYY-MM-DDTHH:mm
 */
function parseUserInput(s: string): DateParts | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const norm = trimmed
    .replace(/\//g, '-')
    .replace(/[Tt]/g, ' ')
    .replace(/\s+/g, ' ')
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s(\d{1,2})(?::(\d{1,2}))?)?$/.exec(norm)
  if (!m) return null
  const year = +m[1]
  const month = +m[2]
  const day = +m[3]
  const hour = m[4] !== undefined ? +m[4] : 0
  const minute = m[5] !== undefined ? +m[5] : 0
  if (month < 1 || month > 12) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null
  const maxDay = getDaysInMonth(year, month)
  if (day < 1 || day > maxDay) return null
  return { year, month, day, hour, minute }
}
/**
 * 按格式 YYYY-MM-DD HH:mm 自动插入分隔符
 * 仅保留数字,按 4-2-2-2-2 分组并补 - / 空格 / : 分隔
 */
function autoFormatDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 12)
  const y = digits.slice(0, 4)
  const m = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  const h = digits.slice(8, 10)
  const mi = digits.slice(10, 12)
  let out = y
  if (m) out += '-' + m
  if (d) out += '-' + d
  if (h) out += ' ' + h
  if (mi) out += ':' + mi
  return out
}

/* ---------- 状态 ---------- */
const open = ref(false)
const triggerRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const panelStyle = ref<Record<string, string>>({})
const inputText = ref('')

const today = todayParts()
const viewYear = ref(today.year)
const viewMonth = ref(today.month)
const selectedDate = ref<{ year: number; month: number; day: number } | null>(null)
const selectedHour = ref(0)
const selectedMinute = ref(0)

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

const hourText = computed(() => pad2(selectedHour.value))
const minuteText = computed(() => pad2(selectedMinute.value))

const calendarCells = computed<CalCell[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstWeekday = getFirstWeekday(y, m)
  const daysInMonth = getDaysInMonth(y, m)
  const prevYear = m === 1 ? y - 1 : y
  const prevMonth = m === 1 ? 12 : m - 1
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)
  const nextYear = m === 12 ? y + 1 : y
  const nextMonth = m === 12 ? 1 : m + 1

  const cells: CalCell[] = []

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push(makeCell(prevYear, prevMonth, day, false))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(makeCell(y, m, d, true))
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push(makeCell(nextYear, nextMonth, nextDay++, false))
  }
  return cells
})

function makeCell(y: number, m: number, d: number, inMonth: boolean): CalCell {
  const isToday = y === today.year && m === today.month && d === today.day
  const sel = selectedDate.value
  const isSelected = !!sel && sel.year === y && sel.month === m && sel.day === d
  return { year: y, month: m, day: d, inMonth, isToday, isSelected }
}

/* ---------- 同步 ---------- */
function refreshInputText() {
  if (!selectedDate.value) {
    inputText.value = ''
    return
  }
  inputText.value = formatDisplay({
    year: selectedDate.value.year,
    month: selectedDate.value.month,
    day: selectedDate.value.day,
    hour: selectedHour.value,
    minute: selectedMinute.value
  })
}

function loadFromValue() {
  const p = parseLocal(props.modelValue)
  if (p) {
    selectedDate.value = { year: p.year, month: p.month, day: p.day }
    selectedHour.value = clampInt(p.hour, 0, 23)
    selectedMinute.value = snapMinute(p.minute, props.minuteStep)
    viewYear.value = p.year
    viewMonth.value = p.month
  } else {
    selectedDate.value = null
    selectedHour.value = 0
    selectedMinute.value = 0
    viewYear.value = today.year
    viewMonth.value = today.month
  }
  refreshInputText()
}

watch(() => props.modelValue, () => {
  if (!open.value) loadFromValue()
})

/* ---------- 输入框交互 ---------- */
function onInputChange() {
  const input = inputRef.value
  if (!input) return
  const rawValue = input.value
  const cursorBefore = input.selectionStart ?? rawValue.length
  const digitsBeforeCursor = (rawValue.slice(0, cursorBefore).match(/\d/g) || []).length

  const formatted = autoFormatDate(rawValue)

  let newCursor = formatted.length
  if (digitsBeforeCursor === 0) {
    newCursor = 0
  } else {
    let count = 0
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        count++
        if (count === digitsBeforeCursor) {
          newCursor = i + 1
          break
        }
      }
    }
  }

  inputText.value = formatted
  nextTick(() => {
    if (inputRef.value && document.activeElement === inputRef.value) {
      inputRef.value.setSelectionRange(newCursor, newCursor)
    }
  })

  const p = parseUserInput(formatted)
  if (!p) return
  selectedDate.value = { year: p.year, month: p.month, day: p.day }
  selectedHour.value = clampInt(p.hour, 0, 23)
  selectedMinute.value = snapMinute(p.minute, props.minuteStep)
  viewYear.value = p.year
  viewMonth.value = p.month
}

function onInputEsc() {
  if (!open.value) {
    refreshInputText()
    inputRef.value?.blur()
    return
  }
  loadFromValue()
  open.value = false
  inputRef.value?.blur()
}

function onInputEnter() {
  if (!open.value) {
    const p = parseUserInput(inputText.value)
    if (p) {
      selectedDate.value = { year: p.year, month: p.month, day: p.day }
      selectedHour.value = clampInt(p.hour, 0, 23)
      selectedMinute.value = snapMinute(p.minute, props.minuteStep)
      viewYear.value = p.year
      viewMonth.value = p.month
      emitCurrent()
      refreshInputText()
    } else {
      refreshInputText()
    }
    return
  }
  close()
}

function ensureOpen() {
  if (!open.value) openPanel()
}

function focusInput() {
  inputRef.value?.focus()
}

function onTriggerMousedown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target === inputRef.value) return
  if (target.closest('.clear-btn')) return
  if (target.closest('.arrow-btn')) return
  e.preventDefault()
  focusInput()
}

/* ---------- 面板交互 ---------- */
function toggle() {
  if (open.value) close()
  else openPanel()
}

function openPanel() {
  loadFromValue()
  open.value = true
  nextTick(() => {
    updatePanelPosition()
    requestAnimationFrame(updatePanelPosition)
  })
}

function close() {
  if (!open.value) return
  emitCurrent()
  open.value = false
  refreshInputText()
  inputRef.value?.blur()
}

function updatePanelPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const panelHeight = panelRef.value?.offsetHeight ?? 420
  const panelWidth = panelRef.value?.offsetWidth ?? Math.max(rect.width, 280)
  const margin = 8
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top

  let top: number
  if (spaceBelow >= panelHeight + margin || spaceBelow >= spaceAbove) {
    top = rect.bottom + 4
    const maxTop = viewportHeight - panelHeight - margin
    if (top > maxTop) top = Math.max(margin, maxTop)
  } else {
    top = rect.top - panelHeight - 4
    if (top < margin) top = margin
  }

  let left = rect.left
  if (left + panelWidth > viewportWidth - margin) {
    left = Math.max(margin, viewportWidth - panelWidth - margin)
  }

  panelStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    minWidth: `${Math.max(rect.width, 280)}px`
  }
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && triggerRef.value.contains(target)) return
  if (panelRef.value && panelRef.value.contains(target)) return
  close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
})

/* ---------- 日历 ---------- */
function shiftMonth(delta: number) {
  let y = viewYear.value
  let m = viewMonth.value + delta
  while (m < 1) {
    m += 12
    y--
  }
  while (m > 12) {
    m -= 12
    y++
  }
  viewYear.value = y
  viewMonth.value = m
}

function pickDay(cell: CalCell) {
  selectedDate.value = { year: cell.year, month: cell.month, day: cell.day }
  if (!cell.inMonth) {
    viewYear.value = cell.year
    viewMonth.value = cell.month
  }
  refreshInputText()
}

/* ---------- 时分 ---------- */
function stepHour(delta: number) {
  let h = selectedHour.value + delta
  if (h < 0) h = 23
  if (h > 23) h = 0
  selectedHour.value = h
  refreshInputText()
}

function stepMinute(delta: number) {
  let m = selectedMinute.value + delta
  while (m < 0) m += 60
  while (m >= 60) m -= 60
  selectedMinute.value = m
  refreshInputText()
}

function onHourInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 2)
  if (!raw) return
  const n = parseInt(raw, 10)
  if (Number.isFinite(n)) {
    selectedHour.value = clampInt(n, 0, 23)
    refreshInputText()
  }
}

function onHourBlur(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  const n = raw ? parseInt(raw, 10) : 0
  selectedHour.value = clampInt(Number.isFinite(n) ? n : 0, 0, 23)
  refreshInputText()
}

function onMinuteInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 2)
  if (!raw) return
  const n = parseInt(raw, 10)
  if (Number.isFinite(n)) {
    selectedMinute.value = clampInt(n, 0, 59)
    refreshInputText()
  }
}

function onMinuteBlur(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, '')
  const n = raw ? parseInt(raw, 10) : 0
  selectedMinute.value = clampInt(Number.isFinite(n) ? n : 0, 0, 59)
  refreshInputText()
}

/* ---------- 底部按钮 ---------- */
function setToday() {
  selectedDate.value = { year: today.year, month: today.month, day: today.day }
  selectedHour.value = 0
  selectedMinute.value = 0
  viewYear.value = today.year
  viewMonth.value = today.month
  refreshInputText()
  emitCurrent()
  open.value = false
}

function setNow() {
  const now = todayParts()
  selectedDate.value = { year: now.year, month: now.month, day: now.day }
  selectedHour.value = now.hour
  selectedMinute.value = snapMinute(now.minute, props.minuteStep)
  viewYear.value = now.year
  viewMonth.value = now.month
  refreshInputText()
  emitCurrent()
  open.value = false
}

function clearAndClose() {
  selectedDate.value = null
  selectedHour.value = 0
  selectedMinute.value = 0
  inputText.value = ''
  if (props.modelValue !== '') emit('update:modelValue', '')
  open.value = false
}

function clearValue() {
  selectedDate.value = null
  inputText.value = ''
  if (props.modelValue !== '') emit('update:modelValue', '')
}

function confirmAndClose() {
  emitCurrent()
  open.value = false
  refreshInputText()
}

function emitCurrent() {
  if (!selectedDate.value) {
    if (props.modelValue !== '') emit('update:modelValue', '')
    return
  }
  const v = formatLocal({
    year: selectedDate.value.year,
    month: selectedDate.value.month,
    day: selectedDate.value.day,
    hour: selectedHour.value,
    minute: selectedMinute.value
  })
  if (v !== props.modelValue) {
    emit('update:modelValue', v)
  }
}

/* ---------- 初始化 ---------- */
loadFromValue()
</script>

<style scoped>
.dtp-root {
  position: relative;
}
.dtp-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  transition: border-color 0.15s ease;
}
.dtp-trigger:hover {
  border-color: rgba(60, 60, 67, 0.35);
}
.dtp-trigger.active,
.dtp-trigger:focus-within {
  border-color: rgb(0, 122, 255);
}
.trigger-icon {
  color: rgba(60, 60, 67, 0.6);
  flex-shrink: 0;
}
.dtp-input {
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  font-feature-settings: 'tnum';
}
.dtp-input::placeholder {
  color: rgba(60, 60, 67, 0.4);
}
.trigger-right {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.clear-btn,
.arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: rgba(60, 60, 67, 0.4);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.clear-btn:hover,
.arrow-btn:hover {
  color: rgba(60, 60, 67, 0.7);
  background: rgba(0, 0, 0, 0.04);
}
.arrow {
  transition: transform 0.15s ease;
}
.arrow.open {
  transform: rotate(180deg);
}

.dtp-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  width: 280px;
  user-select: none;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(60, 60, 67, 0.7);
  transition: background-color 0.15s ease;
}
.nav-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}
.header-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  font-feature-settings: 'tnum';
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  padding: 4px 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.92);
  font-feature-settings: 'tnum';
  transition: background-color 0.1s ease;
}
.cal-cell:hover {
  background: rgba(0, 122, 255, 0.08);
}
.cal-cell.out-of-month {
  color: rgba(60, 60, 67, 0.3);
}
.cal-cell.is-today {
  box-shadow: inset 0 0 0 1px rgb(0, 122, 255);
}
.cal-cell.is-selected {
  background: rgb(0, 122, 255);
  color: white;
  font-weight: 600;
}
.cal-cell.is-selected:hover {
  background: rgb(0, 110, 230);
}

.time-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
}
.time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 18px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  cursor: pointer;
  color: rgba(60, 60, 67, 0.7);
  transition: background-color 0.15s ease;
}
.step-btn:hover {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}
.time-input {
  width: 48px;
  text-align: center;
  padding: 6px 0;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  font-feature-settings: 'tnum';
  outline: none;
}
.time-input:focus {
  border-color: rgb(0, 122, 255);
}
.time-colon {
  font-size: 18px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  padding-bottom: 2px;
}

.dtp-footer {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.1);
  padding-top: 10px;
}
.footer-btn {
  padding: 7px 0;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.92);
  transition: all 0.15s ease;
}
.footer-btn:hover {
  border-color: rgba(0, 122, 255, 0.4);
  color: rgb(0, 122, 255);
}
.footer-btn.primary {
  background: rgb(0, 122, 255);
  border-color: rgb(0, 122, 255);
  color: white;
}
.footer-btn.primary:hover {
  background: rgb(0, 110, 230);
  color: white;
}
</style>
