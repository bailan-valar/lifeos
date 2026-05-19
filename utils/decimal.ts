/**
 * 金额/数字精度计算工具
 * 基于 decimal.js 封装，避免 JavaScript 浮点数精度问题（如 0.1 + 0.2 ≠ 0.3）
 */
import Decimal from 'decimal.js'

export { Decimal }

/** 将值转为 Decimal 实例 */
export function d(value: number | string | Decimal): Decimal {
  return new Decimal(value)
}

/** 对数组求和 */
export function sum(values: (number | string | Decimal)[]): number {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0)).toNumber()
}

/** 累加多个值 */
export function add(...values: (number | string | Decimal)[]): number {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0)).toNumber()
}

/** 减法：a - b */
export function sub(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a).minus(b).toNumber()
}

/** 乘法：a × b */
export function mul(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a).times(b).toNumber()
}

/** 除法：a ÷ b */
export function div(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a).dividedBy(b).toNumber()
}

/** 四舍五入到指定精度 */
export function round(value: number | string | Decimal, precision = 2): number {
  return new Decimal(value).toDecimalPlaces(precision).toNumber()
}

/** 比较两个数值是否相等（支持容差） */
export function eq(
  a: number | string | Decimal,
  b: number | string | Decimal,
  epsilon = 0.0001
): boolean {
  return new Decimal(a).minus(b).abs().lessThan(epsilon)
}

/** 取绝对值 */
export function abs(value: number | string | Decimal): number {
  return new Decimal(value).abs().toNumber()
}

/** 取较大值 */
export function max(a: number | string | Decimal, b: number | string | Decimal): number {
  return Decimal.max(a, b).toNumber()
}

/** 取较小值 */
export function min(a: number | string | Decimal, b: number | string | Decimal): number {
  return Decimal.min(a, b).toNumber()
}
