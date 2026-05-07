<template>
  <div class="batch-toolbar">
    <div class="batch-info">
      <label class="batch-checkbox">
        <input
          type="checkbox"
          :checked="isAllSelected"
          :indeterminate.prop="isIndeterminate"
          @change="toggleSelectAll"
        />
        <span>已选 {{ selectedCount }} / 共 {{ totalCount }} 条</span>
      </label>
    </div>
    <div class="batch-actions">
      <button type="button" class="batch-btn" @click="$emit('batch-enable')">
        <Icon name="solar:check-circle-linear" size="14" />
        批量启用
      </button>
      <button type="button" class="batch-btn" @click="$emit('batch-disable')">
        <Icon name="solar:close-circle-linear" size="14" />
        批量禁用
      </button>
      <button type="button" class="batch-btn danger" @click="$emit('batch-delete')">
        <Icon name="solar:trash-bin-minimalistic-linear" size="14" />
        批量删除
      </button>
      <button type="button" class="batch-btn exit" @click="$emit('exit')">
        <Icon name="solar:close-circle-linear" size="14" />
        退出
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedCount: number
  totalCount: number
}>()

const emit = defineEmits<{
  'toggle-select-all': [select: boolean]
  'batch-delete': []
  'batch-enable': []
  'batch-disable': []
  'exit': []
}>()

const isAllSelected = computed(() => props.selectedCount > 0 && props.selectedCount === props.totalCount)
const isIndeterminate = computed(() => props.selectedCount > 0 && props.selectedCount < props.totalCount)

function toggleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  emit('toggle-select-all', checked)
}
</script>

<style scoped>
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 122, 255, 0.06);
  border: 0.5px solid rgba(0, 122, 255, 0.15);
  border-radius: 10px;
  gap: 12px;
  flex-wrap: wrap;
}
.batch-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  user-select: none;
}
.batch-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.batch-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.78);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.batch-btn:hover {
  background: rgba(60, 60, 67, 0.14);
}
.batch-btn.danger {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
.batch-btn.danger:hover {
  background: rgba(255, 59, 48, 0.18);
}
.batch-btn.exit {
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
}
.batch-btn.exit:hover {
  background: rgba(60, 60, 67, 0.08);
}
</style>
