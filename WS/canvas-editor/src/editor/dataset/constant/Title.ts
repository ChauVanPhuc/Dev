import { IElement } from '../../interface/Element'
import { ITitleOption, ITitleSizeOption } from '../../interface/Title'
import { TitleLevel } from '../enum/Title'
import { ZERO } from './Common'

export const defaultTitleOption: Readonly<Required<ITitleOption>> = {
  defaultFirstSize: 16,
  defaultSecondSize: 14,
  defaultThirdSize: 13,
  defaultFourthSize: 13,
  defaultFifthSize: 13,
  defaultSixthSize: 13
}

export const titleSizeMapping: Record<TitleLevel, keyof ITitleSizeOption> = {
  [TitleLevel.FIRST]: 'defaultFirstSize',
  [TitleLevel.SECOND]: 'defaultSecondSize',
  [TitleLevel.THIRD]: 'defaultThirdSize',
  [TitleLevel.FOURTH]: 'defaultFourthSize',
  [TitleLevel.FIFTH]: 'defaultFifthSize',
  [TitleLevel.SIXTH]: 'defaultSixthSize'
}

export interface ITitleStyleFormatting {
  size: number
  bold: boolean
  italic: boolean
}

export function getTitleFormatting(
  level: TitleLevel,
  titleOptions: Required<ITitleSizeOption> = defaultTitleOption
): ITitleStyleFormatting {
  const size = titleOptions[titleSizeMapping[level]]
  switch (level) {
    case TitleLevel.FIRST:
    case TitleLevel.SECOND:
    case TitleLevel.THIRD:
      return { size, bold: true, italic: false }
    case TitleLevel.FOURTH:
    case TitleLevel.FIFTH:
      return { size, bold: true, italic: true }
    case TitleLevel.SIXTH:
      return { size, bold: false, italic: true }
    default:
      return { size, bold: true, italic: false }
  }
}

function transformLineByTitleLevel(line: string, level: TitleLevel): string {
  if (!line) return line
  if (level === TitleLevel.FIRST) {
    return line.toLocaleUpperCase('vi-VN')
  }
  if (level === TitleLevel.SECOND) {
    const romanMatch = line.match(
      /^(\s*(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\.\s+)/i
    )
    const prefixLen = romanMatch ? romanMatch[1].length : 0
    const chars = Array.from(line)
    let prevIsLetter = false
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      if (i < prefixLen) {
        chars[i] = ch.toLocaleUpperCase('vi-VN')
        prevIsLetter = /\p{L}/u.test(ch)
        continue
      }
      if (/\p{L}/u.test(ch)) {
        chars[i] = prevIsLetter
          ? ch.toLocaleLowerCase('vi-VN')
          : ch.toLocaleUpperCase('vi-VN')
        prevIsLetter = true
      } else {
        prevIsLetter = false
      }
    }
    return chars.join('')
  }
  if (level === TitleLevel.THIRD) {
    const prefixMatch = line.match(
      /^(\s*(?:(?:(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\.)|(?:\d+(?:\.\d+)*\.?)|(?:[a-zA-Z][.)])|[-•+])\s+)/iu
    )
    const prefixLen = prefixMatch ? prefixMatch[1].length : 0
    const chars = Array.from(line)
    let needCap = true
    for (let i = prefixLen; i < chars.length; i++) {
      const ch = chars[i]
      if (/\p{L}/u.test(ch)) {
        if (needCap) {
          chars[i] = ch.toLocaleUpperCase('vi-VN')
          needCap = false
        } else {
          chars[i] = ch.toLocaleLowerCase('vi-VN')
        }
      } else if (/[.?!]/.test(ch)) {
        const prevCh = i > 0 ? chars[i - 1] : ''
        const nextCh = i + 1 < chars.length ? chars[i + 1] : ''
        if (!(/\d/.test(prevCh) && /\d/.test(nextCh))) {
          needCap = true
        }
      }
    }
    return chars.join('')
  }
  return line
}

export function applyHeadingTextCase(
  elements: IElement[],
  level: TitleLevel
): void {
  if (
    level !== TitleLevel.FIRST &&
    level !== TitleLevel.SECOND &&
    level !== TitleLevel.THIRD
  ) {
    return
  }
  if (!elements || !elements.length) return

  let currentGroup: IElement[] = []
  const flushGroup = () => {
    if (!currentGroup.length) return
    const fullText = currentGroup.map(el => el.value || '').join('')
    if (!fullText) {
      currentGroup = []
      return
    }
    const transformed = fullText
      .split('\n')
      .map(part => transformLineByTitleLevel(part, level))
      .join('\n')
    if (transformed.length === fullText.length) {
      let offset = 0
      for (const el of currentGroup) {
        const len = (el.value || '').length
        if (len > 0) {
          el.value = transformed.slice(offset, offset + len)
          offset += len
        }
      }
    }
    currentGroup = []
  }

  for (const el of elements) {
    if (!el.value || el.value === ZERO) {
      flushGroup()
      continue
    }
    currentGroup.push(el)
    if (el.value.endsWith('\n')) {
      flushGroup()
    }
  }
  flushGroup()
}

export const titleOrderNumberMapping: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

export const titleNodeNameMapping: Record<string, TitleLevel> = {
  H1: TitleLevel.FIRST,
  H2: TitleLevel.SECOND,
  H3: TitleLevel.THIRD,
  H4: TitleLevel.FOURTH,
  H5: TitleLevel.FIFTH,
  H6: TitleLevel.SIXTH
}
