<template>
  <div class="todo-status-selector">
    <label class="selector-label">待办状态</label>
    <div class="status-options">
      <button
        v-for="status in statuses"
        :key="status.id"
        type="button"
        class="status-option"
        :class="{ 
          active: modelValue === status.id,
          'is-default': status.isDefault
        }"
        :style="{
          borderColor: modelValue === status.id ? status.color : '',
          backgroundColor: modelValue === status.id ? `${status.color}15` : ''
        }"
        @click="selectStatus(status.id)"
      >
        <Icon :name="status.icon || ICONS.round" size="18" :style="{ color: status.color }" />
        <div class="status-info">
          <span class="status-name">{{ status.name }}</span>
          <span v-if="status.description" class="status-description">{{ status.description }}</span>
          <span v-if="status.isDefault" class="default-badge">默认</span>
        </div>
        <Icon 
          v-if="modelValue === status.id"
          name="solar:check-circle-bold" 
          size="20" 
          :style="{ color: status.color }"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTodoStatus } from '~/composables/useTodoStatus'
import { ICONS } from '~/composables/useIcons'

interface Props {
  modelValue?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { statuses, ensureDefaultStatuses } = useTodoStatus()

onMounted(async () => {
  await ensureDefaultStatuses()
})

function selectStatus(statusId: string) {
  emit('update:modelValue', statusId)
}
</script>

<style scoped>
.todo-status-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.92);
  margin: 0;
}

.status-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.status-option:hover {
  border-color: rgba(0, 122, 255, 0.3);
  background: rgba(0, 122, 255, 0.05);
  transform: translateY(-1px);
}

.status-option.active {
  border-color: currentColor;
  background: currentColor;
}

.status-option.is-default {
  position: relative;
}

.status-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.92);
}

.status-description {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.6);
}

.default-badge {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  margin-left: 6px;
}

/* 滚动条样式 */
.status-options::-webkit-scrollbar {
  width: 6px;
}

.status-options::-webkit-scrollbar-track {
  background: rgba(60, 60, 67, 0.05);
  border-radius: 3px;
}

.status-options::-webkit-scrollbar-thumb {
  background: rgba(60, 60, 67, 0.2);
  border-radius: 3px;
}

.status-options::-webkit-scrollbar-thumb:hover {
  background: rgba(60, 60, 67, 0.3);
}
</style>