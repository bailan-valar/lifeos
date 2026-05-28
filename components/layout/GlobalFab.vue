<template>
  <Teleport to="body">
    <div
      class="global-fab"
      :class="{ 'menu-open': menuOpen, pressing: isPressing }"
    >
      <!-- 展开菜单 -->
      <div class="fab-menu" :class="{ visible: menuOpen }">
        <button
          v-for="item in menuItems"
          :key="item.key"
          type="button"
          class="fab-menu-item"
          @click.stop="handleMenuClick(item.key)"
        >
          <Icon :name="item.icon" size="18" />
          <span class="fab-menu-label">{{ item.label }}</span>
        </button>
      </div>

      <!-- 主按钮 -->
      <button
        type="button"
        class="fab-main"
        :title="currentContext?.label ?? '新增'"
        @mousedown="onPressStart"
        @touchstart.passive="onPressStart"
        @mouseup="onPressEnd"
        @touchend="onPressEnd"
        @mouseleave="onPressCancel"
        @touchcancel="onPressCancel"
        @click="onMainClick"
      >
        <Icon
          name="solar:add-circle-linear"
          size="26"
          class="fab-icon"
        />
      </button>
    </div>

    <!-- 全局账单弹框（账单页未加载时直接使用） -->
    <BillDialog
      v-if="globalBillVisible"
      :visible="globalBillVisible"
      :accounts="globalAccounts"
      :categories="globalCategories"
      :note-options="globalNotes"
      @confirm="onGlobalBillConfirm"
      @cancel="globalBillVisible = false"
    />

    <!-- 全局笔记快速弹框 -->
    <QuickNoteDialog
      :visible="globalNoteVisible"
      @confirm="globalNoteVisible = false"
      @cancel="globalNoteVisible = false"
    />

    <!-- 全局待办快速弹框 -->
    <TodoEditDialog
      :visible="globalTodoVisible"
      @update:visible="globalTodoVisible = $event"
      @create="onTodoCreate"
    />

    <!-- 全局目标快速弹框 -->
    <QuickGoalDialog
      :visible="globalGoalVisible"
      @confirm="globalGoalVisible = false"
      @cancel="globalGoalVisible = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import BillDialog from '~/app-modules/billing/components/BillDialog.vue'
import QuickNoteDialog from '~/components/QuickNoteDialog.vue'
import QuickGoalDialog from '~/components/QuickGoalDialog.vue'
import TodoEditDialog from '~/components/todo/TodoEditDialog.vue'
import type { Account, BillCategory, BillFormData } from '~/types/bill'
import type { TodoItem } from '~/types/todo'

const route = useRoute()
const fab = useGlobalFab()
const billsApi = useBills()

const menuOpen = ref(false)
const pressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const longPressTriggered = ref(false)
const isPressing = ref(false)

const menuItems = [
  { key: 'notes', label: '笔记', icon: 'solar:document-add-linear' },
  { key: 'billing', label: '账单', icon: 'solar:wallet-money-linear' },
  { key: 'todo', label: '待办', icon: 'solar:clipboard-list-linear' },
  { key: 'goal', label: '目标', icon: 'solar:flag-linear' },
]

const currentContext = computed(() => fab.getCurrentContext())

function onPressStart(_e: Event) {
  if (pressTimer.value) clearTimeout(pressTimer.value)
  isPressing.value = true
  longPressTriggered.value = false
  pressTimer.value = setTimeout(() => {
    isPressing.value = false
    longPressTriggered.value = true
    if (import.meta.client && 'vibrate' in navigator) {
      try { navigator.vibrate(40) } catch { /* ignore */ }
    }
    handleLongPress()
  }, 600)
}

function onPressEnd(_e: Event) {
  isPressing.value = false
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
}

function onPressCancel(_e: Event) {
  isPressing.value = false
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
}

function onMainClick(_e: MouseEvent) {
  if (longPressTriggered.value) {
    longPressTriggered.value = false
    return
  }
  menuOpen.value = !menuOpen.value
}

function handleLongPress() {
  menuOpen.value = false
  const action = fab.getCurrentAction()
  if (action) {
    action()
  }
}

/* ---------- 全局弹框状态 ---------- */
const globalBillVisible = ref(false)
const globalNoteVisible = ref(false)
const globalTodoVisible = ref(false)
const globalGoalVisible = ref(false)

/* ---------- 全局账单弹框 ---------- */
const globalAccounts = ref<Account[]>([])
const globalCategories = ref<BillCategory[]>([])
const globalNotes = ref<{ id: string; title: string; level: number }[]>([])

async function openGlobalBillDialog() {
  const { getDB } = await import('~/services/db')
  const db = await getDB()
  const [accRes, catRes, noteRes] = await Promise.all([
    db.accounts.find({ sort: [{ createdAt: 'asc' }] }).exec(),
    db.billCategories.find({ sort: [{ order: 'asc' }] }).exec(),
    db.notes.find({ sort: [{ updatedAt: 'desc' }] }).exec(),
  ])
  globalAccounts.value = accRes.map((d: any) => {
    const raw = d.toJSON()
    if (raw.type === 'personal' && !raw.subtype) {
      return { ...raw, subtype: 'cash' }
    }
    return raw
  })
  globalCategories.value = catRes.map((d: any) => d.toJSON())
  globalNotes.value = noteRes.map((d: any) => ({
    id: d.id,
    title: d.title || '未命名笔记',
    level: 0,
  }))
  globalBillVisible.value = true
}

async function onGlobalBillConfirm(data: BillFormData, _isEditing: boolean, _id?: string) {
  await billsApi.createBill(data)
  globalBillVisible.value = false
}

async function onTodoCreate(todo: TodoItem) {
  // 使用 useTodos 创建待办
  const { createTodo } = useTodos()
  // createTodo 会自动生成 id 和 createdAt，所以这里只传递必要字段
  const { id, createdAt, ...todoData } = todo
  await createTodo(todoData)
  globalTodoVisible.value = false
}

async function handleMenuClick(key: string) {
  menuOpen.value = false

  const currentPath = route.path

  // 待办：始终打开全局弹框（即使在 /todo 页面）
  if (key === 'todo') {
    globalTodoVisible.value = true
    return
  }

  // 已在目标页面则直接触发当前动作
  if (
    (key === 'notes' && currentPath.startsWith('/notes')) ||
    (key === 'billing' && currentPath.startsWith('/billing')) ||
    (key === 'goal' && currentPath === '/goals')
  ) {
    const action = fab.getCurrentAction()
    action?.()
    return
  }

  // 笔记：若动作已注册则直接触发，否则打开全局弹框
  if (key === 'notes') {
    const action = fab.actions.value['notes']
    if (action) {
      action()
    } else {
      globalNoteVisible.value = true
    }
    return
  }

  // 目标：若动作已注册则直接触发，否则打开全局弹框
  if (key === 'goal') {
    const action = fab.actions.value['goal']
    if (action) {
      action()
    } else {
      globalGoalVisible.value = true
    }
    return
  }

  // 账单：若动作已注册（页面在 keepalive 中）则直接触发，否则打开全局弹框
  if (key === 'billing') {
    const action = fab.actions.value[key]
    if (action) {
      action()
    } else {
      await openGlobalBillDialog()
    }
    return
  }


}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.global-fab')) {
    menuOpen.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', onDocumentClick)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('click', onDocumentClick)
  }
})
</script>

<style scoped>
.global-fab {
  position: fixed;
  right: 20px;
  bottom: calc(80px + env(safe-area-inset-bottom));
  z-index: var(--z-fab);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  user-select: none;
  -webkit-user-select: none;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(180deg, rgb(10, 132, 255) 0%, rgb(0, 102, 230) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.32) inset,
    0 4px 16px rgba(0, 122, 255, 0.35);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.fab-main:active,
.global-fab.pressing .fab-main {
  transform: scale(0.92);
}

.fab-icon {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.global-fab.menu-open .fab-icon {
  transform: rotate(45deg);
}

.fab-menu {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  opacity: 0;
  transform: translateY(10px) scale(0.9);
  pointer-events: none;
  transition: all 0.2s ease;
}

.fab-menu.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 24px;
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.78);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  color: rgba(0, 0, 0, 0.82);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: 0;
  transform: translateY(8px) scale(0.9);
  -webkit-tap-highlight-color: transparent;
}

.fab-menu-item:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.95);
}

.fab-menu.visible .fab-menu-item {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.fab-menu.visible .fab-menu-item:nth-child(1) {
  transition-delay: 0.02s;
}

.fab-menu.visible .fab-menu-item:nth-child(2) {
  transition-delay: 0.06s;
}

.fab-menu.visible .fab-menu-item:nth-child(3) {
  transition-delay: 0.10s;
}

.fab-menu.visible .fab-menu-item:nth-child(4) {
  transition-delay: 0.14s;
}

.fab-menu-label {
  white-space: nowrap;
}

@media (min-width: 768px) {
  .global-fab {
    right: 28px;
    bottom: 28px;
  }
}
</style>
