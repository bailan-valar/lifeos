<template>
  <div class="goal-page">
    <div class="goal-bg">
      <div class="bg-blob bg-blob-1" />
      <div class="bg-blob bg-blob-2" />
      <div class="bg-blob bg-blob-3" />
      <div class="bg-grain" />
    </div>

    <div class="goal-container">
      <div class="goal-header">
        <div class="header-left">
          <h2>目标管理</h2>
          <span class="goal-count">{{ filteredGoals.length }} 个目标</span>
        </div>
        <button class="add-btn" type="button" @click="openCreate">
          <Icon name="solar:add-circle-linear" size="18" />
          添加目标
        </button>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <button
            v-for="s in statusFilters"
            :key="s.value"
            class="filter-chip"
            :class="{ active: filterStatus === s.value }"
            @click="filterStatus = s.value"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="filter-group">
          <button
            v-for="p in priorityFilters"
            :key="p.value"
            class="filter-chip priority"
            :class="[p.value, { active: filterPriority === p.value }]"
            @click="filterPriority = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <div class="goal-list">
        <div
          v-for="goal in filteredGoals"
          :key="goal.id"
          class="goal-card"
          :class="{ expanded: expandedId === goal.id }"
        >
          <div class="goal-card-main" @click="toggleExpand(goal.id)">
            <div class="goal-card-left">
              <div class="status-badge" :class="goal.status" @click.stop="cycleStatus(goal)">
                <Icon :name="statusIcon(goal.status)" size="16" />
              </div>
              <div class="goal-info">
                <div class="goal-title-row">
                  <span class="goal-title">{{ goal.title || '未命名目标' }}</span>
                  <span class="priority-tag" :class="goal.priority">{{ priorityLabel(goal.priority) }}</span>
                </div>
                <div class="goal-meta">
                  <span class="type-tag">{{ typeLabel(goal.type) }}</span>
                  <span v-if="goal.plannedStartAt || goal.plannedEndAt" class="time-range">
                    <Icon name="solar:calendar-linear" size="12" />
                    {{ formatDateRange(goal.plannedStartAt, goal.plannedEndAt) }}
                  </span>
                  <span v-if="goal.noteIds?.length" class="note-count">
                    <Icon name="solar:document-text-linear" size="12" />
                    {{ goal.noteIds.length }} 个笔记
                  </span>
                </div>
              </div>
            </div>
            <div class="goal-card-right">
              <button class="icon-btn" type="button" @click.stop="openEdit(goal)">
                <Icon name="solar:pen-new-square-linear" size="16" />
              </button>
              <button class="icon-btn danger" type="button" @click.stop="deleteGoal(goal.id)">
                <Icon name="solar:trash-bin-minimalistic-linear" size="16" />
              </button>
              <Icon
                name="solar:alt-arrow-down-linear"
                size="16"
                class="expand-icon"
                :class="{ rotated: expandedId === goal.id }"
              />
            </div>
          </div>

          <div v-if="expandedId === goal.id" class="goal-card-detail">
            <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>
            <div v-if="linkedNotes(goal).length" class="linked-notes">
              <div class="detail-label">关联笔记</div>
              <div class="note-links">
                <NuxtLink
                  v-for="note in linkedNotes(goal)"
                  :key="note.id"
                  :to="`/notes?note=${note.id}`"
                  class="note-link"
                >
                  <Icon name="solar:document-text-linear" size="14" />
                  {{ note.title || '未命名笔记' }}
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredGoals.length === 0" class="empty-state">
          <Icon name="solar:flag-linear" size="48" />
          <p>暂无目标</p>
          <button class="empty-add-btn" type="button" @click="openCreate">
            添加第一个目标
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalVisible" class="modal-overlay" :style="overlayZIndex ? { zIndex: overlayZIndex } : undefined" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-header">
            <h3>{{ editingId ? '编辑目标' : '添加目标' }}</h3>
            <button class="modal-close" type="button" @click="closeModal">
              <Icon name="solar:close-circle-linear" size="20" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <label>目标名称</label>
              <input v-model="form.title" type="text" placeholder="输入目标名称..." />
            </div>

            <div class="form-row">
              <label>描述</label>
              <textarea v-model="form.description" rows="3" placeholder="输入目标描述..." />
            </div>

            <div class="form-row inline">
              <div class="form-col">
                <label>状态</label>
                <select v-model="form.status">
                  <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div class="form-col">
                <label>类型</label>
                <select v-model="form.type">
                  <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div class="form-col">
                <label>优先级</label>
                <select v-model="form.priority">
                  <option v-for="p in priorityOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
              </div>
            </div>

            <div class="form-row inline">
              <div class="form-col">
                <label>计划开始</label>
                <input v-model="form.plannedStartAt" type="datetime-local" />
              </div>
              <div class="form-col">
                <label>截止时间</label>
                <input v-model="form.plannedEndAt" type="datetime-local" />
              </div>
            </div>

            <div class="form-row">
              <label>关联笔记</label>
              <div class="note-selector">
                <div v-for="note in allNotes" :key="note.id" class="note-option">
                  <input
                    :id="`note-${note.id}`"
                    type="checkbox"
                    :checked="form.noteIds.includes(note.id)"
                    @change="toggleNote(note.id)"
                  />
                  <label :for="`note-${note.id}`">{{ note.title || '未命名笔记' }}</label>
                </div>
                <p v-if="allNotes.length === 0" class="note-empty">暂无笔记，先去创建笔记吧</p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" type="button" @click="closeModal">取消</button>
            <button class="btn-primary" type="button" @click="saveGoal">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { getDB, generateId, now } from '~/services/db'
import { useConfirm } from '~/composables/useConfirm'
import { useZIndexOnOpen } from '~/composables/useZIndex'

interface Goal {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  type: 'short_term' | 'long_term' | 'habit' | 'project'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  plannedStartAt: string
  plannedEndAt: string
  noteIds: string[]
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

interface NoteItem {
  id: string
  title: string
}

const goals = ref<Goal[]>([])
const allNotes = ref<NoteItem[]>([])
const expandedId = ref<string | null>(null)
const modalVisible = ref(false)
const editingId = ref<string | null>(null)
const overlayZIndex = useZIndexOnOpen(() => modalVisible.value)
const filterStatus = ref<string>('all')
const filterPriority = ref<string>('all')

const form = reactive({
  title: '',
  description: '',
  status: 'pending' as Goal['status'],
  type: 'short_term' as Goal['type'],
  priority: 'medium' as Goal['priority'],
  plannedStartAt: '',
  plannedEndAt: '',
  noteIds: [] as string[]
})

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' }
]

const priorityFilters = [
  { value: 'all', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
]

const statusOptions = [
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const typeOptions = [
  { value: 'short_term', label: '短期' },
  { value: 'long_term', label: '长期' },
  { value: 'habit', label: '习惯' },
  { value: 'project', label: '项目' }
]

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

onMounted(async () => {
  await loadGoals()
  await loadNotes()
})

const loadGoals = async () => {
  const db = await getDB()
  const result = await db.goals.find({
    sort: [{ createdAt: 'desc' }]
  }).exec()
  goals.value = result.map((doc: any) => doc.toJSON())
}

const loadNotes = async () => {
  const db = await getDB()
  const result = await db.notes.find().exec()
  allNotes.value = result.map((doc: any) => ({ id: doc.id, title: doc.title }))
}

const filteredGoals = computed(() => {
  return goals.value.filter(g => {
    if (filterStatus.value !== 'all' && g.status !== filterStatus.value) return false
    if (filterPriority.value !== 'all' && g.priority !== filterPriority.value) return false
    return true
  })
})

const linkedNotes = (goal: Goal): NoteItem[] => {
  return goal.noteIds
    .map(id => allNotes.value.find(n => n.id === id))
    .filter(Boolean) as NoteItem[]
}

const statusIcon = (status: string) => {
  const map: Record<string, string> = {
    pending: 'solar:round-linear',
    in_progress: 'solar:clock-circle-linear',
    completed: 'solar:check-circle-linear',
    cancelled: 'solar:close-circle-linear'
  }
  return map[status] || 'solar:round-linear'
}

const priorityLabel = (p: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
  return map[p] || p
}

const typeLabel = (t: string) => {
  const map: Record<string, string> = { short_term: '短期', long_term: '长期', habit: '习惯', project: '项目' }
  return map[t] || t
}

const formatDateRange = (start?: string, end?: string) => {
  const s = start ? new Date(start).toLocaleDateString('zh-CN') : ''
  const e = end ? new Date(end).toLocaleDateString('zh-CN') : ''
  if (s && e) return `${s} ~ ${e}`
  if (s) return `始于 ${s}`
  if (e) return `截止 ${e}`
  return ''
}

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const cycleStatus = async (goal: Goal) => {
  const cycle = ['pending', 'in_progress', 'completed', 'cancelled'] as const
  const idx = cycle.indexOf(goal.status)
  const next = cycle[(idx + 1) % cycle.length]
  await updateGoalField(goal.id, { status: next })
}

const updateGoalField = async (id: string, patch: Partial<Goal>) => {
  const db = await getDB()
  const doc = await db.goals.findOne(id).exec()
  if (!doc) return
  await doc.patch({ ...patch, updatedAt: now() })
  await loadGoals()
}

const resetForm = () => {
  form.title = ''
  form.description = ''
  form.status = 'pending'
  form.type = 'short_term'
  form.priority = 'medium'
  form.plannedStartAt = ''
  form.plannedEndAt = ''
  form.noteIds = []
}

const openCreate = () => {
  editingId.value = null
  resetForm()
  modalVisible.value = true
}

const openEdit = (goal: Goal) => {
  editingId.value = goal.id
  form.title = goal.title
  form.description = goal.description
  form.status = goal.status
  form.type = goal.type
  form.priority = goal.priority
  form.plannedStartAt = goal.plannedStartAt ? new Date(goal.plannedStartAt).toISOString().slice(0, 16) : ''
  form.plannedEndAt = goal.plannedEndAt ? new Date(goal.plannedEndAt).toISOString().slice(0, 16) : ''
  form.noteIds = [...(goal.noteIds || [])]
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  editingId.value = null
}

const toggleNote = (noteId: string) => {
  const idx = form.noteIds.indexOf(noteId)
  if (idx > -1) {
    form.noteIds.splice(idx, 1)
  } else {
    form.noteIds.push(noteId)
  }
}

const saveGoal = async () => {
  const db = await getDB()
  const payload: Partial<Goal> = {
    title: form.title.trim(),
    description: form.description.trim(),
    status: form.status,
    type: form.type,
    priority: form.priority,
    plannedStartAt: form.plannedStartAt ? new Date(form.plannedStartAt).toISOString() : '',
    plannedEndAt: form.plannedEndAt ? new Date(form.plannedEndAt).toISOString() : '',
    noteIds: [...form.noteIds],
    updatedAt: now()
  }

  if (editingId.value) {
    const doc = await db.goals.findOne(editingId.value).exec()
    if (doc) await doc.patch(payload)
  } else {
    const newGoal: Goal = {
      id: generateId(),
      title: payload.title || '',
      description: payload.description || '',
      status: payload.status || 'pending',
      type: payload.type || 'short_term',
      priority: payload.priority || 'medium',
      plannedStartAt: payload.plannedStartAt || '',
      plannedEndAt: payload.plannedEndAt || '',
      noteIds: payload.noteIds || [],
      createdAt: now(),
      updatedAt: now(),
      isSynced: false
    }
    await db.goals.insert(newGoal)
  }

  await loadGoals()
  closeModal()
}

const { confirm } = useConfirm()

const deleteGoal = async (id: string) => {
  const db = await getDB()
  if (!await confirm('确定要删除这个目标吗？')) return
  const doc = await db.goals.findOne(id).exec()
  if (doc) await doc.remove()
  await loadGoals()
}
</script>

<style scoped>
.goal-page {
  position: relative;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255, 175, 207, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 80% 70% at 100% 0%, rgba(180, 205, 255, 0.55) 0%, transparent 60%),
    radial-gradient(ellipse 100% 80% at 50% 100%, rgba(196, 181, 253, 0.45) 0%, transparent 60%),
    linear-gradient(135deg, #fef8f3 0%, #f3f0fe 50%, #f0f7ff 100%);
}

.goal-bg {
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

.bg-grain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(0, 0, 0, 0.025) 1px, transparent 1px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
  opacity: 0.6;
}

.goal-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 24px;
  gap: 16px;
}

.goal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.goal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.goal-count {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.55);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.add-btn:hover {
  background: rgb(0, 110, 250);
}

.add-btn:active {
  transform: scale(0.96);
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  gap: 6px;
}

.filter-chip {
  padding: 5px 12px;
  border-radius: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  background: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.65);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.8);
}

.filter-chip.active {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.filter-chip.priority.active.urgent {
  background: rgba(255, 59, 48, 0.12);
  border-color: rgba(255, 59, 48, 0.3);
  color: rgb(255, 59, 48);
}

.filter-chip.priority.active.high {
  background: rgba(255, 149, 0, 0.12);
  border-color: rgba(255, 149, 0, 0.3);
  color: rgb(255, 149, 0);
}

.filter-chip.priority.active.medium {
  background: rgba(0, 122, 255, 0.12);
  border-color: rgba(0, 122, 255, 0.3);
  color: rgb(0, 122, 255);
}

.filter-chip.priority.active.low {
  background: rgba(142, 142, 147, 0.15);
  border-color: rgba(142, 142, 147, 0.3);
  color: rgb(120, 120, 130);
}

.goal-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goal-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  overflow: hidden;
}

.goal-card:hover {
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.goal-card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  gap: 12px;
}

.goal-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
  color: rgba(60, 60, 67, 0.5);
  transition: all 0.15s ease;
}

.status-badge:hover {
  background: rgba(0, 122, 255, 0.08);
  color: rgb(0, 122, 255);
}

.status-badge.completed {
  color: rgb(52, 199, 89);
}

.status-badge.in_progress {
  color: rgb(0, 122, 255);
}

.status-badge.cancelled {
  color: rgb(255, 59, 48);
}

.goal-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.goal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.goal-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priority-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.priority-tag.urgent {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.priority-tag.high {
  background: rgba(255, 149, 0, 0.1);
  color: rgb(255, 149, 0);
}

.priority-tag.medium {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.priority-tag.low {
  background: rgba(142, 142, 147, 0.12);
  color: rgb(120, 120, 130);
}

.goal-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.type-tag {
  font-size: 11px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.55);
  padding: 1px 6px;
  background: rgba(60, 60, 67, 0.06);
  border-radius: 4px;
}

.time-range,
.note-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(60, 60, 67, 0.5);
}

.goal-card-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.icon-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.expand-icon {
  color: rgba(60, 60, 67, 0.35);
  transition: transform 0.2s ease;
  margin-left: 4px;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.goal-card-detail {
  padding: 0 16px 14px 58px;
  border-top: 0.5px solid rgba(60, 60, 67, 0.06);
  margin-top: -2px;
}

.goal-description {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(60, 60, 67, 0.7);
}

.linked-notes {
  margin-top: 10px;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}

.note-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.note-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 122, 255, 0.08);
  border: 0.5px solid rgba(0, 122, 255, 0.15);
  border-radius: 7px;
  font-size: 12px;
  color: rgb(0, 102, 230);
  text-decoration: none;
  transition: all 0.15s ease;
}

.note-link:hover {
  background: rgba(0, 122, 255, 0.14);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: rgba(60, 60, 67, 0.5);
  gap: 14px;
}

.empty-state p {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.empty-add-btn {
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

.empty-add-btn:hover {
  background: rgb(0, 110, 250);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
  padding: 20px;
}

.modal-panel {
  width: 520px;
  max-width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 24px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.92);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(60, 60, 67, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(60, 60, 67, 0.85);
}

.modal-body {
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row.inline {
  flex-direction: row;
  gap: 12px;
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(60, 60, 67, 0.65);
}

.form-row input,
.form-row select,
.form-row textarea {
  padding: 9px 12px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus {
  border-color: rgba(0, 122, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.form-row textarea {
  resize: vertical;
  min-height: 60px;
}

.note-selector {
  max-height: 160px;
  overflow-y: auto;
  padding: 8px;
  border: 0.5px solid rgba(60, 60, 67, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.1s ease;
}

.note-option:hover {
  background: rgba(0, 0, 0, 0.03);
}

.note-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: rgb(0, 122, 255);
  cursor: pointer;
}

.note-option label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.78);
  cursor: pointer;
  flex: 1;
}

.note-empty {
  font-size: 13px;
  color: rgba(60, 60, 67, 0.45);
  margin: 4px 0;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  flex-shrink: 0;
}

.btn-secondary {
  padding: 9px 18px;
  border-radius: 10px;
  border: 0.5px solid rgba(60, 60, 67, 0.15);
  background: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 500;
  color: rgba(60, 60, 67, 0.78);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.9);
}

.btn-primary {
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  background: rgb(0, 122, 255);
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: rgb(0, 110, 250);
}
</style>
