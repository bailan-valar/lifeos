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
            v-if="!todo?.parentId"
            type="button"
            class="menu-item"
            @click="handleAddChild"
          >
            <Icon :name="SOLAR_ICONS.action.add" size="16" />
            <span>添加子任务</span>
          </button>

          <!-- 查看详情 -->
          <button
            type="button"
            class="menu-item"
            @click="handleViewDetail"
          >
            <Icon :name="ICONS.info" size="16" />
            <span>查看详情</span>
          </button>

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
  'view-detail': [todo: BaseTask]
  delete: [todo: BaseTask]
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

function handleViewDetail() {
  if (props.todo) {
    emit('view-detail', props.todo)
    close()
  }
}

function handleDelete() {
  if (props.todo) {
    emit('delete', props.todo)
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
