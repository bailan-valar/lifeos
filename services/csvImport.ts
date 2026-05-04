import Papa from 'papaparse'
import type { CsvParsedRow, ImportSource } from '~/types/bill'

/**
 * 按来源解码 File 为字符串。支付宝 GBK,微信 UTF-8。
 */
export async function decodeCsvFile(file: File, source: ImportSource): Promise<string> {
  const buffer = await file.arrayBuffer()
  const encoding = source === 'alipay' ? 'gb18030' : 'utf-8'
  return new TextDecoder(encoding).decode(buffer)
}

function cleanAmount(raw: unknown): number {
  return parseFloat(String(raw ?? '0').replace(/[¥,\s]/g, '')) || 0
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
      const direction: 'in' | 'out' = r[5]?.includes('收') ? 'in' : 'out'
      return {
        rawIndex: i,
        date: r[0].trim(),
        counterparty: (r[2] || '').trim(),
        description: (r[4] || '').trim(),
        amount: cleanAmount(r[6]),
        direction,
        rawType: (r[1] || '').trim()
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
      const direction: 'in' | 'out' = r[4]?.includes('收') ? 'in' : 'out'
      return {
        rawIndex: i,
        date: r[0].trim(),
        counterparty: (r[2] || '').trim(),
        description: (r[3] || '').trim(),
        amount: cleanAmount(r[5]),
        direction,
        rawType: (r[1] || '').trim()
      }
    })
}

/**
 * 去重指纹:同一日期 + 金额 + 对方 视为重复
 */
export function dedupeKey(date: string, amount: number, counterparty: string): string {
  return `${date.slice(0, 10)}|${amount.toFixed(2)}|${counterparty.trim()}`
}
