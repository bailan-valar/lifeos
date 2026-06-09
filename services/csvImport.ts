import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Decimal from 'decimal.js'
import type { CsvParsedRow, ImportSource } from '~/types/bill'

let pdfjsWorkerSet = false

/**
 * 按来源解码 File 为字符串。支付宝 GBK,微信 UTF-8。
 */
export async function decodeCsvFile(file: File, source: ImportSource): Promise<string> {
  const buffer = await file.arrayBuffer()
  const encoding = source === 'alipay' ? 'gb18030' : 'utf-8'
  return new TextDecoder(encoding).decode(buffer)
}

function cleanAmount(raw: unknown): number {
  const cleaned = String(raw ?? '0').replace(/[¥,\s]/g, '')
  try {
    return new Decimal(cleaned).toNumber()
  } catch {
    return 0
  }
}

/**
 * 支付宝 CSV: 头 24 行元数据,第 25 行表头,正文以分隔线结束。
 * 列:交易时间, 交易分类, 交易对方, 对方账号, 商品说明, 收/支, 金额, 收/付款方式, 交易状态, 交易订单号, 商家订单号, 备注
 */
export function parseAlipayCsv(text: string): CsvParsedRow[] {
  const lines = text.split(/\r?\n/)
  const headerIdx = lines.findIndex(l => l.startsWith('交易时间') || l.includes('交易号'))
  if (headerIdx < 0) throw new Error('支付宝 CSV 格式异常:未找到表头')
  const body = lines.slice(headerIdx).join('\n')
  const parsed = Papa.parse<string[]>(body, { skipEmptyLines: true })
  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.filter(e => e.type !== 'FieldMismatch')
    if (fatal.length > 0) {
      console.warn('Alipay parse warnings:', fatal)
    }
  }
  const rows = parsed.data.slice(1)
  return rows
    .filter(r => r.length >= 7 && r[0] && /\d{4}-\d{2}-\d{2}/.test(r[0]))
    .map((r, i) => {
      const rawPaymentDirection = (r[5] || '').trim()
      const direction: 'in' | 'out' = rawPaymentDirection.includes('收') ? 'in' : 'out'
      return {
        rawIndex: i,
        date: r[0].trim(),
        counterparty: (r[2] || '').trim(),
        description: (r[4] || '').trim(),
        amount: cleanAmount(r[6]),
        direction,
        rawType: (r[1] || '').trim(),
        paymentMethod: (r[7] || '').trim() || undefined,
        rawPaymentDirection: rawPaymentDirection || undefined,
        transactionStatus: (r[8] || '').trim() || undefined
      }
    })
}

/**
 * 微信 CSV: 头 16 行元数据 + 分隔行,正文为 UTF-8 with BOM。
 * 列:交易时间, 交易类型, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态, 交易单号, 商户单号, 备注
 */
export function parseWechatCsv(text: string): CsvParsedRow[] {
  const cleaned = text.replace(/^﻿/, '')
  const lines = cleaned.split(/\r?\n/)
  const headerIdx = lines.findIndex(l => l.startsWith('交易时间') && l.includes('交易类型'))
  if (headerIdx < 0) throw new Error('微信 CSV 格式异常:未找到表头')
  const body = lines.slice(headerIdx).join('\n')
  const parsed = Papa.parse<string[]>(body, { skipEmptyLines: true })
  const rows = parsed.data.slice(1)
  return rows
    .filter(r => r.length >= 6 && r[0] && /\d{4}-\d{2}-\d{2}/.test(r[0]))
    .map((r, i) => {
      const rawPaymentDirection = (r[4] || '').trim()
      const direction: 'in' | 'out' = rawPaymentDirection.includes('收') ? 'in' : 'out'
      return {
        rawIndex: i,
        date: r[0].trim(),
        counterparty: (r[2] || '').trim(),
        description: (r[3] || '').trim(),
        amount: cleanAmount(r[5]),
        direction,
        rawType: (r[1] || '').trim(),
        paymentMethod: (r[6] || '').trim() || undefined,
        rawPaymentDirection: rawPaymentDirection || undefined
      }
    })
}

function formatDateCell(v: unknown): string {
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`
  }
  return String(v ?? '').trim()
}

/**
 * 微信 xlsx: 头 17 行元数据 + 分隔行,第 18 行表头,数据行开始。
 * 列:交易时间, 交易类型, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态, 交易单号, 商户单号, 备注
 */
export function parseWechatXlsx(buffer: ArrayBuffer): CsvParsedRow[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true })

  const headerIdx = json.findIndex(row => row[0] === '交易时间' || (row[0] && String(row[0]).includes('交易时间')))
  if (headerIdx < 0) throw new Error('微信 xlsx 格式异常:未找到表头')

  const rows = json.slice(headerIdx + 1)
  return rows
    .filter(r => r.length >= 6 && r[0] && /\d{4}-\d{2}-\d{2}/.test(formatDateCell(r[0])))
    .map((r, i) => {
      const rawPaymentDirection = String(r[4] || '').trim()
      const direction: 'in' | 'out' = rawPaymentDirection.includes('收') ? 'in' : 'out'
      return {
        rawIndex: i,
        date: formatDateCell(r[0]),
        counterparty: String(r[2] || '').trim(),
        description: String(r[3] || '').trim(),
        amount: cleanAmount(r[5]),
        direction,
        rawType: String(r[1] || '').trim(),
        paymentMethod: String(r[6] || '').trim() || undefined,
        rawPaymentDirection: rawPaymentDirection || undefined
      }
    })
}

/**
 * 招商银行 PDF: 每页为文本流，每条记录占 6–7 行。
 * 字段顺序: 记账日期、货币、交易金额、联机余额、交易摘要、对手信息(1–2 行)。
 * 金额正数为收入，负数为支出。
 */
export async function parseCmbPdf(buffer: ArrayBuffer): Promise<CsvParsedRow[]> {
  const pdfjsLib = await import('pdfjs-dist')
  if (!pdfjsWorkerSet && typeof window !== 'undefined') {
    try {
      const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    } catch {
      // 无 worker 时会在主线程解析，不影响功能
    }
    pdfjsWorkerSet = true
  }

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const allLines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const items = textContent.items as Array<{ str: string }>
    const pageText = items.map(item => item.str).join('\n')
    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean)
    allLines.push(...lines)
  }

  const skipPatterns = [
    /^招商银行交易流水$/,
    /^Transaction Statement of China Merchants Bank$/,
    /^Name$/,
    /^Account No$/,
    /^Account Type$/,
    /^Sub Branch$/,
    /^Date$/,
    /^Verification Code$/,
    /^Currency$/,
    /^Transaction$/,
    /^Amount$/,
    /^Balance$/,
    /^Transaction Type$/,
    /^Counter Party$/,
    /^记账日期$/,
    /^货币$/,
    /^交易金额$/,
    /^联机余额$/,
    /^交易摘要$/,
    /^对手信息$/,
    /^户\s*名[：:]/,
    /^账号[：:]/,
    /^账户类型[：:]/,
    /^开\s*户\s*行[：:]/,
    /^申请时间[：:]/,
    /^验\s*证\s*码[：:]/,
    /^Name\s/,
    /^Account No\s/,
    /^Account Type\s/,
    /^Sub Branch\s/,
    /^Date\s/,
    /^Verification Code\s/,
    /^温馨提示/,
    /^交易流水验真/,
    /一网通/,
    /cmbchina\.com/,
    /^进入一网通/,
    /明细项/,
    /点击.*查询/,
    /系统验真/,
    /^\d+\.[^0-9]/,
    /^\d+\/\d+$/, // 页码
    /^—{3,}$/, // 分隔线
    /^\d{4}-\d{2}-\d{2}\s+--\s+\d{4}-\d{2}-\d{2}$/, // 日期范围
  ]

  const dataLines = allLines.filter(line => !skipPatterns.some(p => p.test(line)))

  // 按日期行分组
  const groups: string[][] = []
  let current: string[] = []

  for (const line of dataLines) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
      if (current.length > 0) groups.push(current)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) groups.push(current)

  return groups
    .filter(g => g.length >= 5)
    .map((g, i) => {
      const date = g[0]
      const amountRaw = g[2] || '0'
      const rawType = g[4] || ''

      const counterpartyLines = g.slice(5)
      const meaningful = counterpartyLines.filter(l => {
        const t = l.trim()
        if (!t) return false
        if (/^\d+$/.test(t.replace(/\s/g, ''))) return false
        return true
      })
      let counterparty = meaningful.join(' ').trim()
      // 去掉末尾的银行账号（如 "王晨佳 4392260799762255" → "王晨佳"）
      const cpParts = counterparty.split(/\s+/)
      if (cpParts.length >= 2 && /^\d{10,}$/.test(cpParts[cpParts.length - 1])) {
        counterparty = cpParts.slice(0, -1).join(' ')
      }

      const signedAmount = cleanAmount(amountRaw)
      const direction: 'in' | 'out' = signedAmount >= 0 ? 'in' : 'out'

      return {
        rawIndex: i,
        date,
        counterparty,
        description: rawType,
        amount: Math.abs(signedAmount),
        direction,
        rawType,
      }
    })
}

/**
 * 招商银行信用卡 PDF 解析
 * 每页为文本流，每条记录占 5–6 行。
 * 字段顺序: 交易日、记账日(可选)、交易摘要、人民币金额、卡号末四位、交易地金额。
 * 金额正数为消费(支出)，负数为还款(收入/转入)。
 */
export async function parseCmbCreditPdf(buffer: ArrayBuffer): Promise<CsvParsedRow[]> {
  const pdfjsLib = await import('pdfjs-dist')
  if (!pdfjsWorkerSet && typeof window !== 'undefined') {
    try {
      const workerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    } catch {
      // 无 worker 时会在主线程解析，不影响功能
    }
    pdfjsWorkerSet = true
  }

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  // 从标题提取账单年月，用于推断交易日年份
  let statementYear = 0
  let statementMonth = 0

  const allLines: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const items = textContent.items as Array<{ str: string }>
    const pageText = items.map(item => item.str).join('\n')
    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean)
    allLines.push(...lines)

    // 在第一页提取账单年月
    if (pageNum === 1) {
      for (const line of lines) {
        const m = line.match(/(\d{4})年(\d{2})月/)
        if (m) {
          statementYear = parseInt(m[1], 10)
          statementMonth = parseInt(m[2], 10)
          break
        }
      }
    }
  }

  // 分类标签
  const categoryLabels = new Set(['还款', '消费', '取现', '转账', '退款', '调账'])
  // 非数据行模式
  const skipPatterns = [
    /^本期账务明细/,
    /^Transaction Details/,
    /^人民币账户/,
    /^RMB A\/C/,
    /^交易日/,
    /^记账日/,
    /^交易摘要/,
    /^人民币金额/,
    /^卡号末四位/,
    /^交易地金额/,
    /^Trans\s*Date/,
    /^Post\s*Date/,
    /^Description/,
    /^RMB Amount/,
    /^Card Number/,
    /^Original Trans/,
    /^Amount$/,
    /^本期应还金额/,
    /^New Balance/,
    /^上期账单金额/,
    /^Balance B\/F/,
    /^上期还款金额/,
    /^Payment/,
    /^本期账单金额/,
    /^New Charges/,
    /^本期调整金额/,
    /^Adjustment/,
    /^循环利息/,
    /^Interest/,
    /^=/,
    /^招商银行信用卡对账单/,
    /^CMB Credit Card Statement/,
    /^【招商银行信用卡/,
    /^\(1\)/,
    /^\(2\)/,
    /^\(3\)/,
    /^★/,
    /^\[END\]/,
  ]

  const dataLines = allLines.filter(line => {
    if (categoryLabels.has(line)) return false
    return !skipPatterns.some(p => p.test(line))
  })

  // 解析记录组
  const groups: string[][] = []
  let i = 0
  while (i < dataLines.length) {
    const line = dataLines[i]
    if (!/^\d{2}\/\d{2}$/.test(line)) {
      i++
      continue
    }

    const hasPostDate = i + 1 < dataLines.length && /^\d{2}\/\d{2}$/.test(dataLines[i + 1])

    if (hasPostDate) {
      if (i + 5 < dataLines.length) {
        groups.push(dataLines.slice(i, i + 6))
        i += 6
        continue
      }
    } else {
      if (i + 4 < dataLines.length) {
        groups.push(dataLines.slice(i, i + 5))
        i += 5
        continue
      }
    }
    i++
  }

  return groups.map((g, idx) => {
    const isSixField = g.length === 6
    const transDateStr = g[0]
    const description = isSixField ? g[2] : g[1]
    const amountRaw = isSixField ? g[3] : g[2]

    const signedAmount = cleanAmount(amountRaw)
    // 信用卡账单: 正数=消费(支出), 负数=还款(收入/转入)
    const direction: 'in' | 'out' = signedAmount >= 0 ? 'out' : 'in'

    // 推断交易日年份
    const [mm, dd] = transDateStr.split('/').map(s => parseInt(s, 10))
    const year = mm > statementMonth && statementMonth > 0 ? statementYear - 1 : statementYear
    const finalYear = year || new Date().getFullYear()
    const date = `${finalYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`

    return {
      rawIndex: idx,
      date,
      counterparty: description,
      description,
      amount: Math.abs(signedAmount),
      direction,
      rawType: description,
    }
  })
}

/**
 * 去重指纹类型
 */
type ImportSource = 'alipay' | 'wechat' | 'cmb' | 'cmb_credit'

/**
 * 是否具有精确时间（支付宝、微信有精确到秒的时间）
 */
function hasPreciseTime(source: ImportSource): boolean {
  return source === 'alipay' || source === 'wechat'
}

/**
 * 精确去重指纹：用于完全匹配，防止同一文件重复导入
 * 包含来源 + 精确时间（精确到分钟）+ 金额 + 对方
 */
export function buildExactFingerprint(
  source: ImportSource,
  date: string,
  amount: number,
  counterparty: string
): string {
  // 对于有精确时间的来源，保留到分钟；银行卡/信用卡只保留日期
  const dateKey = hasPreciseTime(source) ? date.slice(0, 16) : date.slice(0, 10)
  return `${source}|${dateKey}|${amount.toFixed(2)}|${counterparty.trim()}`
}

/**
 * 宽松去重指纹：用于跨来源疑似重复检测
 * 只包含日期 + 金额 + 对方，忽略来源和精确时间
 */
export function buildLooseFingerprint(
  date: string,
  amount: number,
  counterparty: string
): string {
  return `${date.slice(0, 10)}|${amount.toFixed(2)}|${counterparty.trim()}`
}

/**
 * @deprecated 使用 buildExactFingerprint 替代
 * 去重指纹:同一日期 + 金额 + 对方 视为重复
 */
export function dedupeKey(date: string, amount: number, counterparty: string): string {
  return buildLooseFingerprint(date, amount, counterparty)
}
