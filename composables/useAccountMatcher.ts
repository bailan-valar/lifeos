import type { Account, BillType, DebtSubtype, CsvParsedRow } from '~/types/bill'

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
 * 按收/付款方式匹配我的账户。
 * 逻辑与 matchAccountByCounterparty 相同,但优先匹配 type === 'personal' 的账户。
 */
export function matchAccountByPaymentMethod(
  paymentMethod: string,
  accounts: Account[]
): Account | null {
  if (!paymentMethod || !paymentMethod.trim()) return null
  const target = norm(paymentMethod)

  const personalAccounts = accounts.filter(a => a.type === 'personal')
  const otherAccounts = accounts.filter(a => a.type !== 'personal')
  const ranked = [...personalAccounts, ...otherAccounts]

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

/**
 * 根据账户类型推断 BillType(通用)。
 */
function inferByAccountType(account: Account | null): BillType {
  if (!account) return 'expense'
  if (account.type === 'personal') return 'transfer'
  if (account.type === 'contact') return 'debt'
  return 'expense'
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
 * 支付宝专用类型推断。
 * 综合"收/支"与"交易状态"判断类型与方向。
 * ruleType 优先级仍最高(调用方在返回后覆盖)。
 */
export function inferAlipayBillType(
  parsed: CsvParsedRow,
  counterpartyAccount: Account | null
): {
  type: BillType
  direction: 'in' | 'out'
  skipped: boolean
  skipReason?: string
} {
  const rawDir = parsed.rawPaymentDirection || ''
  const txStatus = parsed.transactionStatus || ''

  if (rawDir === '支出') {
    return {
      type: inferByAccountType(counterpartyAccount),
      direction: 'out',
      skipped: false
    }
  }

  if (rawDir === '不计收支') {
    if (txStatus === '退款成功') {
      return { type: 'income', direction: 'in', skipped: false }
    }
    if (txStatus === '交易关闭') {
      return { type: 'expense', direction: 'out', skipped: true, skipReason: '取消订单' }
    }
    if (txStatus === '还款成功') {
      return { type: 'transfer', direction: 'out', skipped: false }
    }
    return {
      type: inferByAccountType(counterpartyAccount),
      direction: 'out',
      skipped: false
    }
  }

  if (rawDir === '收入') {
    return {
      type: inferByAccountType(counterpartyAccount),
      direction: 'in',
      skipped: false
    }
  }

  return {
    type: inferBillType(counterpartyAccount, parsed.direction),
    direction: parsed.direction,
    skipped: false
  }
}

/**
 * out → lend(我借出,等对方还);in → borrow(我借入,欠对方)。
 */
export function inferDebtSubtype(direction: 'in' | 'out'): DebtSubtype {
  return direction === 'out' ? 'lend' : 'borrow'
}

/**
 * 根据匹配账户与方向,推算预览行的 from/to 默认值。
 * 同时接收对方账户与我的账户,按账单类型和方向正确设置 from/to。
 */
export function suggestAccountIds(
  counterpartyAccount: Account | null,
  myAccount: Account | null,
  direction: 'in' | 'out',
  type: BillType
): { fromAccountId: string; toAccountId: string } {
  const cpId = counterpartyAccount?.id || ''
  const myId = myAccount?.id || ''

  if (type === 'expense') {
    return { fromAccountId: myId, toAccountId: cpId }
  }
  if (type === 'income') {
    return { fromAccountId: cpId, toAccountId: myId }
  }
  if (type === 'transfer') {
    return direction === 'out'
      ? { fromAccountId: myId, toAccountId: cpId }
      : { fromAccountId: cpId, toAccountId: myId }
  }
  if (type === 'debt') {
    return direction === 'out'
      ? { fromAccountId: myId, toAccountId: cpId }
      : { fromAccountId: cpId, toAccountId: myId }
  }
  return { fromAccountId: '', toAccountId: '' }
}
