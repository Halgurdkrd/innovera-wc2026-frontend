const KU_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function toKurdishNums(s: string | number): string {
  return String(s).replace(/\d/g, d => KU_DIGITS[parseInt(d)])
}

export function localizeNum(value: string | number, language: string): string {
  if (language === 'KU') return toKurdishNums(value)
  return String(value)
}
