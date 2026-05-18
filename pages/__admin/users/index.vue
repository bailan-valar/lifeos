<template>
  <AdminLayout>
    <div class="users-page">
      <div class="page-header">
        <div class="page-header-content">
          <div>
            <h1 class="page-title">用户管理</h1>
            <p class="page-subtitle">管理系统用户和权限</p>
          </div>
          <button class="create-btn" @click="showCreateDialog = true">
            <Icon name="solar:add-circle-linear" />
            创建用户
          </button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <Icon name="solar:users-group-rounded-linear" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.totalUsers }}</span>
            <span class="stat-label">总用户数</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon admin">
            <Icon name="solar:shield-user-linear" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.adminUsers }}</span>
            <span class="stat-label">管理员</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon new">
            <Icon name="solar:user-plus-linear" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.newUsersToday }}</span>
            <span class="stat-label">今日新增</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <Icon name="solar:graph-up-linear" />
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.activeUsers }}</span>
            <span class="stat-label">活跃用户</span>
          </div>
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="filters-bar">
        <div class="search-box">
          <Icon name="solar:magnifer-linear" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索用户名或邮箱..."
            class="search-input"
            @input="handleSearch"
          />
        </div>

        <select v-model="roleFilter" class="role-filter" @change="handleSearch">
          <option value="">所有角色</option>
          <option value="admin">管理员</option>
          <option value="user">普通用户</option>
        </select>

        <button v-if="selectedUsers.length > 0" class="bulk-select-btn" @click="clearSelection">
          <Icon name="solar:close-circle-linear" />
          已选 {{ selectedUsers.length }} 项
        </button>
      </div>

      <!-- 批量操作工具栏 -->
      <div v-if="selectedUsers.length > 0" class="bulk-actions-bar">
        <span class="bulk-actions-title">批量操作</span>
        <div class="bulk-actions-buttons">
          <button class="bulk-action-btn" @click="bulkUpdateRole('admin')">
            <Icon name="solar:shield-user-linear" />
            设为管理员
          </button>
          <button class="bulk-action-btn" @click="bulkUpdateRole('user')">
            <Icon name="solar:user-linear" />
            设为普通用户
          </button>
          <button class="bulk-action-btn danger" @click="bulkDelete">
            <Icon name="solar:trash-bin-trash-linear" />
            删除用户
          </button>
        </div>
      </div>

      <!-- 用户列表 -->
      <div v-if="!isLoading && users" class="users-list">
        <div class="list-header">
          <label class="select-all-checkbox">
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @change="toggleSelectAll"
            />
            <span>全选</span>
          </label>
        </div>
        <div
          v-for="user in users"
          :key="user.id"
          class="user-item"
          :class="{ 'is-admin': user.role === 'admin', 'is-selected': selectedUsers.includes(user.id) }"
        >
          <label class="user-checkbox">
            <input
              type="checkbox"
              :checked="selectedUsers.includes(user.id)"
              @change="toggleUserSelection(user.id)"
            />
          </label>
          <div class="user-info">
            <div class="user-avatar">
              {{ user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <div class="user-name">{{ user.name || '未设置名称' }}</div>
              <div class="user-email">{{ user.email }}</div>
            </div>
          </div>

          <div class="user-meta">
            <span class="user-role" :class="`role-${user.role}`">
              {{ user.role === 'admin' ? '管理员' : '用户' }}
            </span>
            <span class="user-joined">{{ formatDate(user.createdAt) }}</span>
          </div>

          <div class="user-actions">
            <button class="action-btn" @click="viewUser(user.id)">
              <Icon name="solar:eye-linear" />
            </button>
            <button class="action-btn" @click="editUser(user)">
              <Icon name="solar:pen-linear" />
            </button>
            <button class="action-btn danger" @click="resetPassword(user)">
              <Icon name="solar:lock-keyhole-linear" />
            </button>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <Icon name="solar:refresh-linear" class="loading-icon" />
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-if="!isLoading && (!users || users.length === 0)" class="empty-state">
        <Icon name="solar:users-group-rounded-linear" class="empty-icon" />
        <p>没有找到用户</p>
      </div>

      <!-- 分页 -->
      <div v-if="pagination && pagination.totalPages > 1" class="pagination">
        <button
          class="pagination-btn"
          :disabled="pagination.page === 1"
          @click="changePage(pagination.page - 1)"
        >
          上一页
        </button>
        <span class="pagination-info">
          第 {{ pagination.page }} / {{ pagination.totalPages }} 页
        </span>
        <button
          class="pagination-btn"
          :disabled="pagination.page === pagination.totalPages"
          @click="changePage(pagination.page + 1)"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 用户编辑弹窗 -->
    <UserEditDialog
      v-if="editingUser"
      :user="editingUser"
      @close="editingUser = null"
      @saved="handleUserSaved"
    />

    <!-- 用户创建弹窗 -->
    <UserCreateDialog
      v-if="showCreateDialog"
      @close="showCreateDialog = false"
      @created="handleUserCreated"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
// 页面中间件
definePageMeta({
  middleware: 'admin',
})

import AdminLayout from '~/components/admin/AdminLayout.vue'
import UserEditDialog from '~/components/admin/UserEditDialog.vue'
import UserCreateDialog from '~/components/admin/UserCreateDialog.vue'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  _count: {
    feedbacks: number
  }
}

interface Stats {
  totalUsers: number
  adminUsers: number
  newUsersToday: number
  activeUsers: number
}

const users = ref<User[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('')
const editingUser = ref<User | null>(null)
const showCreateDialog = ref(false)
const stats = ref<Stats | null>(null)

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
})

const selectedUsers = ref<string[]>([])

let searchTimeout: NodeJS.Timeout | null = null

// 全选状态
const isAllSelected = computed(() => {
  return users.value.length > 0 && selectedUsers.value.length === users.value.length
})

const isSomeSelected = computed(() => {
  return selectedUsers.value.length > 0 && selectedUsers.value.length < users.value.length
})

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = users.value.map(u => u.id)
  }
}

// 切换单个用户选择
const toggleUserSelection = (userId: string) => {
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(userId)
  }
}

// 清除选择
const clearSelection = () => {
  selectedUsers.value = []
}

// 批量修改角色
const bulkUpdateRole = async (role: string) => {
  if (selectedUsers.value.length === 0) return

  const roleText = role === 'admin' ? '管理员' : '普通用户'
  if (!confirm(`确定要将选中的 ${selectedUsers.value.length} 个用户设为${roleText}吗？`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch('/api/__admin/users/bulk', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        userIds: selectedUsers.value,
        action: 'updateRole',
        role,
      },
    })

    alert((response as any).message)
    clearSelection()
    fetchUsers()
    fetchStats()
  } catch (error: any) {
    alert(`操作失败: ${error.data?.message || error.message}`)
  }
}

// 批量删除
const bulkDelete = async () => {
  if (selectedUsers.value.length === 0) return

  if (!confirm(`确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch('/api/__admin/users/bulk', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        userIds: selectedUsers.value,
        action: 'delete',
      },
    })

    alert((response as any).message)
    clearSelection()
    fetchUsers()
    fetchStats()
  } catch (error: any) {
    alert(`操作失败: ${error.data?.message || error.message}`)
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch('/api/__admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    stats.value = (response as any).data
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    isLoading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const params = new URLSearchParams({
      page: String(pagination.value.page),
      limit: String(pagination.value.limit),
    })

    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }

    if (roleFilter.value) {
      params.append('role', roleFilter.value)
    }

    const response = await $fetch(`/api/__admin/users?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = (response as any).data
    users.value = data.users
    pagination.value = data.pagination
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchUsers()
  }, 300)
}

// 更改页面
const changePage = (page: number) => {
  pagination.value.page = page
  fetchUsers()
}

// 查看用户详情
const viewUser = (userId: string) => {
  navigateTo(`/__admin/users/${userId}`)
}

// 编辑用户
const editUser = (user: User) => {
  editingUser.value = user
}

// 重置密码
const resetPassword = async (user: User) => {
  if (!confirm(`确定要重置用户 ${user.email} 的密码吗？`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('未登录')
    }

    const response = await $fetch(`/api/__admin/users/${user.id}/password-reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    alert(`密码已重置：${(response as any).data.newPassword}`)
  } catch (error: any) {
    alert(`重置密码失败: ${error.message}`)
  }
}

// 用户保存后刷新列表
const handleUserSaved = () => {
  editingUser.value = null
  fetchUsers()
  fetchStats()
}

// 用户创建后刷新列表
const handleUserCreated = () => {
  showCreateDialog.value = false
  fetchUsers()
  fetchStats()
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(() => {
  fetchStats()
  fetchUsers()
})
</script>

<style scoped>
.users-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  letter-spacing: -0.02em;
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.page-header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgb(0, 122, 255);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.create-btn:hover {
  background: rgb(0, 110, 230);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03);
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 14px;
  flex-shrink: 0;
}

.stat-icon.total {
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.stat-icon.admin {
  background: linear-gradient(135deg, rgb(255, 149, 0), rgb(255, 159, 10));
  color: white;
  box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
}

.stat-icon.new {
  background: linear-gradient(135deg, rgb(48, 209, 88), rgb(50, 173, 86));
  color: white;
  box-shadow: 0 4px 12px rgba(48, 209, 88, 0.3);
}

.stat-icon.active {
  background: linear-gradient(135deg, rgb(175, 82, 222), rgb(191, 90, 242));
  color: white;
  box-shadow: 0 4px 12px rgba(175, 82, 222, 0.3);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 18px;
  color: rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 14px 12px 44px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04),
              0 0 0 3px rgba(0, 122, 255, 0.1);
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.role-filter {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.role-filter:hover {
  background: rgba(255, 255, 255, 0.75);
}

.role-filter:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04),
              0 0 0 3px rgba(0, 122, 255, 0.1);
}

.bulk-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.bulk-select-btn:hover {
  background: rgba(0, 122, 255, 0.15);
}

.bulk-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(0, 122, 255, 0.05);
  border: 0.5px solid rgba(0, 122, 255, 0.2);
  border-radius: 16px;
  margin-bottom: 16px;
}

.bulk-actions-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.bulk-actions-buttons {
  display: flex;
  gap: 12px;
}

.bulk-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.bulk-action-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
}

.bulk-action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: rgb(255, 59, 48);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  margin-bottom: 4px;
}

.select-all-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  user-select: none;
}

.select-all-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.03),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.user-item.is-admin {
  border-color: rgba(0, 122, 255, 0.2);
  background: rgba(0, 122, 255, 0.03);
}

.user-item.is-selected {
  border-color: rgba(0, 122, 255, 0.4);
  background: rgba(0, 122, 255, 0.05);
}

.user-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(0, 122, 255), rgb(88, 86, 214));
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.user-details {
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.user-role {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.role-admin {
  background: rgba(0, 122, 255, 0.1);
  color: rgb(0, 122, 255);
}

.role-user {
  background: rgba(60, 60, 67, 0.1);
  color: rgba(60, 60, 67, 0.7);
}

.user-joined {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
}

.user-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.action-btn.danger:hover {
  background: rgba(255, 59, 48, 0.15);
  color: rgb(255, 59, 48);
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.2);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-icon {
  font-size: 48px;
  color: rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
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

.empty-icon {
  font-size: 64px;
  color: rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
}

.loading-state p,
.empty-state p {
  margin: 0;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.5);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination-btn {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.7);
  color: rgba(0, 0, 0, 0.85);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}

@media (max-width: 768px) {
  .page-header-content {
    flex-direction: column;
  }

  .create-btn {
    width: 100%;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar {
    flex-direction: column;
  }

  .user-item {
    flex-wrap: wrap;
  }

  .user-meta {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    order: 3;
  }

  .user-actions {
    order: 2;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .bulk-actions-bar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .bulk-actions-buttons {
    width: 100%;
    flex-wrap: wrap;
  }

  .bulk-action-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }
}
</style>
