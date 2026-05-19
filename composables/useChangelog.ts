import { storeToRefs } from 'pinia'
import { useChangelogStore } from '~/stores/changelog'
import type { Changelog, ChangelogCreateInput, ChangelogUpdateInput } from '~/types/changelog'

export function useChangelog() {
  const store = useChangelogStore()
  const {
    changelogs,
    latestVersion,
    isLoading,
    error,
    lastReadVersion,
    groupedChangelogs,
    unreadCount
  } = storeToRefs(store)

  async function fetchChangelogs() {
    store.setLoading(true)
    store.setError(null)

    try {
      const response = await $fetch<{ data: Changelog[] }>('/api/changelog')
      store.setChangelogs(response.data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '获取更新日志失败'
      store.setError(message)
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  async function fetchLatestVersion() {
    try {
      const response = await $fetch<{ version: string }>('/api/changelog/latest')
      return response.version || ''
    } catch (err) {
      return ''
    }
  }

  async function checkForUpdates() {
    const currentLatest = await fetchLatestVersion()
    if (currentLatest && currentLatest > lastReadVersion.value) {
      return currentLatest
    }
    return null
  }

  return {
    changelogs,
    latestVersion,
    isLoading,
    error,
    lastReadVersion,
    groupedChangelogs,
    unreadCount,
    fetchChangelogs,
    fetchLatestVersion,
    checkForUpdates,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead
  }
}

export function useAdminChangelog() {
  async function createChangelog(data: ChangelogCreateInput) {
    const response = await $fetch<{ data: Changelog }>('/api/__admin/changelog', {
      method: 'POST',
      body: data
    })
    return response.data
  }

  async function updateChangelog(id: string, data: ChangelogUpdateInput) {
    const response = await $fetch<{ data: Changelog }>(`/api/__admin/changelog/${id}`, {
      method: 'PATCH',
      body: data
    })
    return response.data
  }

  async function deleteChangelog(id: string) {
    await $fetch(`/api/__admin/changelog/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    createChangelog,
    updateChangelog,
    deleteChangelog
  }
}
