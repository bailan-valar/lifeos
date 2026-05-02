<template>
  <div class="field-editor">
    <label v-if="label" class="field-label">
      {{ label }}
      <span v-if="field.required" class="required-mark">*</span>
    </label>

    <template v-if="field.type === 'text'">
      <input
        :value="modelValue"
        type="text"
        class="field-input"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </template>

    <template v-else-if="field.type === 'number'">
      <input
        :value="modelValue"
        type="number"
        class="field-input"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
    </template>

    <template v-else-if="field.type === 'date'">
      <input
        :value="modelValue"
        type="date"
        class="field-input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </template>

    <template v-else-if="field.type === 'select'">
      <select
        :value="modelValue || ''"
        class="field-input field-select"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>请选择</option>
        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </template>

    <template v-else-if="field.type === 'multiSelect'">
      <div class="multi-select">
        <div v-for="opt in selectedOptions" :key="opt" class="tag-pill">
          {{ opt }}
          <button class="tag-remove" @click="removeOption(opt)" type="button">&times;</button>
        </div>
        <select
          v-if="availableOptions.length"
          class="field-input field-select mini"
          @change="addOption"
        >
          <option value="" disabled selected>+ 添加</option>
          <option v-for="opt in availableOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </template>

    <template v-else-if="field.type === 'checkbox'">
      <label class="toggle-switch">
        <input
          type="checkbox"
          :checked="!!modelValue"
          @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <span class="toggle-slider" />
      </label>
    </template>

    <template v-else-if="field.type === 'url'">
      <div class="input-with-icon">
        <Icon name="solar:link-linear" class="input-icon" />
        <input
          :value="modelValue"
          type="url"
          class="field-input with-icon"
          :placeholder="placeholder || 'https://'"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </template>

    <template v-else-if="field.type === 'email'">
      <div class="input-with-icon">
        <Icon name="solar:letter-linear" class="input-icon" />
        <input
          :value="modelValue"
          type="email"
          class="field-input with-icon"
          :placeholder="placeholder || 'email@example.com'"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ClassField } from '~/types/block'

interface Props {
  field: ClassField
  modelValue: any
  label?: string
  placeholder?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const selectedOptions = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (props.modelValue) return [props.modelValue]
  return []
})

const availableOptions = computed(() => {
  return props.field.options.filter(opt => !selectedOptions.value.includes(opt))
})

const addOption = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!value) return
  const next = [...selectedOptions.value, value]
  emit('update:modelValue', next)
  ;(event.target as HTMLSelectElement).value = ''
}

const removeOption = (opt: string) => {
  const next = selectedOptions.value.filter((o: string) => o !== opt)
  emit('update:modelValue', next.length ? next : null)
}
</script>

<style scoped>
.field-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
  display: flex;
  align-items: center;
  gap: 2px;
}

.required-mark {
  color: #ff3b30;
}

.field-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.92);
  background: rgba(255, 255, 255, 0.4);
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.field-input:focus {
  border-color: rgba(0, 122, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.field-input::placeholder {
  color: rgba(60, 60, 67, 0.35);
}

.field-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23606067' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.field-select.mini {
  width: auto;
  min-width: 80px;
  padding: 6px 28px 6px 12px;
  font-size: 13px;
}

.multi-select {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 102, 230);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.tag-remove:hover {
  background: rgba(0, 122, 255, 0.15);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(60, 60, 67, 0.2);
  border-radius: 26px;
  transition: background 0.25s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 22px;
  width: 22px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-switch input:checked + .toggle-slider {
  background: rgb(0, 122, 255);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  color: rgba(60, 60, 67, 0.45);
  pointer-events: none;
}

.field-input.with-icon {
  padding-left: 36px;
}
</style>
