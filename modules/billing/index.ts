import type { ModuleConfig } from '~/types/module'
import { getModuleRegistry } from '~/services/ModuleRegistry'

const billingModuleConfig: ModuleConfig = {
  id: 'billing',
  name: '账单',
  icon: 'solar:wallet-money-linear',
  description: '管理笔记中的账单记录',
  version: '1.0.0',
  component: 'modules/billing/BillingView.vue',
  defaultEnabled: false,
  hooks: {
    async onLoad(noteId) {
      console.log(`Billing module loaded for note ${noteId}`)
    },
    async onUnload(noteId) {
      console.log(`Billing module unloaded for note ${noteId}`)
    },
    async onActivate(noteId) {
      console.log(`Billing module activated for note ${noteId}`)
    },
    async onDeactivate(noteId) {
      console.log(`Billing module deactivated for note ${noteId}`)
    },
    async onDataChange(noteId, data) {
      console.log(`Billing module data changed for note ${noteId}:`, data)
    }
  }
}

export function registerBillingModule() {
  const registry = getModuleRegistry()
  registry.register(billingModuleConfig)
}

export { billingModuleConfig }
