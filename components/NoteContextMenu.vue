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
          <button
            type="button"
            class="menu-item"
            @click="handleView"
          >
            <Icon :name="SOLAR_ICONS.doc.default" size="16" />
            <span>查看笔记</span>
          </button>
          <button
            type="button"
            class="menu-item"
            @click="handleEdit"
          >
            <Icon :name="SOLAR_ICONS.action.edit" size="16" />
            <span>编辑笔记</span>
          </button>
          <button
            type="button"
            class="menu-item"
            @click="handleAddChild"
          >
            <Icon :name="SOLAR_ICONS.action.add" size="16" />
            <span>新建子笔记</span>
          </button>
          <div class="menu-divider" />
          <button
            type="button"
            class="menu-item danger"
            @click="handleDelete"
          >
            <Icon :name="SOLAR_ICONS.action.delete" size="16" />
            <span>删除笔记</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { SOLAR_ICONS } from '~/composables/useIcons'
import type { Note } from '~/types/block'

const props = defineProps<{
  visible: boolean
  note: Note | null
  x: number
  y: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  view: [note: Note]
  edit: [note: Note]
  'add-child': [note: Note]
  delete: [note: Note]
}>()

const { isMobile } = useDevice()

function close() {
  emit('update:visible', false)
}

function handleView() {
  if (props.note) {
    emit('view', props.note)
    close()
  }
}

function handleEdit() {
  if (props.note) {
    emit('edit', props.note)
    close()
  }
}

function handleAddChild() {
  if (props.note) {
    emit('add-child', props.note)
    close()
  }
}

function handleDelete() {
  if (props.note) {
    emit('delete', props.note)
    close()
  }
}

// ESC 关闭
onKeyStroke('Escape', close)

// 监听可见性变化，调整位置防止溢出
watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(adjustPosition)
  }
})

function adjustPosition() {
  const menu = document.querySelector('.context-menu') as HTMLElement
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

  .menu-divider {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
