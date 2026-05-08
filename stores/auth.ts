import { ref, readonly } from 'vue'
import { defineStore } from 'pinia'
import { useWorkspaceStore } from '~/stores/workspace'
import { stopSync } from '~/services/sync'
import { closeWorkspaceDB, listLoadedWorkspaceIds } from '~/services/db'
import { clearActiveId, clearMetaDBCache, closeMetaDB, setCachedUserId, clearCachedUserId } from '~/services/workspaces'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; email: string; name: string | null } | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  async function fetchUser() {
    const token = localStorage.getItem('token')

    if (!token) {
      return null
    }

    try {
      const response = await $fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      user.value = response as { id: string; email: string; name: string | null }
      setCachedUserId(user.value.id)
      return response
    } catch (error) {
      logout()
      return null
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true

    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }) as { user: { id: string; email: string; name: string | null }; token: string }

      user.value = response.user
      token.value = response.token
      localStorage.setItem('token', response.token)
      setCachedUserId(response.user.id)

      return response
    } catch (error: any) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function signup(email: string, password: string, name?: string) {
    isLoading.value = true

    try {
      const response = await $fetch('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name },
      }) as { user: { id: string; email: string; name: string | null }; token: string }

      user.value = response.user
      token.value = response.token
      localStorage.setItem('token', response.token)
      setCachedUserId(response.user.id)

      return response
    } catch (error: any) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    const workspaceStore = useWorkspaceStore()

    // 关闭所有已加载工作空间的数据库与同步
    for (const wsId of listLoadedWorkspaceIds()) {
      await stopSync(wsId)
      await closeWorkspaceDB(wsId)
    }

    user.value = null
    token.value = null
    localStorage.removeItem('token')
    clearCachedUserId()
    clearActiveId()
    await closeMetaDB()
    workspaceStore.currentId = ''
    workspaceStore.list = []
  }

  async function initialize() {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      token.value = storedToken
      const userData = await fetchUser()
      if (!userData) {
        // fetchUser failed and called logout; ensure clean state
        clearCachedUserId()
      }
    }
  }

  return {
    user: readonly(user),
    token: readonly(token),
    isLoading: readonly(isLoading),
    login,
    signup,
    logout,
    initialize,
    fetchUser,
  }
})
