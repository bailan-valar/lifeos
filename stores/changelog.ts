import { ref, readonly, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Changelog, ChangelogGroup } from '~/types/changelog'

const STORAGE_KEY = 'lifeos:lastReadVersion'

export const useChangelogStore = defineStore('changelog', () => {
  const changelogs = ref<Changelog[]>([])
  const latestVersion = ref<string>('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const lastReadVersion = ref<string>(() => {
    if (process.client) {
      return localStorage.getItem(STORAGE_KEY) || ''
    }
    return ''
  })

  const groupedChangelogs = computed<ChangelogGroup[]>(() => {
    const groups = new Map<string, Changelog[]>()

    for (const log of changelogs.value) {
      if (!groups.has(log.version)) {
        groups.set(log.version, [])
      }
      groups.get(log.version)!.push(log)
    }

    return Array.from(groups.entries())
      .map(([version, items]) => ({
        version,
        releaseDate: items[0].releaseDate,
        items: items.sort((a, b) => a.type.localeCompare(b.type))
      }))
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
  })

  const unreadCount = computed(() => {
    if (!latestVersion.value || !lastReadVersion.value) {
      return changelogs.value.length > 0 ? 1 : 0
    }
    return latestVersion.value > lastReadVersion.value ? 1 : 0
  })

  function setChangelogs(logs: Changelog[]) {
    changelogs.value = logs
    if (logs.length > 0) {
      latestVersion.value = logs.reduce((latest, log) => {
        return log.version > latest ? log.version : latest
      }, logs[0].version)
    }
  }

  function markAsRead(version: string) {
    lastReadVersion.value = version
    if (process.client) {
      localStorage.setItem(STORAGE_KEY, version)
    }
  }

  function markAllAsRead() {
    if (latestVersion.value) {
      markAsRead(latestVersion.value)
    }
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  function setError(err: string | null) {
    error.value = err
  }

  return {
    changelogs: readonly(changelogs),
    latestVersion: readonly(latestVersion),
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastReadVersion: readonly(lastReadVersion),
    groupedChangelogs,
    unreadCount,
    setChangelogs,
    markAsRead,
    markAllAsRead,
    setLoading,
    setError
  }
})
