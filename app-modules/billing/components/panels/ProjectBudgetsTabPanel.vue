<template>
  <div class="tab-panel">
    <ProjectBudgetDashboard
      :year="budgetYear"
      @edit-cell="openMonthBillsDialog"
      @note-contextmenu="openNoteContextMenu"
      @note-click="onNoteClick"
      @bill-drop="handleBillDrop"
    />
  </div>
  <NoteContextMenu
    v-model:visible="contextMenuVisible"
    :note="contextMenuNote"
    :x="contextMenuPosition.x"
    :y="contextMenuPosition.y"
    @focus="handleContextMenuFocus"
    @view="handleContextMenuView"
    @edit="handleContextMenuEdit"
    @add-child="handleContextMenuAddChild"
    @delete="handleContextMenuDelete"
  />
  <ProjectBudgetDialog
    ref="budgetDialogRef"
    v-if="budgetDialogVisible"
    :visible="budgetDialogVisible"
    :budget="editingBudget"
    :note-options="noteOptions"
    :default-year="budgetYear"
    :default-month="new Date().getMonth() + 1"
    :default-note-id="currentNoteId"
    @confirm="handleBudgetConfirm"
    @cancel="closeBudgetDialog"
    @show-history="openBudgetHistory"
  />
  <ProjectBudgetHistory
    v-if="budgetHistoryVisible"
    :visible="budgetHistoryVisible"
    :note-id="historyDialogData.noteId"
    :note-name="historyDialogData.noteName"
    :current-budget-id="historyDialogData.currentBudgetId"
    :history-entries="historyDialogData.historyEntries"
    @cancel="closeBudgetHistory"
  />
  <NoteMonthBillsDrawer
    v-model:visible="monthBillsDialogVisible"
    :note-id="monthBillsDialogData.noteId"
    :note-name="monthBillsDialogData.noteName"
    :year="monthBillsDialogData.year"
    :month="monthBillsDialogData.month"
  />
  <NoteEditDialog
    v-model:visible="noteEditDialogVisible"
    :note="noteEditDialogNote"
    :parent-id="noteEditDialogParentId"
    :is-creating="noteEditDialogIsCreating"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, provide } from 'vue'
import { useNotes } from '~/composables/useNotes'
import { useBudgets } from '~/composables/useBudgets'
import { useBills } from '~/composables/useBills'
import { useToast } from '~/composables/useToast'
import { useBillDragDrop } from '~/composables/useBillDragDrop'
import type { BudgetFormData, BudgetEntry } from '~/types/bill'
import ProjectBudgetDashboard from '../ProjectBudgetDashboard.vue'
import ProjectBudgetDialog from '../ProjectBudgetDialog.vue'
import ProjectBudgetHistory from '../ProjectBudgetHistory.vue'
import NoteMonthBillsDrawer from '../NoteMonthBillsDrawer.vue'
import NoteContextMenu from '~/components/NoteContextMenu.vue'
import NoteEditDialog from '~/components/NoteEditDialog.vue'
import type { Note } from '~/types/block'

const props = defineProps<{
  budgetYear: number
}>()

const { success: showSuccess, error: showError } = useToast()
const { noteOptions, notes } = useNotes()
const { upsertBudget, budgets, getNoteBudgetEntries } = useBudgets()
const { updateBills } = useBills()

// 账单拖拽状态 —— provide 给 Dashboard 和 Drawer 共享
const billDragDrop = useBillDragDrop()
provide('billDragDrop', billDragDrop)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuNote = ref<Note | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 对话框状态
const budgetDialogVisible = ref(false)
const editingBudget = ref<BudgetEntry | undefined>(undefined)
const budgetDialogRef = ref<InstanceType<typeof ProjectBudgetDialog> | null>(null)
const currentNoteId = ref<string>('')

// 预算历史对话框状态
const budgetHistoryVisible = ref(false)
const historyDialogData = ref({
  noteId: '',
  noteName: '',
  currentBudgetId: '',
  historyEntries: [] as BudgetEntry[]
})

// 笔记编辑对话框状态
const noteEditDialogVisible = ref(false)
const noteEditDialogNote = ref<Note | null>(null)
const noteEditDialogParentId = ref('')
const noteEditDialogIsCreating = ref(false)

// 月份支出列表抽屉状态
const monthBillsDialogVisible = ref(false)
const monthBillsDialogData = ref({
  noteId: '',
  noteName: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
})

function getNoteName(noteId: string): string {
  if (noteId === '__none__') return '无关联'
  const note = notes.value.find(n => n.id === noteId)
  return note?.title || '未知笔记'
}

function openMonthBillsDialog(payload: { noteId: string; year: number; month: number }) {
  monthBillsDialogData.value = {
    noteId: payload.noteId,
    noteName: getNoteName(payload.noteId),
    year: payload.year,
    month: payload.month
  }
  monthBillsDialogVisible.value = true
}

function onNoteClick(payload: { noteId: string; year: number; month: number }) {
  const { noteId, year, month } = payload

  // 获取该笔记的所有预算配置
  const noteBudgets = getNoteBudgetEntries(noteId)

  // 找到在指定年月生效的最新配置
  const targetTime = year * 12 + month
  const matchedBudget = noteBudgets
    .filter(b => {
      const budgetTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
      return budgetTime <= targetTime
    })
    .sort((a, b) => {
      const aTime = a.effectiveFromYear * 12 + a.effectiveFromMonth
      const bTime = b.effectiveFromYear * 12 + b.effectiveFromMonth
      return bTime - aTime // 降序，取最新的
    })[0]

  // 打开预算对话框
  if (matchedBudget) {
    // 编辑现有预算
    editingBudget.value = matchedBudget
  } else {
    // 新增预算
    editingBudget.value = undefined
  }

  // 临时保存 noteId
  currentNoteId.value = noteId

  // 设置默认值并打开对话框
  budgetDialogVisible.value = true

  // 等待对话框挂载后设置默认值
  nextTick(() => {
    if (budgetDialogRef.value) {
      budgetDialogRef.value.setNoteId(noteId)
    }
  })
}

function closeBudgetDialog() {
  budgetDialogVisible.value = false
  editingBudget.value = undefined
  currentNoteId.value = ''
}

function openBudgetHistory(noteId: string) {
  if (!noteId) return

  // 获取该笔记的所有预算历史
  const historyEntries = getNoteBudgetEntries(noteId)

  // 如果正在编辑预算，使用当前预算的 ID 作为 currentBudgetId
  const currentBudgetId = editingBudget.value?.id || ''

  historyDialogData.value = {
    noteId,
    noteName: getNoteName(noteId),
    currentBudgetId,
    historyEntries
  }
  budgetHistoryVisible.value = true
}

function closeBudgetHistory() {
  budgetHistoryVisible.value = false
}

async function handleBudgetConfirm(data: BudgetFormData) {
  try {
    if (!data.noteId) {
      showError('请选择笔记')
      return
    }
    if (data.amount <= 0) {
      showError('预算金额必须大于 0')
      return
    }
    // 项目预算使用 note: 前缀
    // 如果是"无关联"，noteId 为 __none__
    const budgetData = {
      ...data,
      categoryId: `note:${data.noteId}`
    }
    await upsertBudget(budgetData)
    showSuccess('预算已保存')
    closeBudgetDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

/**
 * 处理账单拖放到项目列
 */
async function handleBillDrop(payload: { billIds: string[]; targetNoteId: string }) {
  // __none__ 表示"无关联"，对应空字符串 noteId
  const targetNoteId = payload.targetNoteId === '__none__' ? '' : payload.targetNoteId
  const targetName = getNoteName(payload.targetNoteId)

  try {
    const result = await updateBills(payload.billIds, { noteId: targetNoteId })
    if (result.failedIds.length > 0) {
      showError(`${result.failedIds.length} 笔账单关联失败`)
    }
    showSuccess(`已将 ${payload.billIds.length} 笔账单关联到「${targetName}」`)
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

function openNoteContextMenu(payload: { node: any; x: number; y: number }) {
  const { node, x, y } = payload
  // 排除"无关联"行
  if (node.isUnlinked) return

  const note = notes.value.find(n => n.id === node.id)
  if (!note) return

  contextMenuNote.value = note
  contextMenuPosition.value = { x, y }
  contextMenuVisible.value = true
}

function handleContextMenuFocus() {
  if (!contextMenuNote.value) return
  // 聚焦笔记 - 在项目预算中不需要特殊处理
  contextMenuVisible.value = false
}

function handleContextMenuView() {
  if (!contextMenuNote.value) return
  // 查看笔记 - 打开预算对话框
  const noteId = contextMenuNote.value.id
  contextMenuVisible.value = false

  // 触发点击逻辑
  onNoteClick({
    noteId,
    year: budgetYear,
    month: new Date().getMonth() + 1
  })
}

function handleContextMenuEdit() {
  if (!contextMenuNote.value) return
  contextMenuVisible.value = false
  noteEditDialogNote.value = contextMenuNote.value
  noteEditDialogParentId.value = ''
  noteEditDialogIsCreating.value = false
  noteEditDialogVisible.value = true
}

function handleContextMenuAddChild() {
  if (!contextMenuNote.value) return
  contextMenuVisible.value = false
  noteEditDialogNote.value = null
  noteEditDialogParentId.value = contextMenuNote.value.id
  noteEditDialogIsCreating.value = true
  noteEditDialogVisible.value = true
}

function handleContextMenuDelete() {
  if (!contextMenuNote.value) return
  // 删除笔记 - 导航到笔记页面
  const noteId = contextMenuNote.value.id
  contextMenuVisible.value = false

  const router = useRouter()
  router.push(`/notes?id=${noteId}`)
}
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
</style>
