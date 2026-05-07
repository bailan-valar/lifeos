<template>
  <div class="amt-root" :class="{ 'has-preview': showPreview, 'has-error': hasError }">
    <input
      ref="inputRef"
      v-model="text"
      type="text"
      class="amt-input"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="placeholder || '0.00  支持 + - * /'"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="onEsc"
    />
    <span v-if="showPreview" class="amt-preview" :class="{ error: hasError }">
      {{ previewText }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  placeholder?: string
  precision?: number
  min?: number
  max?: number
  allowNegative?: boolean
}>(), {
  precision: 2,
  allowNegative: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const inputRef = ref<HTMLInputElement>()
const text = ref(formatExternal(props.modelValue))
const isFocused = ref(false)
const previewValue = ref<number | null>(null)
const errorMsg = ref('')

const trimmed = computed(() => text.value.trim())
const hasOperator = computed(() => /[+\-*/×÷()]/.test(trimmed.value))
const isPureNumber = computed(() => /^-?\d+(\.\d+)?$/.test(trimmed.value))
const hasError = computed(() => !!errorMsg.value)
const showPreview = computed(() => {
  if (!trimmed.value) return false
  if (hasError.value) return true
  return hasOperator.value && previewValue.value !== null
})
const previewText = computed(() => {
  if (hasError.value) return errorMsg.value
  if (previewValue.value === null) return ''
  return `= ${previewValue.value.toFixed(props.precision)}`
})

function formatExternal(v: number): string {
  if (!Number.isFinite(v) || v === 0) return ''
  return String(v)
}

function tryEvaluate(): number | null {
  if (!trimmed.value) {
    errorMsg.value = ''
    previewValue.value = null
    return 0
  }
  try {
    let r = evaluate(trimmed.value, props.allowNegative)
    r = roundTo(r, props.precision)
    if (props.min != null && r < props.min) r = props.min
    if (props.max != null && r > props.max) r = props.max
    errorMsg.value = ''
    previewValue.value = r
    return r
  } catch (e) {
    errorMsg.value = '表达式无效'
    previewValue.value = null
    return null
  }
}

function commit(value: number) {
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}

function onInput() {
  const r = tryEvaluate()
  if (r !== null && isPureNumber.value) {
    commit(r)
  }
}

function onFocus() {
  isFocused.value = true
}

function onBlur() {
  isFocused.value = false
  const r = tryEvaluate()
  if (r === null) {
    text.value = formatExternal(props.modelValue)
    errorMsg.value = ''
    previewValue.value = null
    return
  }
  commit(r)
  text.value = formatExternal(r)
  errorMsg.value = ''
  previewValue.value = null
}

function onEnter() {
  const r = tryEvaluate()
  if (r === null) return
  commit(r)
  text.value = formatExternal(r)
  errorMsg.value = ''
  previewValue.value = null
  inputRef.value?.select()
}

function onEsc() {
  text.value = formatExternal(props.modelValue)
  errorMsg.value = ''
  previewValue.value = null
  inputRef.value?.blur()
}

watch(() => props.modelValue, (v) => {
  if (isFocused.value) return
  text.value = formatExternal(v)
  errorMsg.value = ''
  previewValue.value = null
})

/* ---------- 表达式解析（递归下降） ---------- */
class ExpressionError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'ExpressionError'
  }
}

function evaluate(input: string, allowNegative: boolean): number {
  const src = input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/。/g, '.')
    .replace(/[\s　,，]/g, '')

  if (!src) throw new ExpressionError('empty')

  let i = 0
  const peek = () => src[i]
  const eat = () => src[i++]
  const eof = () => i >= src.length

  function expr(): number {
    let v = term()
    while (!eof() && (peek() === '+' || peek() === '-')) {
      const op = eat()
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  function term(): number {
    let v = factor()
    while (!eof() && (peek() === '*' || peek() === '/')) {
      const op = eat()
      const r = factor()
      if (op === '/') {
        if (r === 0) throw new ExpressionError('div by zero')
        v /= r
      } else {
        v *= r
      }
    }
    return v
  }

  function factor(): number {
    if (peek() === '+') {
      eat()
      return factor()
    }
    if (peek() === '-') {
      eat()
      return -factor()
    }
    if (peek() === '(') {
      eat()
      const v = expr()
      if (peek() !== ')') throw new ExpressionError('expected )')
      eat()
      return v
    }
    return num()
  }

  function num(): number {
    const start = i
    let dotSeen = false
    while (!eof()) {
      const c = peek()
      if (c >= '0' && c <= '9') {
        eat()
        continue
      }
      if (c === '.') {
        if (dotSeen) throw new ExpressionError('invalid number')
        dotSeen = true
        eat()
        continue
      }
      break
    }
    if (start === i) throw new ExpressionError('expected number')
    const n = parseFloat(src.slice(start, i))
    if (!Number.isFinite(n)) throw new ExpressionError('NaN')
    return n
  }

  const result = expr()
  if (!eof()) throw new ExpressionError('unexpected token')
  if (!Number.isFinite(result)) throw new ExpressionError('infinite')
  if (!allowNegative && result < 0) throw new ExpressionError('negative')
  return result
}

function roundTo(v: number, p: number): number {
  const f = Math.pow(10, p)
  return Math.round(v * f) / f
}
</script>

<style scoped>
.amt-root {
  position: relative;
  flex: 1;
  min-width: 0;
}
.amt-input {
  width: 100%;
  padding: 10px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.2);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(0, 0, 0, 0.92);
  outline: none;
  font-feature-settings: 'tnum';
  transition: border-color 0.15s ease;
}
.amt-input:focus {
  border-color: rgb(0, 122, 255);
}
.amt-root.has-preview .amt-input {
  padding-right: 96px;
}
.amt-root.has-error .amt-input {
  border-color: rgba(255, 59, 48, 0.6);
}
.amt-root.has-error .amt-input:focus {
  border-color: rgb(255, 59, 48);
}
.amt-preview {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  pointer-events: none;
  font-feature-settings: 'tnum';
  white-space: nowrap;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.amt-preview.error {
  color: rgb(255, 59, 48);
}
</style>
