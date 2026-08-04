// utils/nameUtils.js - 干员名匹配规范化

/**
 * 去除干员名中的间隔点与括号，便于输入“阿米娅近卫”也能匹配“阿米娅(近卫)”。
 * 括号支持半角 () 与全角 （）。
 */
export function normalizeOperatorName(name) {
  return String(name || '')
    .replace(/[·\u00B7\u2022\u2027]/g, '') // 间隔点
    .replace(/[()（）]/g, '') // 半角/全角括号
    .trim();
}