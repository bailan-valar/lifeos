<template>
  <div class="tree">
    <div
      v-for="node in nodes"
      :key="node.id"
      class="tree-node"
    >
      <div
        class="node-row"
        :style="{ paddingLeft: `${node.level * 20}px` }"
        @contextmenu.prevent="onContextMenu($event, node)"
      >
        <button
          v-if="node.children.length > 0"
          type="button"
          class="expand-btn"
          @click="toggleExpand(node.id)"
        >
          <Icon
            :name="expanded.has(node.id) ? SOLAR_ICONS.nav.down : SOLAR_ICONS.nav.forward"
            size="14"
          />
        </button>
        <span v-else class="expand-placeholder" />
        <span class="node-name" @click="$emit('view-detail', node)">{{ node.name }}</span>
        <div class="node-actions">
          <button type="button" class="node-action" title="新增子分类" @click="$emit('add-child', node)">
            <Icon :name="SOLAR_ICONS.action.add" size="14" />
          </button>
          <button type="button" class="node-action" title="编辑" @click="$emit('edit', node)">
            <Icon :name="SOLAR_ICONS.action.edit" size="14" />
          </button>
          <button type="button" class="node-action danger" title="删除" @click="$emit('delete', node.id)">
            <Icon :name="SOLAR_ICONS.action.delete" size="14" />
          </button>
        </div>
      </div>
      <CategoryTree
        v-if="node.children.length > 0 && expanded.has(node.id)"
        :nodes="node.children"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-child="$emit('add-child', $event)"
        @view-detail="$emit('view-detail', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryTreeNode } from '~/types/bill'
import { SOLAR_ICONS } from '~/composables/useIcons'

defineProps<{
  nodes: CategoryTreeNode[]
}>()

const emit = defineEmits<{
  (e: 'edit', node: CategoryTreeNode): void
  (e: 'delete', id: string): void
  (e: 'add-child', node: CategoryTreeNode): void
  (e: 'view-detail', node: CategoryTreeNode): void
  (e: 'contextmenu', payload: { node: CategoryTreeNode; x: number; y: number }): void
}>()

const expanded = ref(new Set<string>())

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expanded.value = next
}

function onContextMenu(event: MouseEvent, node: CategoryTreeNode) {
  emit('contextmenu', { node, x: event.clientX, y: event.clientY })
}
</script>

<style scoped>
.tree {
  display: flex;
  flex-direction: column;
}
.tree-node {
  display: flex;
  flex-direction: column;
}
.node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}
.node-row:hover {
  background: rgba(0, 0, 0, 0.03);
}
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}
.expand-placeholder {
  width: 20px;
}
.node-name {
  flex: 1;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.92);
  cursor: pointer;
  transition: color 0.15s ease;
}
.node-name:hover {
  color: rgb(0, 122, 255);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.node-row:hover .node-actions {
  opacity: 1;
}
.node-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.5);
  cursor: pointer;
}
.node-action:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.78);
}
.node-action.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}
</style>
