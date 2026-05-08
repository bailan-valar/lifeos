import type { Module, ModuleConfig, ModuleRegistry } from '~/types/module'
import { getDB, generateId, now } from './db'

class ModuleRegistryImpl implements ModuleRegistry {
  private modules: Map<string, Module> = new Map()
  private enabledCache: Map<string, Set<string>> = new Map()

  register(moduleConfig: ModuleConfig): void {
    if (this.modules.has(moduleConfig.id)) {
      console.warn(`Module ${moduleConfig.id} is already registered`)
      return
    }

    const module: Module = {
      id: moduleConfig.id,
      name: moduleConfig.name,
      icon: moduleConfig.icon,
      description: moduleConfig.description,
      version: moduleConfig.version,
      status: 'disabled',
      component: moduleConfig.component,
      composable: moduleConfig.composable,
      schema: moduleConfig.schema,
      migrations: moduleConfig.migrations,
      hooks: moduleConfig.hooks,
      dependencies: moduleConfig.dependencies,
      defaultEnabled: moduleConfig.defaultEnabled,
      permissions: moduleConfig.permissions,
      loaded: false,
      error: undefined
    }

    this.modules.set(moduleConfig.id, module)
    console.log(`Module ${moduleConfig.id} registered successfully`)
  }

  unregister(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      console.warn(`Module ${moduleId} is not registered`)
      return
    }

    const module = this.modules.get(moduleId)
    if (module?.loaded) {
      console.warn(`Module ${moduleId} is still loaded, unload it first`)
      return
    }

    this.modules.delete(moduleId)
    this.enabledCache.forEach((enabled, noteId) => {
      enabled.delete(moduleId)
      if (enabled.size === 0) {
        this.enabledCache.delete(noteId)
      }
    })
    console.log(`Module ${moduleId} unregistered successfully`)
  }

  get(moduleId: string): Module | undefined {
    return this.modules.get(moduleId)
  }

  getAll(): Module[] {
    return Array.from(this.modules.values())
  }

  async getEnabled(noteId: string): Promise<Module[]> {
    const db = await getDB()

    if (!this.enabledCache.has(noteId)) {
      await this.loadEnabledModules(noteId, db)
    }

    const enabledIds = this.enabledCache.get(noteId) || new Set()
    return Array.from(enabledIds)
      .map((id) => this.modules.get(id))
      .filter((m): m is Module => m !== undefined)
  }

  async isEnabled(moduleId: string, noteId: string): Promise<boolean> {
    const db = await getDB()

    if (!this.enabledCache.has(noteId)) {
      await this.loadEnabledModules(noteId, db)
    }

    return this.enabledCache.get(noteId)?.has(moduleId) || false
  }

  async enable(moduleId: string, noteId: string): Promise<void> {
    const module = this.modules.get(moduleId)
    if (!module) {
      throw new Error(`Module ${moduleId} not found`)
    }

    const db = await getDB()

    const configDoc = await db.module_config.findOne({
      selector: {
        noteId,
        moduleId
      }
    }).exec()

    if (configDoc) {
      await configDoc.patch({
        enabled: true,
        updatedAt: now()
      })
    } else {
      await db.module_config.insert({
        id: generateId(),
        noteId,
        moduleId,
        enabled: true,
        createdAt: now(),
        updatedAt: now(),
      })
    }

    if (!this.enabledCache.has(noteId)) {
      this.enabledCache.set(noteId, new Set())
    }
    this.enabledCache.get(noteId)!.add(moduleId)

    await module.hooks?.onActivate?.(noteId)

    console.log(`Module ${moduleId} enabled for note ${noteId}`)
  }

  async disable(moduleId: string, noteId: string): Promise<void> {
    const module = this.modules.get(moduleId)
    if (!module) {
      throw new Error(`Module ${moduleId} not found`)
    }

    const db = await getDB()

    const configDoc = await db.module_config.findOne({
      selector: {
        noteId,
        moduleId
      }
    }).exec()

    if (configDoc) {
      await configDoc.patch({
        enabled: false,
        updatedAt: now()
      })
    }

    this.enabledCache.get(noteId)?.delete(moduleId)
    if (this.enabledCache.get(noteId)?.size === 0) {
      this.enabledCache.delete(noteId)
    }

    await module.hooks?.onDeactivate?.(noteId)

    console.log(`Module ${moduleId} disabled for note ${noteId}`)
  }

  async getModuleData(moduleId: string, noteId: string): Promise<unknown> {
    const db = await getDB()

    const dataDoc = await db.module_data.findOne({
      selector: {
        noteId,
        moduleId
      }
    }).exec()

    if (dataDoc) {
      return dataDoc.data
    }

    const module = this.modules.get(moduleId)
    return module?.defaultEnabled ? {} : null
  }

  async saveModuleData(moduleId: string, noteId: string, data: unknown): Promise<void> {
    const db = await getDB()

    const dataDoc = await db.module_data.findOne({
      selector: {
        noteId,
        moduleId
      }
    }).exec()

    const nowStr = now()

    if (dataDoc) {
      await dataDoc.patch({
        data,
        updatedAt: nowStr,
        version: dataDoc.version + 1
      })
    } else {
      await db.module_data.insert({
        id: generateId(),
        noteId,
        moduleId,
        data,
        createdAt: nowStr,
        updatedAt: nowStr,
        version: 1,
      })
    }

    const module = this.modules.get(moduleId)
    await module?.hooks?.onDataChange?.(noteId, data)

    console.log(`Module ${moduleId} data saved for note ${noteId}`)
  }

  private async loadEnabledModules(noteId: string, db: any): Promise<void> {
    const configs = await db.module_config.find({
      selector: {
        noteId,
        enabled: true
      }
    }).exec()

    const enabledIds = new Set<string>()
    for (const config of configs) {
      enabledIds.add(config.moduleId)
    }

    this.enabledCache.set(noteId, enabledIds)
  }

  clearCache(noteId?: string): void {
    if (noteId) {
      this.enabledCache.delete(noteId)
    } else {
      this.enabledCache.clear()
    }
  }
}

const moduleRegistry = new ModuleRegistryImpl()

export function getModuleRegistry(): ModuleRegistry {
  return moduleRegistry
}

export { moduleRegistry }
