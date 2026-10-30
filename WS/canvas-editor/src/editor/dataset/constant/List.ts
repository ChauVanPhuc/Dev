import { ListStyle, ListType, OlStyle, UlStyle } from '../enum/List'
import { IListOption } from '../../interface/Element'

export const defaultListOption: Readonly<Required<IListOption>> = {
  inheritStyle: false
}

export const ulStyleMapping: Record<UlStyle, string> = {
  [UlStyle.DISC]: '•',
  [UlStyle.CIRCLE]: '◦',
  [UlStyle.SQUARE]: '▫︎',
  [UlStyle.CHECKBOX]: '☑️'
}

export const listTypeElementMapping: Record<ListType, string> = {
  [ListType.OL]: 'ol',
  [ListType.UL]: 'ul'
}

export const listStyleCSSMapping: Record<ListStyle, string> = {
  [ListStyle.DISC]: 'disc',
  [ListStyle.CIRCLE]: 'circle',
  [ListStyle.SQUARE]: 'square',
  [ListStyle.DECIMAL]: 'decimal',
  [ListStyle.DECIMAL_PAREN]: 'decimal',
  [ListStyle.LOWER_ALPHA]: 'lower-alpha',
  [ListStyle.LOWER_ALPHA_PAREN]: 'lower-alpha',
  [ListStyle.UPPER_ALPHA]: 'upper-alpha',
  [ListStyle.LOWER_ROMAN]: 'lower-roman',
  [ListStyle.UPPER_ROMAN]: 'upper-roman',
  [ListStyle.CHECKBOX]: 'checkbox'
}

function toAlpha(num: number): string {
  let n = Math.max(1, num)
  let result = ''
  while (n > 0) {
    n--
    result = String.fromCharCode(97 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

function toRoman(num: number): string {
  let n = Math.max(1, Math.min(3999, num))
  const pairs: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i']
  ]
  let res = ''
  for (const [val, sym] of pairs) {
    while (n >= val) {
      res += sym
      n -= val
    }
  }
  return res
}

export function formatOrderedListMarker(
  zeroBasedIndex: number,
  listStyle?: ListStyle | OlStyle
): string {
  const num = Math.max(1, zeroBasedIndex + 1)
  switch (listStyle) {
    case ListStyle.DECIMAL_PAREN:
      return `${num})`
    case ListStyle.LOWER_ALPHA:
      return `${toAlpha(num)}.`
    case ListStyle.LOWER_ALPHA_PAREN:
      return `${toAlpha(num)})`
    case ListStyle.UPPER_ALPHA:
      return `${toAlpha(num).toUpperCase()}.`
    case ListStyle.LOWER_ROMAN:
      return `${toRoman(num)}.`
    case ListStyle.UPPER_ROMAN:
      return `${toRoman(num).toUpperCase()}.`
    case ListStyle.DECIMAL:
    default:
      return `${num}.`
  }
}
