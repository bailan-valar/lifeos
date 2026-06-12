<template>
  <div class="note-view-switcher">
    <div class="view-tabs">
      <button
        v-for="view in views"
        :key="view.id"
        class="tab-btn"
        :class="{ active: activeView === view.id }"
        type="button"
        @click="switchView(view.id)"
      >
        <Icon :name="view.icon" />
        <span>{{ view.name }}</span>
      </button>
    </div>

    <div class="view-content">
      <BlockEditor
        v-if="activeView === 'content'"
        :note-id="noteId"
        @title-update="onTitleUpdate"
      />

      <TodoView
        v-else-if="activeView === 'todo'"
        :key="noteId"
        :note-id="noteId"
        :module-data="todoData"
        :on-data-change="saveTodoData"
      />

      <BillingView
        v-else-if="activeView === 'billing'"
        :key="noteId"
        :note-id="noteId"
        :module-data="billingData"
        :on-data-change="saveBillingData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BlockEditor from '~/components/editor/BlockEditor.vue'
import TodoView from '~/app-modules/todo/TodoView.vue'
import BillingView from '~/app-modules/billing/BillingView.vue'
import { getDB, generateId, now } from '~/services/db'

interface Props {
  noteId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'title-update', noteId: string, title: string): void
}>()

const { isMobile } = useDevice()

const views = [
  { id: 'content', name: '内容', icon: 'solar:document-text-linear' },
  { id: 'todo', name: '待办', icon: 'solar:check-read-linear' },
  { id: 'billing', name: '账单', icon: 'solar:wallet-money-linear' }
]

const activeView = ref('content')
const todoData = ref<unknown>(null)
const billingData = ref<unknown>(null)

const onTitleUpdate = (noteId: string, title: string) => {
  emit('title-update', noteId, title)
}

const loadModuleData = async (moduleId: 'todo' | 'billing') => {
  const db = await getDB()
  const doc = await db.module_data.findOne({
    selector: {
      noteId: props.noteId,
      moduleId
    }
  }).exec()

  if (doc) {
    return doc.data
  }

  return moduleId === 'todo' ? { todos: [] } : { bills: [] }
}

const saveModuleData = async (moduleId: 'todo' | 'billing', data: unknown) => {
  const db = await getDB()

  const doc = await db.module_data.findOne({
    selector: {
      noteId: props.noteId,
      moduleId
    }
  }).exec()

  const nowStr = now()

  if (doc) {
    await doc.patch({
      data,
      updatedAt: nowStr,
      version: doc.version + 1
    })
  } else {
    await db.module_data.insert({
      id: generateId(),
      noteId: props.noteId,
      moduleId,
      data,
      createdAt: nowStr,
      updatedAt: nowStr,
      version: 1,
    })
  }
}

const saveTodoData = (data: unknown) => {
  todoData.value = data
  saveModuleData('todo', data)
}

const saveBillingData = (data: unknown) => {
  billingData.value = data
  saveModuleData('billing', data)
}

const switchView = async (viewId: string) => {
  activeView.value = viewId

  if (viewId === 'todo' && todoData.value === null) {
    todoData.value = await loadModuleData('todo')
  }

  if (viewId === 'billing' && billingData.value === null) {
    billingData.value = await loadModuleData('billing')
  }
}

watch(() => props.noteId, () => {
  // 保持当前视图不变（如用户在账单视图切换笔记，仍停留在账单视图）
  // 清空缓存，非阻塞按需加载模块数据（.then 不阻塞渲染）
  todoData.value = null
  billingData.value = null

  if (activeView.value === 'todo') {
    loadModuleData('todo').then(data => { todoData.value = data })
  }
  if (activeView.value === 'billing') {
    loadModuleData('billing').then(data => { billingData.value = data })
  }
})

defineExpose({
  get activeView() { return activeView.value },
  switchView,
  get currentViewName() { return views.find(v => v.id === activeView.value)?.name || '内容' },
})
</script>

<style scoped>
.note-view-switcher {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.view-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  margin: 10px 12px 8px;
  background: rgba(120, 120, 128, 0.1);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 10px;
  flex-shrink: 0;
  align-self: flex-start;
}

.view-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  margin: 0 12px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 32px rgba(0, 0, 0, 0.06);
}

@media (max-width: 767px) {
  .view-tabs {
    display: none;
  }

  .view-content {
    margin: 0;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.55);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: -0.1px;
}

.tab-btn:hover {
  color: rgba(60, 60, 67, 0.9);
}

.tab-btn:active {
  transform: scale(0.95);
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.82);
  color: rgba(0, 0, 0, 0.88);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.06),
    0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

</style>
