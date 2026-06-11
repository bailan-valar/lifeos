import { pinyin } from 'pinyin-pro'

/**
 * 判断字符串是否包含中文字符
 */
function hasChinese(str: string): boolean {
  return /[一-鿿]/.test(str)
}

/**
 * 判断字符串是否为纯英文字母
 */
function isPureAlpha(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str)
}

/**
 * 获取中文文本的拼音首字母（小写）
 * 例如："中国" → "zg"，"餐饮美食" → "cyms"
 */
function getPinyinInitials(text: string): string {
  if (!hasChinese(text)) return ''
  return pinyin(text, { pattern: 'first', toneType: 'none' }).replace(/\s+/g, '').toLowerCase()
}

/**
 * 获取中文文本的完整拼音（小写，无空格）
 * 例如："中国" → "zhongguo"
 */
function getPinyinFull(text: string): string {
  if (!hasChinese(text)) return ''
  return pinyin(text, { pattern: 'pinyin', toneType: 'none', separator: '' }).toLowerCase()
}

/**
 * 模糊匹配：判断搜索词是否匹配目标文本
 *
 * 支持以下匹配方式：
 * 1. 直接子串匹配（原有行为）
 * 2. 拼音首字母匹配（输入纯英文时）："zg" 匹配 "中国"
 * 3. 全拼匹配（输入纯英文时）："zhongguo" 匹配 "中国"
 */
export function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // 1. 直接子串匹配
  if (lowerText.includes(lowerQuery)) {
    return true
  }

  // 2. 搜索词包含中文时不走拼音匹配，直接返回 false
  if (hasChinese(lowerQuery)) {
    return false
  }

  // 3. 搜索词为纯英文时，对文本中的中文部分做拼音匹配
  if (isPureAlpha(lowerQuery)) {
    const initials = getPinyinInitials(text)
    if (initials && initials.includes(lowerQuery)) {
      return true
    }

    const fullPinyin = getPinyinFull(text)
    if (fullPinyin && fullPinyin.includes(lowerQuery)) {
      return true
    }
  }

  return false
}
