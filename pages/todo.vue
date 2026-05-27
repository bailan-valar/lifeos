<template>
  <div class="todo-page">
    <div class="todo-bg">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
      <div class="bg-grain" />
    </div>

    <div class="todo-container" :class="{ mobile: isMobile }">
      <div class="todo-header">
        <div class="header-left">
          <h2>全局待办</h2>
          <span class="todo-summary">{{ totalCompletedCount }} / {{ totalTodoCount }} 已完成</span>
        </div>
        <div class="header-actions">
          <button class="filter-btn" :class="{ active: filterMode === 'all' }" @click="filterMode = 'all'">
            全部
          </button>
          <button class="filter-btn" :class="{ active: filterMode === 'pending' }" @click="filterMode = 'pending'">
            未完成
          </button>
          <button class="filter-btn" :class="{ active: filterMode === 'completed' }" @click="filterMode = 'completed'">
            已完成
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Icon name="solar:loading-linear" size="32" class="loading-icon" />
        <p>加载待办任务中...</p>
      </div>

      <div v-else-if="filteredNotes.length === 0" class="empty-state">
        <Icon name="solar:clipboard-list-linear" size="48" />
        <p>{{ filterMode === 'pending' ? '暂无未完成的待办任务' : filterMode === 'completed' ? '暂无已完成的待办任务' : '暂无待办任务' }}</p>
        <button class="empty-action-btn" type="button" @click="goToNotes">
          前往笔记添加待办
        </button>
      </div>

      <div v-else class="todo-notes-list">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="note-todo-card"
          @click="goToNote(note.id)"
        >
          <div class="note-header">
            <div class="note-info">
              <Icon name="solar:document-text-linear" size="16" class="note-icon" />
              <span class="note-title">{{ note.title || '未命名笔记' }}</span>
            </div>
            <div class="note-stats">
              <span class="stat-item" :class="{ completed: note.completedCount > 0 }">
                {{ note.completedCount }} 完成
              </span>
              <span class="stat-item total">
                {{ note.totalCount }} 总计
              </span>
            </div>
          </div>

          <div class="todo-preview">
            <div
              v-for="todo in getPreviewTodos(note.todos)"
              :key="todo.id"
              class="todo-preview-item"
              :class="{ completed: todo.completed }"
            >
              <Icon :name="todo.completed ? 'solar:check-circle-linear' : 'solar:round-linear'" size="14" />
              <span class="todo-text">{{ todo.text || '空待办' }}</span>
            </div>
            <div v-if="note.todos.length > 3" class="todo-more">
              还有 {{ note.todos.length - 3 }} 个待办...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDB } from '~/services/db'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
  parentId?: string
}

interface NoteTodoSummary {
  id: string
  title: string
  completedCount: number
  totalCount: number
  todos: TodoItem[]
}

const { isMobile } = useDevice()
const router = useRouter()

const loading = ref(true)
const notesWithTodos = ref<NoteTodoSummary[]>([])
const filterMode = ref<'all' | 'pending' | 'completed'>('all')

const totalTodoCount = computed(() =>
  notesWithTodos.value.reduce((sum, note) => sum + note.totalCount, 0)
)

const totalCompletedCount = computed(() =>
  notesWithTodos.value.reduce((sum, note) => sum + note.completedCount, 0)
)

const filteredNotes = computed(() => {
  return notesWithTodos.value.filter(note => {
    if (filterMode.value === 'pending') {
      return note.completedCount < note.totalCount
    } else if (filterMode.value === 'completed') {
      return note.completedCount > 0
    }
    return true
  }).sort((a, b) => {
    // 优先显示有未完成待办的笔记
    const aHasPending = a.completedCount < a.totalCount
    const bHasPending = b.completedCount < b.totalCount
    if (aHasPending && !bHasPending) return -1
    if (!aHasPending && bHasPending) return 1
    return b.totalCount - a.totalCount // 按待办数量排序
  })
})

const getPreviewTodos = (todos: TodoItem[]) => {
  return todos.slice(0, 3)
}

const loadNotesWithTodos = async () => {
  try {
    loading.value = true
    const db = await getDB()

    // 获取所有笔记
    const notes = await db.notes.find().exec()
    const moduleDataDocs = await db.module_data.find({
      selector: {
        moduleId: 'todo'
      }
    }).exec()

    // 构建笔记待办汇总
    const summaries: NoteTodoSummary[] = []

    for (const note of notes) {
      const moduleData = moduleDataDocs.find(doc => doc.noteId === note.id)
      if (moduleData) {
        const data = moduleData.data as { todos: TodoItem[] }
        if (data.todos && data.todos.length > 0) {
          const completedCount = data.todos.filter(t => t.completed).length
          summaries.push({
            id: note.id,
            title: note.title || '未命名笔记',
            completedCount,
            totalCount: data.todos.length,
            todos: data.todos
          })
        }
      }
    }

    notesWithTodos.value = summaries
  } catch (error) {
    console.error('加载待办任务失败:', error)
  } finally {
    loading.value = false
  }
}

const goToNote = (noteId: string) => {
  router.push(`/notes?note=${noteId}`)
}

const goToNotes = () => {
  router.push('/notes')
}

onMounted(() => {
  loadNotesWithTodos()
})
</script>

<style scoped>
.todo-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}

.todo-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
}

.bg-blob-1 {
  top: -10%;
  left: -8%;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgb(255, 138, 173) 0%, rgba(255, 138, 173, 0) 70%);
}

.bg-blob-2 {
  top: -5%;
  right: -5%;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgb(120, 174, 255) 0%, rgba(120, 174, 255, 0) 70%);
}

.bg-blob-3 {
  bottom: -15%;
  left: 30%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgb(177, 156, 255) 0%, rgba(177, 156, 255, 0) 70%);
}

@media (max-width: 767px) {
  .bg-blob-1 {
    width: 280px;
    height: 280px;
  }
  .bg-blob-2 {
    width: 300px;
    height: 300px;
  }
  .bg-blob-3 {
    width: 320px;
    height: 320px;
  }
}

.bg-grain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(0, 0, 0, 0.025) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
  opacity: 0.6;
}

.todo-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 24px;
  gap: 16px;
}

.todo-container.mobile {
  padding: 16px;
  gap: 12px;
}

.todo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.todo-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.todo-summary {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.filter-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.8);
}

.filter-btn.active {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: rgba(60, 60, 67, 0.55);
  gap: 14px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.empty-action-btn {
  padding: 10px 20px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.empty-action-btn:hover {
  background: rgb(0, 110, 250);
}

.todo-notes-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-todo-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
}

.note-todo-card:hover {
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.06);
}

.note-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.note-icon {
  color: rgb(0, 122, 255);
  flex-shrink: 0;
}

.note-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-item {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(60, 60, 67, 0.08);
  color: rgba(60, 60, 67, 0.6);
}

.stat-item.completed {
  background: rgba(52, 199, 89, 0.1);
  color: rgb(52, 199, 89);
}

.stat-item.total {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.todo-preview {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(60, 60, 67, 0.7);
}

.todo-preview-item.completed {
  opacity: 0.5;
  text-decoration: line-through;
}

.todo-preview-item.completed .todo-text {
  color: rgba(60, 60, 67, 0.4);
}

.todo-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-more {
  font-size: 12px;
  color: rgba(60, 60, 67, 0.5);
  font-weight: 500;
  text-align: center;
  padding: 4px 0;
}
</style>
