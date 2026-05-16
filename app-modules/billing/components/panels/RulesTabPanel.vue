<template>
  <div class="tab-panel">
    <div v-if="isMobile" class="mobile-rules-header">
      <button class="mobile-back-btn" type="button" @click="store.activeTab = 'bills'">
        <Icon name="solar:alt-arrow-left-linear" size="20" />
        <span>返回账单</span>
      </button>
    </div>

    <ImportRuleList
      :rules="importRules"
      :accounts="accounts"
      :categories="categories"
      @add="openRuleDialog"
      @edit="openRuleDialog"
      @delete="handleDeleteRule"
      @toggle="handleToggleRule"
      @export="handleExportRules"
      @import="handleImportRules"
      @batch-delete="handleBatchDeleteRules"
      @batch-enable="handleBatchEnableRules"
      @batch-disable="handleBatchDisableRules"
    />
  </div>
  <RuleDialog
    v-if="ruleDialogVisible"
    :visible="ruleDialogVisible"
    :rule="editingRule"
    :accounts="accounts"
    :categories="categories"
    @confirm="handleRuleConfirm"
    @cancel="closeRuleDialog"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBillingStore } from '~/stores/billing'
import { useAccounts } from '~/composables/useAccounts'
import { useBillCategories } from '~/composables/useBillCategories'
import { useImportRules } from '~/composables/useImportRules'
import { useConfirm } from '~/composables/useConfirm'
import { useToast } from '~/composables/useToast'
import type { ImportRuleFormData, ImportRule } from '~/types/bill'
import ImportRuleList from '../ImportRuleList.vue'
import RuleDialog from '../RuleDialog.vue'

const props = defineProps<{
  importRules: ImportRule[]
}>()

const store = useBillingStore()
const { isMobile } = useDevice()
const { confirm } = useConfirm()
const { success: showSuccess, error: showError } = useToast()

const { accounts } = useAccounts()
const { categories } = useBillCategories()
const { createImportRule, updateImportRule, deleteImportRule, deleteImportRules, updateImportRules, exportRules, importRules: importRulesBatch } = useImportRules()

// 对话框状态
const ruleDialogVisible = ref(false)
const editingRule = ref<ImportRule | undefined>(undefined)

function openRuleDialog(rule?: ImportRule) {
  editingRule.value = rule
  ruleDialogVisible.value = true
}

function closeRuleDialog() {
  ruleDialogVisible.value = false
  editingRule.value = undefined
}

// 事件处理
async function handleDeleteRule(id: string) {
  if (!await confirm('确定删除此规则？')) return
  try {
    await deleteImportRule(id)
    showSuccess('规则已删除')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleToggleRule(id: string, enabled: boolean) {
  try {
    await updateImportRule(id, { enabled })
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleExportRules() {
  try {
    const rules = await exportRules()
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      rules,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-rules-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showSuccess('规则已导出')
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleImportRules() {
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
        showError('文件格式错误：规则列表应为数组')
        return
      }
      const { created, skipped } = await importRulesBatch(items)
      showSuccess(`导入完成：新建 ${created} 条，跳过重复 ${skipped} 条`)
    } catch (e) {
      showError(e instanceof Error ? e.message : '导入失败')
    }
  }
  input.click()
}

async function handleBatchDeleteRules(ids: string[]) {
  if (ids.length === 0) return
  const ok = await confirm({ message: `确定删除选中的 ${ids.length} 条规则？`, danger: true })
  if (!ok) return
  try {
    const { deleted, failed } = await deleteImportRules(ids)
    if (failed > 0) {
      showSuccess(`已删除 ${deleted} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已删除 ${deleted} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchEnableRules(ids: string[]) {
  if (ids.length === 0) return
  try {
    const { updated, failed } = await updateImportRules(ids, { enabled: true })
    if (failed > 0) {
      showSuccess(`已启用 ${updated} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已启用 ${updated} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleBatchDisableRules(ids: string[]) {
  if (ids.length === 0) return
  try {
    const { updated, failed } = await updateImportRules(ids, { enabled: false })
    if (failed > 0) {
      showSuccess(`已禁用 ${updated} 条规则，${failed} 条失败`)
    } else {
      showSuccess(`已禁用 ${updated} 条规则`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}

async function handleRuleConfirm(data: ImportRuleFormData, isEditing: boolean, id?: string) {
  try {
    if (!data.pattern.trim()) {
      showError('请输入匹配关键字')
      return
    }
    if (isEditing && id) {
      await updateImportRule(id, data)
      showSuccess('规则已更新')
    } else {
      await createImportRule(data)
      showSuccess('规则已添加')
    }
    closeRuleDialog()
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e))
  }
}
</script>

<style scoped>
.tab-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 移动端规则页返回头部 */
.mobile-rules-header {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 4px;
}

.mobile-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 0;
  border: none;
  background: transparent;
  color: rgb(0, 122, 255);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mobile-back-btn:active {
  opacity: 0.6;
}
</style>
