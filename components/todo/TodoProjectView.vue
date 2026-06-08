<template>
  <div class="todo-project-view">
    <!-- 顶部工具栏 -->
    <div class="view-header">
      <!-- 面包屑预留位置（始终占位） -->
      <div class="breadcrumb-placeholder">
        <div class="focus-breadcrumb" v-if="focusedNoteId">
          <button class="breadcrumb-clear" @click="clearFocus" title="清除聚焦">
            <Icon :name="ICONS.altArrowLeft" size="14" />
          </button>
          <div class="breadcrumb-items">
            <button
              v-for="(crumb, index) in focusBreadcrumbs"
              :key="crumb.id"
              class="breadcrumb-item"
              :class="{ current: index === focusBreadcrumbs.length - 1 }"
              @click="handleBreadcrumbClick(crumb, index)"
            >
              {{ crumb.title || '未命名' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 周范围 -->
      <div class="week-range">
        {{ weekRangeLabel }}
      </div>

      <!-- 周导航 -->
      <div class="week-nav">
        <button class="nav-btn" @click="prevWeek" title="上一周">
          <Icon :name="ICONS.altArrowLeft" size="18" />
        </button>
        <button class="today-btn" @click="goToToday">今天</button>
        <button class="nav-btn" @click="nextWeek" title="下一周">
          <Icon :name="ICONS.altArrowRight" size="18" />
        </button>
      </div>
    </div>

    <!-- 表头 -->
    <div class="table-header">
      <div class="header-cell header-note">
        <div class="header-note-content">
          <span>笔记</span>
          <div class="header-expand-actions">
            <button class="header-expand-btn" @click="expandAll" title="展开全部">
              <Icon :name="ICONS.altArrowDown" size="14" />
            </button>
            <button class="header-expand-btn" @click="collapseAll" title="折叠全部">
              <Icon :name="ICONS.altArrowLeft" size="14" />
            </button>
          </div>
        </div>
      </div>
      <div
        v-for="date in weekDates"
        :key="date.dateStr"
        class="header-cell header-date"
        :class="{ today: date.isToday }"
      >
        {{ date.label }}
      </div>
    </div>

    <!-- 表格内容 -->
    <div class="table-body">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>加载中...</p>
      </div>

      <div v-else-if="weekRows.length === 0" class="empty-state">
        <Icon :name="ICONS.notebook" size="48" />
        <p>暂无数据</p>
      </div>

      <template v-else>
        <div
          v-for="row in weekRows"
          :key="row.noteId"
          class="table-row"
        >
          <!-- 笔记列 -->
          <div
            class="row-cell cell-note"
            :class="{ 'has-children': hasChildren(row.noteId), ...getNoteDragClass(row) }"
            draggable="true"
            @dragstart="handleNoteDragStart(row, $event)"
            @dragend="resetDragState"
            @contextmenu.prevent="handleNoteContextMenu($event, row)"
          >
            <!-- 缩进占位 -->
            <span
              class="note-indent"
              :style="{ width: `${row.level * 16}px` }"
            />
            <button
              v-if="hasChildren(row.noteId)"
              class="expand-btn"
              @click.stop="toggleNote(row.noteId)"
            >
              <Icon
                :name="row.expanded ? ICONS.altArrowDown : ICONS.altArrowRight"
                size="14"
              />
            </button>
            <button
              class="note-title"
              :title="row.title"
              @click.stop="handleNoteClick(row.noteId)"
            >
              {{ row.title }}
            </button>
            <span v-if="row.tasks.length > 0" class="task-count">
              {{ row.tasks.length }}
            </span>
            <span v-if="row.noteClass" class="note-class" :style="{ color: row.noteClass.color }">
              {{ row.noteClass.name }}
            </span>
          </div>

          <!-- 日期列 -->
          <div
            v-for="date in weekDates"
            :key="date.dateStr"
            class="row-cell cell-date"
            :class="{
              today: date.isToday,
              'drag-over': dropTarget?.dateStr === date.dateStr && dropTarget?.noteId === row.noteId,
              'dragging-over': isDragging && dragType === 'task'
            }"
            @dragover="onTaskDragOver(date.dateStr, row.noteId, $event)"
            @dragleave="onTaskDragLeave($event)"
            @drop="onTaskDrop($event)"
          >
            <div class="cell-tasks">
              <!-- 折叠时显示子笔记待办合计数 -->
              <div
                v-if="!row.expanded && row.collapsedCount?.[date.dateStr] > 0"
                class="collapsed-count-badge"
                :title="`子笔记共有 ${row.collapsedCount[date.dateStr]} 个待办`"
              >
                {{ row.collapsedCount[date.dateStr] }}
              </div>

              <div
                v-for="task in row.cells[date.dateStr]"
                :key="task.id"
                class="task-chip"
                :class="{
                  completed: task.completed,
                  high: task.priority === 'high',
                  medium: task.priority === 'medium',
                  'dragging': isDragging && dragType === 'task' && dragState.value.dragData?.id === task.id
                }"
                :style="getTaskStyle(task)"
                draggable="true"
                @dragstart="handleDragStart(task, date.dateStr, row.noteId, $event)"
                @click="handleTaskClick(task)"
              >
                <Icon
                  :name="task.completed ? ICONS.checkCircle : ICONS.round"
                  :size="12"
                  :color="task.statusColor"
                  @click.stop="handleToggleTask(task)"
                />
                <span class="task-text">{{ task.text }}</span>
              </div>

              <!-- 快捷新增按钮 -->
              <button
                class="add-task-btn"
                title="添加待办"
                @click="handleQuickAdd(row.noteId, date.dateStr)"
              >
                <Icon :name="ICONS.addCircle" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 任务编辑对话框 -->
    <TodoEditDialog
      v-model:visible="showEditDialog"
      :todo="editingTask"
      :is-creating="isCreating"
      :initial-data="initialTaskData"
      @save="handleSaveTask"
      @create="handleCreateTask"
      @delete="handleDeleteTask"
    />

    <!-- 笔记右键菜单 -->
    <NoteContextMenu
      v-model:visible="contextMenuVisible"
      :note="contextMenuNote"
      :x="contextMenuX"
      :y="contextMenuY"
      @view="handleMenuViewNote"
      @edit="handleMenuEditNote"
      @add-child="handleMenuAddChildNote"
      @delete="handleMenuDeleteNote"
    />

    <!-- 笔记编辑对话框 -->
    <NoteEditorDialog
      v-model:visible="showNoteEditDialog"
      :note="noteToEdit"
      :parent-id="parentNoteId"
      :is-creating="isNoteCreating"
      @saved="handleNoteSaved"
      @created="handleNoteCreated"
    />
    <!-- 统计行 -->
    <div v-if="!loading && weekRows.length > 0" class="table-footer">
      <div class="footer-cell footer-label">统计</div>
      <div
        v-for="date in weekDates"
        :key="date.dateStr"
        class="footer-cell footer-date"
        :class="{ today: date.isToday }"
      >
        <div class="daily-stat">
          <span class="stat-completed">{{ dailyStats[date.dateStr]?.completed ?? 0 }}</span>
          <span class="stat-separator">/</span>
          <span class="stat-pending">{{ dailyStats[date.dateStr]?.pending ?? 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ICONS, SOLAR_ICONS } from '~/composables/useIcons'
import { useTodoProjectView, type WeekRow, type CellTask } from '~/composables/useTodoProjectView'
import { useDragDrop, type NoteDragData } from '~/composables/useDragDrop'
import { getDB, generateId, now } from '~/services/db'
import { useConfirm } from '~/composables/useConfirm'
import type { TodoItem } from '~/types/todo'
import type { Note } from '~/types/block'
import TodoEditDialog from './TodoEditDialog.vue'
import NoteContextMenu from '~/components/NoteContextMenu.vue'
import NoteEditorDialog from '~/components/NoteEditDialog.vue'

interface Props {
  weekStart?: Date
}

const props = withDefaults(defineProps<Props>(), {
  weekStart: () => new Date()
})

const emit = defineEmits<{
  (e: 'update:weekStart', value: Date): void
}>()

// 使用 composable
const {
  loading,
  weekStart,
  weekDates,
  notesWithLevel,
  weekRows,
  loadData,
  toggleNote,
  expandAll,
  collapseAll,
  prevWeek,
  nextWeek,
  goToToday,
  focusNote,
  clearFocus,
  focusedNoteId,
  focusBreadcrumbs,
  subscribeChanges,
  unsubscribeChanges
} = useTodoProjectView({ weekStart: props.weekStart })

// 拖拽功能
const {
  dragState,
  dropTarget,
  isDragging,
  dragType,
  startDragTask,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDrop,
  startDragNote,
  resetDragState
} = useDragDrop({
  onTaskDrop: async (taskId, targetNoteId, targetDate) => {
    await handleMoveTask(taskId, targetNoteId, targetDate)
  },
  onNoteDrop: async (noteId, targetParentId, targetIndex) => {
    await handleMoveNote(noteId, targetParentId, targetIndex)
  }
})

// 对话框状态
const showEditDialog = ref(false)
const editingTask = ref<TodoItem | null>(null)
const isCreating = ref(false)
const initialTaskData = ref<Partial<TodoItem> | null>(null)

// 笔记右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuNote = ref<Note | null>(null)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 笔记编辑对话框状态
const showNoteEditDialog = ref(false)
const noteToEdit = ref<Note | null>(null)
const isNoteCreating = ref(false)
const parentNoteId = ref<string | undefined>(undefined)

// 周范围标签
const weekRangeLabel = computed(() => {
  if (weekDates.value.length === 0) return ''
  const start = weekDates.value[0]
  const end = weekDates.value[6]
  const startMonth = start.date.getMonth() + 1
  const endMonth = end.date.getMonth() + 1
  if (startMonth === endMonth) {
    return `${startMonth}月 ${start.date.getDate()}日 - ${end.date.getDate()}日`
  }
  return `${startMonth}月${start.date.getDate()}日 - ${endMonth}月${end.date.getDate()}日`
})

// 统计数据 - 按天统计
const dailyStats = computed(() => {
  const stats: Record<string, { completed: number; pending: number }> = {}

  // 初始化每一天
  for (const date of weekDates.value) {
    stats[date.dateStr] = { completed: 0, pending: 0 }
  }

  // 遍历所有行和单元格统计
  for (const row of weekRows.value) {
    for (const [dateStr, tasks] of Object.entries(row.cells)) {
      if (stats[dateStr]) {
        for (const task of tasks) {
          if (task.completed) {
            stats[dateStr].completed++
          } else {
            stats[dateStr].pending++
          }
        }
      }
    }
  }

  return stats
})

// 检查笔记是否有子笔记
function hasChildren(noteId: string): boolean {
  return notesWithLevel.value.some(n => n.parentId === noteId)
}

// 获取任务样式
function getTaskStyle(task: CellTask): Record<string, string> {
  const styles: Record<string, string> = {}
  if (task.statusColor) {
    styles.borderColor = task.statusColor
  }
  if (task.priority === 'high') {
    styles.borderColor = '#ef4444'
  }
  return styles
}

// 切换任务完成状态
async function handleToggleTask(task: CellTask): Promise<void> {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: any[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === task.id)
        if (index !== -1) {
          data.todos[index].completed = !data.todos[index].completed
          await doc.patch({ data: { todos: data.todos } })
          await loadData()
          break
        }
      }
    }
  } catch (err) {
    console.error('切换任务状态失败:', err)
  }
}

// 点击任务
function handleTaskClick(task: CellTask): void {
  isCreating.value = false
  initialTaskData.value = null
  editingTask.value = {
    id: task.id,
    text: task.text,
    completed: task.completed,
    createdAt: '',
    dueDate: task.dueDate,
    statusId: task.statusId,
    priority: task.priority,
    noteId: task.noteId
  }
  showEditDialog.value = true
}

// 快捷新增任务
function handleQuickAdd(noteId: string, dateStr: string): void {
  isCreating.value = true
  editingTask.value = null
  initialTaskData.value = {
    noteId,
    startDate: dateStr,
    dueDate: dateStr
  }
  showEditDialog.value = true
}

// 点击面包屑
function handleBreadcrumbClick(note: Note, index: number) {
  const isLast = index === focusBreadcrumbs.value.length - 1
  if (!isLast) {
    // 点击中间的面包屑项，聚焦到该笔记
    focusNote(note.id)
  }
  // 最后一项是当前聚焦的笔记，点击不做任何事
}

// 点击笔记标题聚焦
function handleNoteClick(noteId: string) {
  focusNote(noteId)
}

// 笔记右键菜单
async function handleNoteContextMenu(event: MouseEvent, row: WeekRow) {
  event.preventDefault()
  event.stopPropagation()

  try {
    const db = await getDB()
    const noteDoc = await db.notes.findOne(row.noteId).exec()
    if (noteDoc) {
      const note = noteDoc.toJSON() as Note
      contextMenuNote.value = note
      contextMenuX.value = event.clientX
      contextMenuY.value = event.clientY
      contextMenuVisible.value = true
    }
  } catch (err) {
    console.error('获取笔记失败:', err)
  }
}

// 右键菜单 - 查看笔记
function handleMenuViewNote(note: Note) {
  // 跳转到笔记页面
  navigateTo({ path: '/notes', query: { id: note.id } })
}

// 右键菜单 - 编辑笔记
function handleMenuEditNote(note: Note) {
  noteToEdit.value = note
  isNoteCreating.value = false
  showNoteEditDialog.value = true
}

// 右键菜单 - 新建子笔记
function handleMenuAddChildNote(note: Note) {
  noteToEdit.value = null
  isNoteCreating.value = true
  parentNoteId.value = note.id
  showNoteEditDialog.value = true
}

// 右键菜单 - 删除笔记
async function handleMenuDeleteNote(note: Note) {
  const { confirm } = useConfirm()
  const ok = await confirm({
    message: `确定要删除笔记"${note.title || '未命名'}"吗？子笔记和待办也会被删除。`,
    danger: true
  })
  if (!ok) return

  try {
    const db = await getDB()
    // 获取所有子孙笔记ID
    const descendantIds = [note.id]
    const queue = [note.id]
    while (queue.length > 0) {
      const current = queue.shift()!
      const children = await db.notes.find({
        selector: { parentId: current }
      }).exec()
      for (const child of children) {
        descendantIds.push(child.id)
        queue.push(child.id)
      }
    }

    // 删除所有笔记的块
    for (const noteId of descendantIds) {
      await db.blocks.find({
        selector: { noteId }
      }).remove()

      // 删除该笔记的待办模块数据
      const moduleDataList = await db.module_data.find({
        selector: { noteId, moduleId: 'todo' }
      }).exec()
      for (const md of moduleDataList) {
        await md.remove()
      }
    }

    // 删除笔记
    for (const noteId of descendantIds) {
      const noteDoc = await db.notes.findOne(noteId).exec()
      if (noteDoc) {
        await noteDoc.remove()
      }
    }

    await loadData()
  } catch (err) {
    console.error('删除笔记失败:', err)
  }
}

// 笔记编辑完成
async function handleNoteSaved(note: Note) {
  await loadData()
}

// 笔记创建完成
async function handleNoteCreated(note: Note) {
  await loadData()
}

// 保存任务
async function handleSaveTask(todo: TodoItem): Promise<void> {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === todo.id)
        if (index !== -1) {
          data.todos[index] = todo
          await doc.patch({ data: { todos: data.todos } })
          await loadData()
          break
        }
      }
    }
    showEditDialog.value = false
  } catch (err) {
    console.error('保存任务失败:', err)
  }
}

// 创建新任务
async function handleCreateTask(todo: TodoItem): Promise<void> {
  try {
    const db = await getDB()

    // 查找或创建该笔记的 module_data
    const targetNoteId = todo.noteId || ''
    let moduleData = await db.module_data.findOne({
      selector: {
        noteId: targetNoteId,
        moduleId: 'todo'
      }
    }).exec()

    if (moduleData) {
      // 已存在，添加新任务
      const data = moduleData.get('data') as { todos: TodoItem[] } | undefined
      if (data?.todos) {
        data.todos.push(todo)
        await moduleData.patch({ data: { todos: data.todos } })
      } else {
        await moduleData.patch({ data: { todos: [todo] } })
      }
    } else {
      // 不存在，创建新的 module_data
      const { generateId, now } = await import('~/services/db')
      await db.module_data.insert({
        id: generateId(),
        noteId: targetNoteId,
        moduleId: 'todo',
        data: { todos: [todo] },
        createdAt: now(),
        updatedAt: now()
      })
    }

    await loadData()
    showEditDialog.value = false
  } catch (err) {
    console.error('创建任务失败:', err)
  }
}

// 删除任务
async function handleDeleteTask(todo: TodoItem): Promise<void> {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === todo.id)
        if (index !== -1) {
          data.todos.splice(index, 1)
          await doc.patch({ data: { todos: data.todos } })
          await loadData()
          break
        }
      }
    }
    showEditDialog.value = false
  } catch (err) {
    console.error('删除任务失败:', err)
  }
}

// 移动任务到新日期/笔记
async function handleMoveTask(taskId: string, targetNoteId: string, targetDate: string): Promise<void> {
  try {
    const db = await getDB()
    const moduleDataList = await db.module_data.find({
      selector: { moduleId: 'todo' }
    }).exec()

    for (const doc of moduleDataList) {
      const data = doc.get('data') as { todos: TodoItem[] }
      if (data?.todos) {
        const index = data.todos.findIndex(t => t.id === taskId)
        if (index !== -1) {
          const task = data.todos[index]

          // 如果目标笔记不同
          if (doc.noteId !== targetNoteId) {
            // 从原笔记移除
            data.todos.splice(index, 1)
            await doc.patch({ data: { todos: [...data.todos] } })

            // 更新任务的 noteId 和日期
            task.noteId = targetNoteId
            task.dueDate = targetDate
            task.startDate = targetDate

            // 添加到目标笔记
            let targetModuleData = await db.module_data.findOne({
              selector: { noteId: targetNoteId, moduleId: 'todo' }
            }).exec()

            if (targetModuleData) {
              const targetData = targetModuleData.get('data') as { todos: TodoItem[] } | undefined
              const updatedTodos = targetData?.todos || []
              updatedTodos.push(task)
              await targetModuleData.patch({ data: { todos: updatedTodos } })
            } else {
              await db.module_data.insert({
                id: generateId(),
                noteId: targetNoteId,
                moduleId: 'todo',
                data: { todos: [task] },
                createdAt: now(),
                updatedAt: now()
              })
            }
          } else {
            // 同一笔记，只更新日期
            data.todos[index].dueDate = targetDate
            data.todos[index].startDate = targetDate
            await doc.patch({ data: { todos: [...data.todos] } })
          }

          await loadData()
          return
        }
      }
    }
  } catch (err) {
    console.error('移动任务失败:', err)
  }
}

// 移动笔记到新父级
async function handleMoveNote(noteId: string, targetParentId: string | null, targetIndex: number): Promise<void> {
  try {
    const db = await getDB()
    const noteDoc = await db.notes.findOne(noteId).exec()

    if (!noteDoc) return

    // 获取目标父级的子笔记
    const selector = targetParentId
      ? { parentId: targetParentId }
      : { parentId: { $exists: false } }

    const siblings = await db.notes.find({
      selector,
      sort: [{ order: 'asc' }]
    }).exec()

    // 计算新的 order 值
    let newOrder: number
    if (targetIndex >= siblings.length || siblings.length === 0) {
      const lastSibling = siblings[siblings.length - 1]
      newOrder = lastSibling ? (lastSibling.order || 0) + 1 : 0
    } else if (targetIndex === 0) {
      newOrder = (siblings[0]?.order || 0) - 1
    } else {
      const before = siblings[targetIndex - 1]
      const after = siblings[targetIndex]
      newOrder = ((before?.order || 0) + (after?.order || 1)) / 2
    }

    await noteDoc.patch({
      parentId: targetParentId || undefined,
      order: newOrder
    })

    await loadData()
  } catch (err) {
    console.error('移动笔记失败:', err)
  }
}

// 拖拽任务开始
function handleDragStart(task: CellTask, dateStr: string, noteId: string, event: DragEvent) {
  startDragTask(task, dateStr, noteId, event)
}

// 拖拽笔记开始
function handleNoteDragStart(row: WeekRow, event: DragEvent) {
  const noteData: NoteDragData = {
    noteId: row.noteId,
    title: row.title,
    level: row.level
  }
  startDragNote(noteData, event)
}

// 获取笔记拖拽样式
function getNoteDragClass(row: WeekRow): string {
  if (!isDragging.value) return ''
  if (dragType.value === 'note' && dragState.value.dragData?.noteId === row.noteId) {
    return 'dragging'
  }
  if (dragType.value === 'note' && dropTarget.value?.noteId === row.noteId) {
    return 'drag-over'
  }
  return ''
}

// 监听周变化
watch(weekStart, (newVal) => {
  emit('update:weekStart', new Date(newVal))
})

// 初始化
onMounted(() => {
  loadData()
  subscribeChanges()
})

onUnmounted(() => {
  unsubscribeChanges()
})
</script>

<style scoped>
.todo-project-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--liquid-bg, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(var(--liquid-blur, 20px));
  border-radius: var(--liquid-radius, 20px);
}

/* 顶部工具栏 */
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
  gap: 16px;
}

/* 面包屑占位区（始终预留空间） */
.breadcrumb-placeholder {
  width: 200px;
  flex-shrink: 0;
  min-height: 32px;
  display: flex;
  align-items: center;
}

/* 聚焦面包屑 */
.focus-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(0, 122, 255, 0.08);
  border-radius: var(--liquid-radius-button, 14px);
  width: 100%;
  overflow: hidden;
}

.breadcrumb-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: rgba(60, 60, 67, 0.1);
  border: none;
  border-radius: 6px;
  color: rgba(60, 60, 67, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.breadcrumb-clear:hover {
  background: rgba(60, 60, 67, 0.2);
  color: rgba(60, 60, 67, 0.8);
}

.breadcrumb-items {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-item {
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.breadcrumb-item:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.9);
}

.breadcrumb-item.current {
  background: rgba(0, 122, 255, 0.15);
  color: rgb(0, 122, 255);
  cursor: default;
}

.week-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(60, 60, 67, 0.05);
  border: none;
  border-radius: var(--liquid-radius-button, 14px);
  color: rgba(60, 60, 67, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.9);
}

.today-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.08);
  border: none;
  border-radius: var(--liquid-radius-button, 14px);
  color: rgb(0, 122, 255);
  cursor: pointer;
  transition: all 0.15s ease;
}

.today-btn:hover {
  background: rgba(0, 122, 255, 0.15);
}

.week-range {
  font-size: 15px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.9);
}

/* 表头 */
.table-header {
  display: flex;
  padding: 8px 16px;
  background: rgba(60, 60, 67, 0.03);
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.12);
}

.header-cell {
  flex-shrink: 0;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
}

.header-note {
  width: 200px;
  padding-left: 12px;
  padding-right: 8px;
  text-align: left;
  position: sticky;
  left: 0;
  background: inherit;
  z-index: 2;
}

.header-note-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-expand-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.header-note:hover .header-expand-actions {
  opacity: 1;
}

.header-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-expand-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.header-date {
  width: 140px;
}

.header-date.today {
  color: rgb(0, 122, 255);
}

/* 表格内容 */
.table-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: rgba(60, 60, 67, 0.5);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(60, 60, 67, 0.1);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 表格行 */
.table-row {
  display: flex;
  border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
  transition: background 0.15s ease;
}

.table-row:hover {
  background: rgba(60, 60, 67, 0.03);
}

.row-cell {
  flex-shrink: 0;
  padding: 8px;
  min-height: 40px;
}

/* 笔记列 */
.cell-note {
  width: 200px;
  display: flex;
  align-items: center;
  gap: 6px;
  position: sticky;
  left: 0;
  background: inherit;
  z-index: 1;
  padding-left: 12px;
}

.note-indent {
  flex-shrink: 0;
  display: inline-block;
}

.cell-note::before {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(60, 60, 67, 0.1);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: rgba(60, 60, 67, 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.expand-btn:hover {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.note-title {
  flex: 1;
  padding: 4px 6px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.8);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.15s ease;
}

.note-title:hover {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.task-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.4);
  background: rgba(60, 60, 67, 0.08);
  padding: 2px 6px;
  border-radius: 8px;
}

.note-class {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 11px;
  font-weight: 500;
  opacity: 0.7;
}

/* 日期列 */
.cell-date {
  width: 140px;
  padding: 6px 8px;
  background: rgba(60, 60, 67, 0.02);
  border-left: 0.5px solid rgba(60, 60, 67, 0.06);
}

.cell-date.today {
  background: rgba(0, 122, 255, 0.03);
}

.cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 折叠时子笔记待办合计数小标 */
.collapsed-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.5);
  background: rgba(60, 60, 67, 0.06);
  border: 1px solid rgba(60, 60, 67, 0.1);
  border-radius: 10px;
  user-select: none;
}

.add-task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 8px;
  background: transparent;
  border: 0.5px dashed rgba(60, 60, 67, 0.15);
  border-radius: 6px;
  color: rgba(60, 60, 67, 0.3);
  cursor: pointer;
  transition: all 0.15s ease;
  opacity: 0;
}

.cell-date:hover .add-task-btn {
  opacity: 1;
}

.add-task-btn:hover {
  background: rgba(60, 60, 67, 0.05);
  border-color: rgba(60, 60, 67, 0.25);
  color: rgba(0, 122, 255, 0.7);
}

.task-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(60, 60, 67, 0.15);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.task-chip:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(60, 60, 67, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.task-chip.completed {
  opacity: 0.6;
}

.task-chip.completed .task-text {
  text-decoration: line-through;
}

.task-chip.high {
  border-left-width: 3px;
}

.task-chip.medium {
  border-left-width: 2px;
}

.task-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(60, 60, 67, 0.8);
}

/* 表格底部统计行 */
.table-footer {
  display: flex;
  border-top: 1px solid rgba(60, 60, 67, 0.15);
  background: rgba(60, 60, 67, 0.03);
  position: sticky;
  bottom: 0;
  z-index: 3;
}

.footer-cell {
  flex-shrink: 0;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-label {
  width: 200px;
  padding-left: 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  justify-content: flex-start;
  position: sticky;
  left: 0;
  background: inherit;
}

.footer-date {
  width: 140px;
}

.footer-date.today {
  background: rgba(0, 122, 255, 0.05);
}

.daily-stat {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.stat-completed {
  color: rgb(52, 199, 89);
}

.stat-separator {
  color: rgba(60, 60, 67, 0.3);
}

.stat-pending {
  color: rgba(60, 60, 67, 0.7);
}

/* ==================== 拖拽样式 ==================== */

/* 拖拽预览元素（不可见，仅用于生成拖拽图像） */
.drag-preview {
  position: fixed;
  padding: 8px 12px;
  background: rgba(0, 122, 255, 0.95);
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 9999;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-preview-note {
  background: rgba(60, 60, 67, 0.9);
}

/* 正在拖拽的元素样式 */
.task-chip.dragging,
.cell-note.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* 拖拽悬停目标样式 */
.cell-date.drag-over {
  background: rgba(0, 122, 255, 0.1) !important;
  border: 2px dashed rgba(0, 122, 255, 0.4);
  border-radius: 8px;
}

.cell-date.dragging-over {
  transition: background 0.15s ease;
}

.cell-date.dragging-over:hover {
  background: rgba(0, 122, 255, 0.05);
}

/* 笔记行拖拽悬停样式 */
.cell-note.drag-over {
  background: rgba(0, 122, 255, 0.1) !important;
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .todo-project-view {
    background: var(--liquid-bg, rgba(255, 255, 255, 0.05));
  }

  .view-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .focus-breadcrumb {
    background: rgba(0, 122, 255, 0.15);
  }

  .breadcrumb-clear {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
  }

  .breadcrumb-clear:hover {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
  }

  .breadcrumb-item {
    color: rgba(255, 255, 255, 0.7);
  }

  .breadcrumb-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .breadcrumb-item.current {
    background: rgba(0, 122, 255, 0.2);
    color: rgb(0, 122, 255);
  }

  .nav-btn {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.9);
  }

  .today-btn {
    background: rgba(0, 122, 255, 0.15);
    color: rgb(0, 122, 255);
  }

  .today-btn:hover {
    background: rgba(0, 122, 255, 0.25);
  }

  .week-range {
    color: rgba(255, 255, 255, 0.9);
  }

  .header-cell {
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.03);
  }

  .table-row {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .table-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .loading-state,
  .empty-state {
    color: rgba(255, 255, 255, 0.5);
  }

  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: rgb(0, 122, 255);
  }

  .cell-note::before {
    background: rgba(255, 255, 255, 0.1);
  }

  .expand-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .expand-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }

  .note-title {
    color: rgba(255, 255, 255, 0.8);
  }

  .note-title:hover {
    background: rgba(0, 122, 255, 0.15);
    color: rgb(0, 122, 255);
  }

  .task-count {
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.08);
  }

  .note-class {
    opacity: 0.8;
  }

  .cell-date {
    background: rgba(255, 255, 255, 0.02);
    border-left-color: rgba(255, 255, 255, 0.06);
  }

  .cell-date.today {
    background: rgba(0, 122, 255, 0.05);
  }

  .task-chip {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .task-chip:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .task-text {
    color: rgba(255, 255, 255, 0.8);
  }

  .add-task-btn {
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.3);
  }

  .add-task-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.25);
    color: rgb(0, 122, 255);
  }

  .table-footer {
    border-top-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
  }

  .footer-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .footer-date.today {
    background: rgba(0, 122, 255, 0.08);
  }

  .stat-separator {
    color: rgba(255, 255, 255, 0.3);
  }

  .stat-pending {
    color: rgba(255, 255, 255, 0.7);
  }

  .collapsed-count-badge {
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .header-expand-btn {
    color: rgba(255, 255, 255, 0.4);
  }

  .header-expand-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .view-header {
    padding: 10px 12px;
    flex-wrap: wrap;
  }

  .week-range {
    font-size: 14px;
  }

  .table-header {
    padding: 6px 12px;
  }

  .header-note {
    width: 150px;
  }

  .header-date {
    width: 100px;
  }

  .cell-note {
    width: 150px;
  }

  .cell-date {
    width: 100px;
  }

  .task-chip {
    font-size: 11px;
    padding: 3px 6px;
  }

  .footer-label {
    width: 150px;
    font-size: 11px;
  }

  .footer-date {
    width: 100px;
  }

  .daily-stat {
    font-size: 12px;
  }
}
</style>
