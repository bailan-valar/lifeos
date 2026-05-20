<template>
  <AdminLayout>
    <div class="changelog-admin-page">
      <div class="page-header">
        <h1 class="page-title">更新日志管理</h1>
        <button class="liquid-glass-button liquid-glass-button-primary" @click="openCreateDialog">
          <Icon name="solar:add-circle-linear" class="btn-icon" />
          添加记录
        </button>
      </div>

      <div class="changelog-table-section liquid-glass-card">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <Icon name="solar:danger-circle-linear" class="error-icon" />
          <p>{{ error }}</p>
          <button class="liquid-glass-button" @click="fetchData">重试</button>
        </div>

        <div v-else-if="changelogs.length === 0" class="empty-state">
          <Icon name="solar:document-text-linear" class="empty-icon" />
          <p>暂无更新记录</p>
          <button class="liquid-glass-button liquid-glass-button-primary" @click="openCreateDialog">
            添加第一条记录
          </button>
        </div>

        <table v-else class="changelog-table">
          <thead>
            <tr>
              <th>版本</th>
              <th>类型</th>
              <th>状态</th>
              <th>标题</th>
              <th>发布日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in changelogs" :key="item.id" class="table-row">
              <td class="version-cell">{{ item.version }}</td>
              <td class="type-cell">
                <span class="type-badge" :class="`type-${item.type}`">{{ getTypeLabel(item.type) }}</span>
              </td>
              <td class="status-cell">
                <span class="status-badge" :class="`status-${item.status}`">{{ getStatusLabel(item.status) }}</span>
              </td>
              <td class="title-cell">{{ item.title }}</td>
              <td class="date-cell">{{ item.releaseDate }}</td>
              <td class="actions-cell">
                <button class="action-btn" title="编辑" @click="openEditDialog(item)">
                  <Icon name="solar:pen-linear" />
                </button>
                <button class="action-btn action-btn-danger" title="删除" @click="confirmDelete(item)">
                  <Icon name="solar:trash-bin-trash-linear" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
          <Transition name="slide-up">
            <div v-if="showDialog" class="dialog-content liquid-glass-dialog">
              <div class="dialog-header">
                <h2 class="dialog-title">{{ editingItem ? '编辑更新记录' : '添加更新记录' }}</h2>
                <button class="close-button" @click="closeDialog">
                  <Icon name="solar:close-circle-linear" />
                </button>
              </div>

              <form class="dialog-body" @submit.prevent="handleSubmit">
                <div class="form-group">
                  <label class="form-label">版本号</label>
                  <input
                    v-model="formData.version"
                    type="text"
                    class="liquid-glass-input"
                    placeholder="如：1.0.0"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">类型</label>
                  <SelectPicker
                    v-model="formData.type"
                    :options="typeOptions"
                    placeholder="选择类型"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">状态</label>
                  <SelectPicker
                    v-model="formData.status"
                    :options="statusOptions"
                    placeholder="选择状态"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">标题</label>
                  <input
                    v-model="formData.title"
                    type="text"
                    class="liquid-glass-input"
                    placeholder="更新标题"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">描述</label>
                  <RichTextEditor
                    :key="`editor-${showDialog}-${editingItem?.id || 'create'}`"
                    v-model="formData.description"
                    placeholder="详细描述（可选）"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">发布日期</label>
                  <input
                    v-model="formData.releaseDate"
                    type="date"
                    class="liquid-glass-input"
                    required
                  />
                </div>
              </form>

              <div class="dialog-footer">
                <button type="button" class="liquid-glass-button" @click="closeDialog">取消</button>
                <button type="button" class="liquid-glass-button liquid-glass-button-primary" @click="handleSubmit">
                  {{ editingItem ? '保存' : '添加' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import type { Changelog, ChangelogCreateInput } from '~/types/changelog'
import RichTextEditor from '~/components/editor/RichTextEditor.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'admin',
})

const authStore = useAuthStore()
const { createChangelog, updateChangelog, deleteChangelog } = useAdminChangelog()

const changelogs = ref<Changelog[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const showDialog = ref(false)
const editingItem = ref<Changelog | null>(null)
const formData = ref<Omit<ChangelogCreateInput, 'releaseDate'> & { releaseDate: string }>({
  version: '',
  type: 'feature',
  status: 'published',
  title: '',
  description: '',
  releaseDate: new Date().toISOString().split('T')[0]
})

onMounted(() => {
  fetchData()
})

async function fetchData() {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ data: Changelog[] }>('/api/__admin/changelog', {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    changelogs.value = response.data || []
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '获取更新日志失败'
    error.value = message
  } finally {
    isLoading.value = false
  }
}

function openCreateDialog() {
  editingItem.value = null
  formData.value = {
    version: '',
    type: 'feature',
    status: 'published',
    title: '',
    description: '',
    releaseDate: new Date().toISOString().split('T')[0]
  }
  showDialog.value = true
}

function openEditDialog(item: Changelog) {
  editingItem.value = item
  formData.value = {
    version: item.version,
    type: item.type,
    status: item.status,
    title: item.title,
    description: item.description,
    releaseDate: item.releaseDate.split('T')[0]
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingItem.value = null
}

async function handleSubmit() {
  try {
    if (editingItem.value) {
      await updateChangelog(editingItem.value.id, formData.value)
    } else {
      await createChangelog(formData.value)
    }
    closeDialog()
    await fetchData()
  } catch (err) {
    console.error('保存失败:', err)
  }
}

async function confirmDelete(item: Changelog) {
  if (confirm(`确定要删除 "${item.title}" 吗？`)) {
    try {
      await deleteChangelog(item.id)
      await fetchData()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }
}

const typeOptions = [
  { value: 'feature', label: '新功能' },
  { value: 'fix', label: '修复' },
  { value: 'improvement', label: '改进' },
  { value: 'breaking', label: '重大变更' }
]

const statusOptions = [
  { value: 'idea', label: '想法' },
  { value: 'planned', label: '待开发' },
  { value: 'in_progress', label: '开发中' },
  { value: 'published', label: '已发布' }
]

function getTypeLabel(type: string) {
  const option = typeOptions.find(opt => opt.value === type)
  return option?.label || type
}

function getStatusLabel(status: string) {
  const option = statusOptions.find(opt => opt.value === status)
  return option?.label || status
}
</script>

<style scoped>
.changelog-admin-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--liquid-text-primary);
  letter-spacing: -0.02em;
}

.btn-icon {
  font-size: 18px;
}

.changelog-table-section {
  padding: 20px;
  min-height: 400px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgb(0, 122, 255);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  color: var(--liquid-text-tertiary);
}

.changelog-table {
  width: 100%;
  border-collapse: collapse;
}

.changelog-table thead {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.9);
}

.changelog-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--liquid-text-secondary);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.table-row {
  transition: background 0.15s ease;
}

.table-row:hover {
  background: rgba(0, 0, 0, 0.02);
}

.table-row td {
  padding: 14px 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.06);
  font-size: 14px;
}

.table-row:last-child td {
  border-bottom: none;
}

.version-cell {
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
}

.type-badge.type-feature {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.type-badge.type-fix {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.type-badge.type-improvement {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.type-badge.type-breaking {
  background: rgba(255, 59, 48, 0.12);
  color: rgb(255, 59, 48);
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
}

.status-badge.status-idea {
  background: rgba(175, 82, 222, 0.12);
  color: rgb(175, 82, 222);
}

.status-badge.status-planned {
  background: rgba(0, 122, 255, 0.12);
  color: rgb(0, 122, 255);
}

.status-badge.status-in_progress {
  background: rgba(255, 149, 0, 0.12);
  color: rgb(255, 149, 0);
}

.status-badge.status-published {
  background: rgba(52, 199, 89, 0.12);
  color: rgb(52, 199, 89);
}

.title-cell {
  color: var(--liquid-text-primary);
}

.date-cell {
  color: var(--liquid-text-secondary);
  font-size: 13px;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--liquid-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--liquid-text-primary);
}

.action-btn-danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--liquid-text-primary);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--liquid-text-secondary);
  cursor: pointer;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--liquid-text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .changelog-table {
    font-size: 12px;
  }

  .changelog-table th,
  .table-row td {
    padding: 10px 12px;
  }
}
</style>
