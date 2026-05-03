import type { ModuleConfig } from '~/types/module'
import { getModuleRegistry } from '~/services/ModuleRegistry'

const todoModuleConfig: ModuleConfig = {
  id: 'todo',
  name: '目标',
  icon: 'solar:check-read-linear',
  description: '管理笔记中的待办事项',
  version: '1.0.0',
  component: 'app-modules/todo/TodoView.vue',
  defaultEnabled: false,
  hooks: {
    async onLoad(noteId) {
      console.log(`Todo module loaded for note ${noteId}`)
    },
    async onUnload(noteId) {
      console.log(`Todo module unloaded for note ${noteId}`)
    },
    async onActivate(noteId) {
      console.log(`Todo module activated for note ${noteId}`)
    },
    async onDeactivate(noteId) {
      console.log(`Todo module deactivated for note ${noteId}`)
    },
    async onDataChange(noteId, data) {
      console.log(`Todo module data changed for note ${noteId}:`, data)
    }
  }
}

export function registerTodoModule() {
  const registry = getModuleRegistry()
  registry.register(todoModuleConfig)
}

export { todoModuleConfig }
