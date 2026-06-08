<template>
  <div class="tree-node" :style="{ paddingLeft: `${level * 16}px` }">
    <div
      class="tree-node-content"
      :class="{ selected: node.id === selectedId }"
      @click="handleClick"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="expand-btn"
        :class="{ expanded }"
        @click="handleToggle"
      >
        <Icon :name="SOLAR_ICONS.nav.right" size="12" />
      </button>
      <span v-else class="expand-spacer" />
      <span class="node-label">{{ node.title }}</span>
    </div>
    <div v-if="expanded && hasChildren" class="tree-children">
      <NoteTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :expanded="false"
        :level="level + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'

interface TreeNode {
  id: string
  title: string
  level: number
  children: TreeNode[]
}

interface Props {
  node: TreeNode
  selectedId?: string
  expanded?: boolean
  level?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: '',
  expanded: false,
  level: 0
})

const emit = defineEmits<{
  select: [id: string]
  toggle: [id: string]
}>()

const hasChildren = computed(() => props.node.children.length > 0)

function handleClick() {
  emit('select', props.node.id)
}

function handleToggle(e: MouseEvent) {
  e.stopPropagation()
  emit('toggle', props.node.id)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.tree-node-content:hover {
  background: rgba(0, 122, 255, 0.08);
}

.tree-node-content.selected {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 102, 230);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
}

.expand-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 18px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-children {
  margin-left: 0;
}

@media (prefers-color-scheme: dark) {
  .tree-node-content:hover {
    background: rgba(0, 122, 255, 0.15);
  }

  .tree-node-content.selected {
    background: rgba(0, 122, 255, 0.25);
    color: rgb(0, 122, 255);
  }

  .expand-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .expand-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
