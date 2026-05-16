import type { Ref } from 'vue'
import type { Bill, BillCategory, Account } from '~/types/bill'

export interface UseBillingExportsOptions {
  bills: Ref<Bill[]>
  categories: Ref<BillCategory[]>
  accounts: Ref<Account[]>
  billYearFilter: Ref<number | null>
  billMonthFilter: Ref<number | null>
  exportCategories: () => any[]
  exportRules: () => Promise<any[]>
  showSuccess: (msg: string) => void
}

export function useBillingExports(options: UseBillingExportsOptions) {
  function handleExportBills() {
    const headers = ['日期', '类型', '金额', '币种', '分类', '账户', '描述']
    const rows = options.bills.value.map(b => {
      const cat = options.categories.value.find(c => c.id === b.categoryId)
      const acc = options.accounts.value.find(a => a.id === b.fromAccountId || a.id === b.toAccountId)
      return [
        b.date,
        b.type === 'income' ? '收入' : b.type === 'expense' ? '支出' : b.type === 'transfer' ? '转账' : '债权债务',
        b.amount,
        b.currency,
        cat?.name || '',
        acc?.name || '',
        b.description
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const year = options.billYearFilter.value
    const month = options.billMonthFilter.value
    const suffix = year ? (month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`) : new Date().toISOString().slice(0, 10)
    a.download = `bills-${suffix}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    options.showSuccess('账单已导出')
  }

  function handleExportCategories() {
    const data = options.exportCategories()
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `categories-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    options.showSuccess('分类已导出')
  }

  async function handleExportRules() {
    const data = await options.exportRules()
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      rules: data,
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
    options.showSuccess('规则已导出')
  }

  return {
    handleExportBills,
    handleExportCategories,
    handleExportRules
  }
}
