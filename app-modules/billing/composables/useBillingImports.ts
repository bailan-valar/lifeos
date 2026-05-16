import { ref } from 'vue'
import type { ImportRuleFormData } from '~/types/bill'

export interface UseBillingImportsOptions {
  importCategoriesBatch: (items: any[]) => Promise<{ created: number; skipped: number }>
  importRulesBatch: (items: any[]) => Promise<{ created: number; skipped: number }>
  createImportRule: (data: ImportRuleFormData) => Promise<void>
  showSuccess: (msg: string) => void
  showError: (msg: string) => void
}

export function useBillingImports(options: UseBillingImportsOptions) {
  const importRuleDialogVisible = ref(false)
  const importRuleDialogForm = ref<ImportRuleFormData>({
    source: 'all', matchField: 'account', matchMode: 'fuzzy', pattern: '', categoryId: '',
    accountId: '', priority: 100, enabled: true
  })
  const pendingRuleSavedCallback = ref<(() => void) | null>(null)

  function openImportRuleDialog(form: ImportRuleFormData, opts?: { onSaved?: () => void }) {
    importRuleDialogForm.value = { ...form }
    pendingRuleSavedCallback.value = opts?.onSaved ?? null
    importRuleDialogVisible.value = true
  }

  function handleImportCategories() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const payload = JSON.parse(text)
        const items = payload?.categories ?? payload
        if (!Array.isArray(items)) {
          options.showError('文件格式错误：分类列表应为数组')
          return
        }
        const { created, skipped } = await options.importCategoriesBatch(items)
        options.showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
      } catch (e) {
        options.showError(e instanceof Error ? e.message : '导入失败')
      }
    }
    input.click()
  }

  function handleImportRules() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const payload = JSON.parse(text)
        const items = payload?.rules ?? payload
        if (!Array.isArray(items)) {
          options.showError('文件格式错误：规则列表应为数组')
          return
        }
        const { created, skipped } = await options.importRulesBatch(items)
        options.showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
      } catch (e) {
        options.showError(e instanceof Error ? e.message : '导入失败')
      }
    }
    input.click()
  }

  async function handleSaveImportRule(form: ImportRuleFormData) {
    if (!form.pattern.trim()) {
      options.showError('请输入匹配关键字')
      return
    }
    try {
      await options.createImportRule({
        ...form,
        pattern: form.pattern.trim()
      })
      options.showSuccess('规则已保存')
      importRuleDialogVisible.value = false
      pendingRuleSavedCallback.value?.()
      pendingRuleSavedCallback.value = null
    } catch (e) {
      options.showError(e instanceof Error ? e.message : String(e))
    }
  }

  return {
    importRuleDialogVisible,
    importRuleDialogForm,
    pendingRuleSavedCallback,
    openImportRuleDialog,
    handleImportCategories,
    handleImportRules,
    handleSaveImportRule
  }
}
