import type { Account, BillType, DebtSubtype } from '~/types/bill'

/**
 * 标准化用于匹配的字符串:trim + lowercase。
 */
function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * 从 Account 中提取所有候选别名(name + aliases),已 trim/lower。
 */
function aliasPool(account: Account): string[] {
  const all: string[] = []
  if (account.name) all.push(norm(account.name))
  if (Array.isArray(account.aliases)) {
    for (const a of account.aliases) {
      if (typeof a === 'string' && a.trim()) all.push(norm(a))
    }
  }
  return all
}

/**
 * 按交易对方匹配账户。
 * 优先级:精确(name/alias 完整相等) > 双向包含(对方含 alias / alias 含对方)。
 * 同一优先级内,按账户类型 personal > contact > merchant > other 排序,贴近用户期望。
 */
export function matchAccountByCounterparty(
  counterparty: string,
  accounts: Account[]
): Account | null {
  if (!counterparty || !counterparty.trim()) return null
  const target = norm(counterparty)

  const ranked = [...accounts].sort((a, b) => typeRank(a.type) - typeRank(b.type))

  for (const acc of ranked) {
    if (aliasPool(acc).some(p => p === target)) return acc
  }

  for (const acc of ranked) {
    if (aliasPool(acc).some(p => p.length >= 2 && target.includes(p))) return acc
  }

  for (const acc of ranked) {
    if (aliasPool(acc).some(p => target.length >= 2 && p.includes(target))) return acc
  }

  return null
}

function typeRank(t: Account['type']): number {
  switch (t) {
    case 'personal': return 0
    case 'contact': return 1
    case 'merchant': return 2
    default: return 3
  }
}

/**
 * 根据规则显式类型 / 命中账户类型 / 方向推断 BillType。
 * 优先级:ruleType > 账户类型映射 > 方向兜底。
 */
export function inferBillType(
  account: Account | null,
  direction: 'in' | 'out',
  ruleType?: BillType
): BillType {
  if (ruleType) return ruleType
  if (account) {
    if (account.type === 'personal') return 'transfer'
    if (account.type === 'contact') return 'debt'
    if (account.type === 'merchant') return 'expense'
  }
  return direction === 'in' ? 'income' : 'expense'
}

/**
 * out → lend(我借出,等对方还);in → borrow(我借入,欠对方)。
 */
export function inferDebtSubtype(direction: 'in' | 'out'): DebtSubtype {
  return direction === 'out' ? 'lend' : 'borrow'
}

/**
 * 根据匹配账户与方向,推算预览行的 from/to 默认值。
 * 仅在用户尚未填写时使用;返回的字段未必两端都填(transfer/debt 时另一端留空)。
 */
export function suggestAccountIds(
  account: Account | null,
  direction: 'in' | 'out',
  type: BillType
): { fromAccountId: string; toAccountId: string } {
  if (!account) {
    return { fromAccountId: '', toAccountId: '' }
  }
  if (type === 'transfer') {
    return direction === 'in'
      ? { fromAccountId: account.id, toAccountId: '' }
      : { fromAccountId: '', toAccountId: account.id }
  }
  if (type === 'debt') {
    return direction === 'out'
      ? { fromAccountId: '', toAccountId: account.id }
      : { fromAccountId: account.id, toAccountId: '' }
  }
  return direction === 'in'
    ? { fromAccountId: account.id, toAccountId: '' }
    : { fromAccountId: '', toAccountId: account.id }
}
