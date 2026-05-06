import { ref, readonly } from 'vue'
import { defineStore } from 'pinia'
import { useWorkspaceStore } from '~/stores/workspace'
import { stopSync } from '~/services/sync'
import { closeWorkspaceDB } from '~/services/db'
import { clearActiveId } from '~/services/workspaces'

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

      return response
    } catch (error: any) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    const workspaceStore = useWorkspaceStore()
    const currentId = workspaceStore.currentId

    if (currentId) {
      await stopSync(currentId)
      await closeWorkspaceDB(currentId)
    }

    user.value = null
    token.value = null
    localStorage.removeItem('token')
    clearActiveId()
    workspaceStore.currentId = ''
    workspaceStore.list = []
  }

  async function initialize() {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      token.value = storedToken
      await fetchUser()
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
