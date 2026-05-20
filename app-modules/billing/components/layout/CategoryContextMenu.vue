<template>
  <Teleport to="body">
    <div
      v-if="visible && node"
      class="context-menu"
      :style="{ top: `${y}px`, left: `${x}px` }"
      @click.stop
    >
      <button type="button" class="context-menu-item" @click="$emit('add-child')">
        <Icon :name="SOLAR_ICONS.action.add" size="14" />
        <span>新增子分类</span>
      </button>
      <button type="button" class="context-menu-item" @click="$emit('edit')">
        <Icon :name="SOLAR_ICONS.action.edit" size="14" />
        <span>编辑</span>
      </button>
      <button type="button" class="context-menu-item" @click="$emit('detail')">
        <Icon :name="SOLAR_ICONS.doc.text" size="14" />
        <span>分类详情</span>
      </button>
      <button type="button" class="context-menu-item danger" @click="$emit('delete')">
        <Icon :name="SOLAR_ICONS.action.delete" size="14" />
        <span>删除</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { CategoryTreeNode } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  node: CategoryTreeNode | null
}>()

defineEmits<{
  (e: 'add-child'): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'detail'): void
}>()
</script>

<style>
.context-menu {
  position: fixed !important;
  min-width: 160px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(60, 60, 67, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 99999 !important;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.86);
  cursor: pointer;
  text-align: left;
}

.context-menu-item:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.context-menu-item.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
</style>
