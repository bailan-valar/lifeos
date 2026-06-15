<script setup lang="ts">
import type { ReimbursementGroupView } from '~/types/reimbursement'
import ReimburseGroupDialog from './ReimburseGroupDialog.vue'
import ReimburseIncomeDialog from './ReimburseIncomeDialog.vue'

const props = defineProps<{
  noteId: string
}>()

const { success: showSuccess, error: showError } = useToast()
const { confirm } = useConfirm()
const {
  groups,
  loading,
  loadGroups,
  updateGroupStatus,
  deleteGroup,
  getGroupView,
} = useReimburse()

// 对话框状态
const groupDialogVisible = ref(false)
const incomeDialogVisible = ref(false)
const incomeGroupId = ref<string | undefined>(undefined)
const incomeGroupView = ref<ReimbursementGroupView | null>(null)

// 分组
const pendingGroups = computed(() =>
  groups.value.filter(g => g.status !== 'paid' && g.status !== 'cancelled')
)
const completedGroups = computed(() =>
  groups.value.filter(g => g.status === 'paid')
)

// 统计
const totalPending = computed(() => {
  // 需要异步计算，此处用 groups 的数量近似
  return pendingGroups.value.length
})
const totalCompleted = computed(() => completedGroups.value.length)

// 加载数据
onMounted(() => {
  loadGroups(props.noteId)
})

watch(() => props.noteId, () => {
  loadGroups(props.noteId)
})

// 操作
function handleCreateGroup() {
  groupDialogVisible.value = true
}

async function handleGroupConfirm(data: { title: string; description?: string }) {
  const { createGroup } = useReimburse()
  try {
    await createGroup(props.noteId, data)
    showSuccess('报销单已创建')
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
  }
}

async function handleRecordIncome(groupId: string) {
  try {
    const view = await getGroupView(groupId)
    if (!view) return
    incomeGroupId.value = groupId
    incomeGroupView.value = view
    incomeDialogVisible.value = true
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
  }
}

async function handleIncomeConfirm(data: { amount: number; accountId: string; date: string; description?: string }) {
  if (!incomeGroupId.value) return
  const { createIncomeForGroup } = useReimburse()
  try {
    await createIncomeForGroup(incomeGroupId.value, props.noteId, data)
    showSuccess('回款已记录')
    incomeGroupId.value = undefined
    incomeGroupView.value = null
    await loadGroups(props.noteId)
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
  }
}

async function handleAdvanceStatus(groupId: string) {
  const group = groups.value.find(g => g.id === groupId)
  if (!group) return
  const statusFlow: Record<string, string> = {
    draft: 'submitted',
    submitted: 'approved',
    approved: 'paid',
  }
  const nextStatus = statusFlow[group.status]
  if (!nextStatus) return
  try {
    await updateGroupStatus(groupId, nextStatus as any)
    showSuccess('状态已更新')
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
  }
}

async function handleDeleteGroup(groupId: string) {
  const ok = await confirm({ message: '确定删除此报销单？关联的支出账单将恢复为未关联状态。', danger: true })
  if (!ok) return
  try {
    await deleteGroup(groupId)
    showSuccess('报销单已删除')
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    approved: '已批准',
    paid: '已打款',
    cancelled: '已取消',
  }
  return map[status] || status
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'status-draft',
    submitted: 'status-submitted',
    approved: 'status-approved',
    paid: 'status-paid',
    cancelled: 'status-cancelled',
  }
  return map[status] || ''
}
</script>

<template>
  <div class="reimburse-dashboard">
    <!-- 头部 -->
    <div class="dashboard-header">
      <h2 class="dashboard-title">报销管理</h2>
      <button class="liquid-glass-button liquid-glass-button-primary" @click="handleCreateGroup">
        + 新建报销单
      </button>
    </div>

    <!-- 统计 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ groups.length }}</div>
        <div class="stat-label">报销单总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalPending }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalCompleted }}</div>
        <div class="stat-label">已完成</div>
      </div>
    </div>

    <!-- 待处理 -->
    <div v-if="pendingGroups.length > 0" class="section">
      <h3 class="section-title">待处理</h3>
      <div class="group-list">
        <div
          v-for="group in pendingGroups"
          :key="group.id"
          class="group-card liquid-glass-card"
        >
          <div class="group-header">
            <span class="group-title">{{ group.title }}</span>
            <span class="status-badge" :class="statusClass(group.status)">
              {{ statusLabel(group.status) }}
            </span>
          </div>
          <div v-if="group.description" class="group-desc">{{ group.description }}</div>
          <div class="group-actions">
            <button
              v-if="group.status === 'approved'"
              class="liquid-glass-button"
              @click="handleRecordIncome(group.id)"
            >
              记录回款
            </button>
            <button
              v-if="group.status !== 'approved'"
              class="liquid-glass-button"
              @click="handleAdvanceStatus(group.id)"
            >
              {{ group.status === 'draft' ? '提交' : '批准' }}
            </button>
            <button class="liquid-glass-button danger" @click="handleDeleteGroup(group.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已完成 -->
    <div v-if="completedGroups.length > 0" class="section">
      <h3 class="section-title">已完成</h3>
      <div class="group-list">
        <div
          v-for="group in completedGroups"
          :key="group.id"
          class="group-card liquid-glass-card completed"
        >
          <div class="group-header">
            <span class="group-title">{{ group.title }}</span>
            <span class="status-badge status-paid">{{ statusLabel(group.status) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="groups.length === 0 && !loading" class="empty-state">
      <p>还没有报销单</p>
      <p class="empty-hint">从账单列表右键 → "加入报销单" 创建报销单</p>
    </div>

    <!-- 对话框 -->
    <ReimburseGroupDialog
      :visible="groupDialogVisible"
      @confirm="handleGroupConfirm"
      @update:visible="groupDialogVisible = $event"
    />
    <ReimburseIncomeDialog
      :visible="incomeDialogVisible"
      :group="incomeGroupView"
      @confirm="handleIncomeConfirm"
      @update:visible="incomeDialogVisible = $event"
    />
  </div>
</template>

<style scoped>
.reimburse-dashboard {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 20px;
  font-weight: 700;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--liquid-bg, rgba(255, 255, 255, 0.15));
  backdrop-filter: blur(var(--liquid-blur, 20px));
  border-radius: var(--liquid-radius, 20px);
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  margin-top: 4px;
}

.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  margin-bottom: 12px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-card {
  padding: 16px 20px;
  border-radius: var(--liquid-radius, 20px);
  background: var(--liquid-bg, rgba(255, 255, 255, 0.15));
  backdrop-filter: blur(var(--liquid-blur, 20px));
}

.group-card.completed {
  opacity: 0.7;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-title {
  font-size: 15px;
  font-weight: 600;
}

.group-desc {
  font-size: 13px;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
  margin-bottom: 12px;
}

.group-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status-draft {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
}

.status-submitted {
  background: rgba(96, 165, 250, 0.15);
  color: rgb(96, 165, 250);
}

.status-approved {
  background: rgba(167, 139, 250, 0.15);
  color: rgb(167, 139, 250);
}

.status-paid {
  background: rgba(52, 211, 153, 0.15);
  color: rgb(52, 211, 153);
}

.status-cancelled {
  background: rgba(248, 113, 113, 0.15);
  color: rgb(248, 113, 113);
}

.danger {
  color: rgb(248, 113, 113);
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-dim, rgba(255, 255, 255, 0.5));
}

.empty-hint {
  font-size: 13px;
  margin-top: 8px;
}
</style>
