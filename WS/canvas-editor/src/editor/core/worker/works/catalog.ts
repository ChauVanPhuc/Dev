import { ICatalog, ICatalogItem } from '../../../interface/Catalog'
import { IElement, IElementPosition } from '../../../interface/Element'

interface IGetCatalogPayload {
  elementList: IElement[]
  positionList: IElementPosition[]
}

type ICatalogElement = IElement & {
  pageNo: number
}

enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  HYPERLINK = 'hyperlink',
  SUPERSCRIPT = 'superscript',
  SUBSCRIPT = 'subscript',
  SEPARATOR = 'separator',
  PAGE_BREAK = 'pageBreak',
  CONTROL = 'control',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  LATEX = 'latex',
  TAB = 'tab',
  DATE = 'date',
  BLOCK = 'block',
  TITLE = 'title',
  AREA = 'area',
  LIST = 'list',
  LABEL = 'label'
}

enum TitleLevel {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  FOURTH = 'fourth',
  FIFTH = 'fifth',
  SIXTH = 'sixth'
}

const titleOrderNumberMapping: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

const orderToTitleLevelMapping: Record<number, TitleLevel> = {
  1: TitleLevel.FIRST,
  2: TitleLevel.SECOND,
  3: TitleLevel.THIRD,
  4: TitleLevel.FOURTH,
  5: TitleLevel.FIFTH,
  6: TitleLevel.SIXTH
}

const TEXTLIKE_ELEMENT_TYPE: ElementType[] = [
  ElementType.TEXT,
  ElementType.HYPERLINK,
  ElementType.SUBSCRIPT,
  ElementType.SUPERSCRIPT,
  ElementType.CONTROL,
  ElementType.DATE,
  ElementType.LABEL
]

const ZERO = '\u200B'

function isTextLikeElement(element: IElement): boolean {
  return !element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)
}

function toAlpha(num: number): string {
  let result = ''
  let n = Math.max(1, num)
  while (n > 0) {
    n--
    result = String.fromCharCode(97 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

function toRoman(num: number): string {
  const n = Math.max(1, Math.min(3999, num))
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
  let rem = n
  let out = ''
  for (const [val, sym] of pairs) {
    while (rem >= val) {
      out += sym
      rem -= val
    }
  }
  return out
}

function formatOrderedListMarker(
  zeroBasedIndex: number,
  listStyle?: string
): string {
  const n = zeroBasedIndex + 1
  switch (listStyle) {
    case 'decimalParen':
    case 'decimal-paren':
      return `${n})`
    case 'lowerAlpha':
    case 'lower-alpha':
      return `${toAlpha(n)}.`
    case 'lowerAlphaParen':
    case 'lower-alpha-paren':
      return `${toAlpha(n)})`
    case 'upperAlpha':
    case 'upper-alpha':
      return `${toAlpha(n).toUpperCase()}.`
    case 'lowerRoman':
    case 'lower-roman':
      return `${toRoman(n)}.`
    case 'upperRoman':
    case 'upper-roman':
      return `${toRoman(n).toUpperCase()}.`
    case 'decimal':
    default:
      return `${n}.`
  }
}

function isSubOrderedListStyle(listStyle?: string): boolean {
  return (
    listStyle === 'lowerAlpha' ||
    listStyle === 'lower-alpha' ||
    listStyle === 'lowerAlphaParen' ||
    listStyle === 'lower-alpha-paren' ||
    listStyle === 'lowerRoman' ||
    listStyle === 'lower-roman'
  )
}

function isUpperOrderedListStyle(listStyle?: string): boolean {
  return (
    listStyle === 'upperRoman' ||
    listStyle === 'upper-roman' ||
    listStyle === 'upperAlpha' ||
    listStyle === 'upper-alpha'
  )
}

function advanceListCounter(
  listIndexMap: Map<string, number>,
  el: IElement
): number {
  const curListLevel = el.listLevel ?? 0
  const listKey = `${el.listId}_${curListLevel}_${el.listType || 'ol'}`
  if (listIndexMap.has(listKey)) {
    listIndexMap.set(listKey, (listIndexMap.get(listKey) ?? 0) + 1)
  } else {
    listIndexMap.set(listKey, 0)
  }
  const prefix = `${el.listId}_`
  for (const key of Array.from(listIndexMap.keys())) {
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length)
      const lvl = Number(rest.split('_')[0])
      if (!Number.isNaN(lvl) && lvl > curListLevel) {
        listIndexMap.delete(key)
      }
    }
  }
  return listIndexMap.get(listKey) ?? 0
}

function extractConciseListLabel(valueList: IElement[]): string {
  const textEls = valueList.filter(
    el => isTextLikeElement(el) && el.value !== ZERO
  )
  if (!textEls.length) return ''

  // Kiểm tra nếu mục danh sách bắt đầu bằng cụm chữ in đậm (ví dụ: "Được cải thiện điều kiện lao động:")
  // và theo sau là phần diễn giải chữ thường -> lấy cụm tiêu đề in đậm làm nhãn Mục lục
  let leadingBold = ''
  let sawBold = false
  let sawNonBoldAfterBold = false
  for (const el of textEls) {
    const val = (el.value || '').replace(new RegExp(ZERO, 'g'), '')
    if (!val) continue
    if (val.includes('\n')) {
      const beforeNewline = val.split(/[\r\n]+/)[0]
      if (!sawNonBoldAfterBold && el.bold) {
        leadingBold += beforeNewline
        sawBold = true
      }
      break
    }
    if (el.bold && !sawNonBoldAfterBold) {
      leadingBold += val
      sawBold = true
    } else if (sawBold && val.trim().length > 0) {
      sawNonBoldAfterBold = true
    }
  }

  if (sawBold && sawNonBoldAfterBold) {
    const cleanBold = leadingBold
      .replace(/[\r\n]+/g, ' ')
      .replace(/[:：.\s]+$/, '')
      .trim()
    if (cleanBold.length >= 2) {
      return cleanBold.length > 90
        ? `${cleanBold.slice(0, 87).trim()}...`
        : cleanBold
    }
  }

  const rawText = textEls
    .map(el => el.value || '')
    .join('')
    .replace(new RegExp(ZERO, 'g'), '')
  const firstLine = (rawText.split(/[\r\n]+/)[0] || rawText).trim()
  if (!firstLine) return ''

  // Nếu dòng quá dài và có dấu hai chấm ':', ưu tiên lấy mệnh đề trước dấu ':'
  const colonIdx = firstLine.indexOf(':')
  if (colonIdx >= 4 && (firstLine.length > 70 || colonIdx <= 65)) {
    const beforeColon = firstLine.slice(0, colonIdx).trim()
    if (beforeColon.length >= 4) {
      return beforeColon
    }
  }

  const cleaned = firstLine.replace(/[:：]\s*$/, '').trim()
  return cleaned.length > 90 ? `${cleaned.slice(0, 87).trim()}...` : cleaned
}

const NUMBERED_BOLD_PREFIX_REG =
  /^(?:(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.|[0-9]+(?:\.[0-9]+)*\.|[a-zA-Z]\))\s+\S+/

export function getCatalog(payload: IGetCatalogPayload): ICatalog | null {
  const { elementList, positionList } = payload
  const titleElementList: ICatalogElement[] = []
  const listIndexMap = new Map<string, number>()
  let currentParentTitleLevel: TitleLevel | null = null

  let t = 0
  while (t < elementList.length) {
    const element = elementList[t]

    const getElementInfo = (
      el: IElement,
      list: IElement[],
      position: number
    ) => {
      const titleId = el.titleId
      const level = el.level
      const pageNo = positionList?.[position]?.pageNo ?? 0
      const titleElement: ICatalogElement = {
        type: ElementType.TITLE,
        value: '',
        level,
        titleId,
        pageNo
      }
      const valueList: IElement[] = []
      let listMarker = ''
      while (position < list.length) {
        const titleE = list[position]
        if (titleId !== titleE.titleId) {
          position--
          break
        }
        if (
          titleE.listId &&
          (titleE.value === ZERO || titleE.value === '\n') &&
          !titleE.listWrap
        ) {
          const curIdx = advanceListCounter(listIndexMap, titleE)
          if (titleE.listType === 'ol' && !listMarker) {
            listMarker = formatOrderedListMarker(curIdx, titleE.listStyle)
          }
        }
        valueList.push(titleE)
        position++
      }
      if (!listMarker && el.listId && el.listType === 'ol') {
        const listKey = `${el.listId}_${el.listLevel ?? 0}_${el.listType}`
        const curIdx = listIndexMap.get(listKey) ?? 0
        listMarker = formatOrderedListMarker(curIdx, el.listStyle)
      }
      const rawTitle = valueList
        .filter(item => isTextLikeElement(item))
        .map(item => item.value)
        .join('')
        .replace(new RegExp(ZERO, 'g'), '')
      let firstLine = (rawTitle.split(/[\r\n]+/)[0] || rawTitle).trim()
      if (
        listMarker &&
        firstLine &&
        !firstLine.toLowerCase().startsWith(listMarker.toLowerCase())
      ) {
        firstLine = `${listMarker} ${firstLine}`
      }
      titleElement.value = firstLine
      return { position, titleElement }
    }

    if (element.titleId) {
      const { position, titleElement } = getElementInfo(element, elementList, t)
      t = position
      if (titleElement.value) {
        titleElementList.push(titleElement)
        const isCoverOrRev =
          titleElement.titleId === 'iso-title-cover-page' ||
          titleElement.titleId === 'iso-title-rev-log' ||
          titleElement.value.includes('THEO DÕI SỬA ĐỔI')
        if (!isCoverOrRev && titleElement.level) {
          currentParentTitleLevel = titleElement.level
        }
      }
      t++
      continue
    }

    // Đưa các mục Danh sách đánh số thứ tự (listType === 'ol') vào Mục lục
    if (element.listId && element.listType === 'ol') {
      const itemStartIndex = t
      const pageNo = positionList?.[itemStartIndex]?.pageNo ?? 0
      const curListLevel = element.listLevel ?? 0
      let curIdx = 0
      if (
        (element.value === ZERO || element.value === '\n') &&
        !element.listWrap
      ) {
        curIdx = advanceListCounter(listIndexMap, element)
      } else {
        const listKey = `${element.listId}_${curListLevel}_ol`
        if (!listIndexMap.has(listKey)) {
          listIndexMap.set(listKey, 0)
        }
        curIdx = listIndexMap.get(listKey) ?? 0
      }

      const itemElements: IElement[] = [element]
      let position = t + 1
      while (position < elementList.length) {
        const nextEl = elementList[position]
        if (
          nextEl.titleId ||
          nextEl.listId !== element.listId ||
          nextEl.listType !== 'ol' ||
          (nextEl.listLevel ?? 0) !== curListLevel
        ) {
          position--
          break
        }
        if (
          (nextEl.value === ZERO || nextEl.value === '\n') &&
          !nextEl.listWrap
        ) {
          position--
          break
        }
        itemElements.push(nextEl)
        position++
      }
      if (position >= elementList.length) {
        position = elementList.length - 1
      }

      const firstTextEl = itemElements.find(
        el =>
          isTextLikeElement(el) &&
          el.value !== ZERO &&
          (el.value || '').trim().length > 0
      )
      const isSubList = isSubOrderedListStyle(element.listStyle)
      const isUpperList = isUpperOrderedListStyle(element.listStyle)
      const rawItemText = itemElements
        .filter(el => isTextLikeElement(el) && el.value !== ZERO)
        .map(el => el.value || '')
        .join('')
        .replace(new RegExp(ZERO, 'g'), '')
        .trim()
      const shouldIncludeInCatalog = isUpperList
        ? true
        : isSubList
          ? !!firstTextEl?.bold
          : !!firstTextEl?.bold ||
            (rawItemText.length > 0 &&
              rawItemText.length <= 90 &&
              !/[;；.。]$/.test(rawItemText))

      const marker = formatOrderedListMarker(curIdx, element.listStyle)
      const conciseLabel = shouldIncludeInCatalog
        ? extractConciseListLabel(itemElements)
        : ''
      if (conciseLabel) {
        const displayValue = conciseLabel
          .toLowerCase()
          .startsWith(marker.toLowerCase())
          ? conciseLabel
          : `${marker} ${conciseLabel}`
        const baseOrder = currentParentTitleLevel
          ? titleOrderNumberMapping[currentParentTitleLevel] + 1
          : 1
        const extraSubLevel = isSubList
          ? Math.max(1, curListLevel)
          : curListLevel
        const targetOrder = Math.max(
          1,
          Math.min(6, baseOrder + extraSubLevel)
        )
        const targetLevel =
          orderToTitleLevelMapping[targetOrder] || TitleLevel.SECOND

        titleElementList.push({
          type: ElementType.TITLE,
          value: displayValue,
          level: targetLevel,
          titleId: `__list_catalog__:${element.listId}:${itemStartIndex}`,
          pageNo
        })
      }
      t = position + 1
      continue
    }

    // Cập nhật bộ đếm nếu là danh sách không thứ tự (ul)
    if (
      element.listId &&
      (element.value === ZERO || element.value === '\n') &&
      !element.listWrap
    ) {
      advanceListCounter(listIndexMap, element)
    }

    // Trường hợp đoạn văn bản đánh số bằng chữ gõ tay có in đậm phần đầu mục (ví dụ: "1. Được cải thiện điều kiện lao động: ...")
    const isLineStart =
      t === 0 ||
      element.value === ZERO ||
      element.value === '\n' ||
      elementList[t - 1]?.value === ZERO ||
      elementList[t - 1]?.value === '\n' ||
      elementList[t - 1]?.type === ElementType.TABLE ||
      elementList[t - 1]?.type === ElementType.PAGE_BREAK
    if (
      isLineStart &&
      !element.listId &&
      !element.titleId &&
      element.type !== ElementType.TABLE &&
      element.type !== ElementType.PAGE_BREAK
    ) {
      const paraStartIndex = t
      const pageNo = positionList?.[paraStartIndex]?.pageNo ?? 2
      if (!positionList?.length || pageNo >= 2) {
        const paraElements: IElement[] = [element]
        let pos = t + 1
        while (pos < elementList.length) {
          const nextEl = elementList[pos]
          if (
            nextEl.titleId ||
            nextEl.listId ||
            nextEl.type === ElementType.TABLE ||
            nextEl.type === ElementType.PAGE_BREAK ||
            nextEl.value === ZERO ||
            nextEl.value === '\n'
          ) {
            pos--
            break
          }
          paraElements.push(nextEl)
          if (typeof nextEl.value === 'string' && nextEl.value.includes('\n')) {
            break
          }
          pos++
        }
        if (pos >= elementList.length) {
          pos = elementList.length - 1
        }
        const firstTextEl = paraElements.find(
          el =>
            isTextLikeElement(el) &&
            el.value !== ZERO &&
            (el.value || '').trim().length > 0
        )
        const rawParaText = paraElements
          .filter(el => isTextLikeElement(el) && el.value !== ZERO)
          .map(el => el.value || '')
          .join('')
          .replace(new RegExp(ZERO, 'g'), '')
          .trim()
        const isMultiDotSubSection = /^\d+(?:\.\d+)+\.?\s+\S+/.test(rawParaText)
        if (firstTextEl?.bold || isMultiDotSubSection) {
          let concise = extractConciseListLabel(paraElements)
          if (isMultiDotSubSection && concise) {
            const scopeCutIdx = concise.toLowerCase().indexOf(' trong phạm vi ')
            if (scopeCutIdx > 4) {
              concise = concise.slice(0, scopeCutIdx).trim()
            }
          }
          if (
            concise &&
            (NUMBERED_BOLD_PREFIX_REG.test(concise) || isMultiDotSubSection)
          ) {
            const subDepthMatch = concise.match(/^(\d+(?:\.\d+)+)/)
            const extraDepth = subDepthMatch
              ? Math.max(0, subDepthMatch[1].split('.').length - 1)
              : 0
            const baseOrder = currentParentTitleLevel
              ? titleOrderNumberMapping[currentParentTitleLevel] + 1
              : 1
            const targetOrder = Math.max(1, Math.min(6, baseOrder + extraDepth))
            const targetLevel =
              orderToTitleLevelMapping[targetOrder] || TitleLevel.SECOND
            titleElementList.push({
              type: ElementType.TITLE,
              value: concise,
              level: targetLevel,
              titleId: `__para_catalog__:${paraStartIndex}`,
              pageNo
            })
            t = pos + 1
            continue
          }
        }
      }
    }

    if (element.type === ElementType.TABLE) {
      const trList = element.trList!
      for (let r = 0; r < trList.length; r++) {
        const tr = trList[r]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          const value = td.value
          if (value.length > 1) {
            let index = 1
            while (index < value.length) {
              if (value[index]?.titleId) {
                const { titleElement, position } = getElementInfo(
                  value[index],
                  value,
                  index
                )
                if (titleElement.value) {
                  titleElementList.push(titleElement)
                }
                index = position
              }
              index++
            }
          }
        }
      }
    }
    t++
  }

  if (!titleElementList.length) return null

  const recursiveInsert = (
    title: ICatalogElement,
    catalogItem: ICatalogItem
  ) => {
    const subCatalogItem =
      catalogItem.subCatalog[catalogItem.subCatalog.length - 1]
    const catalogItemLevel = titleOrderNumberMapping[subCatalogItem?.level]
    const titleLevel = titleOrderNumberMapping[title.level!]
    if (subCatalogItem && titleLevel > catalogItemLevel) {
      recursiveInsert(title, subCatalogItem)
    } else {
      catalogItem.subCatalog.push({
        id: title.titleId!,
        name: title.value,
        level: title.level!,
        pageNo: title.pageNo,
        subCatalog: []
      })
    }
  }

  const catalog: ICatalog = []
  for (let e = 0; e < titleElementList.length; e++) {
    const title = titleElementList[e]
    const catalogItem = catalog[catalog.length - 1]
    const catalogItemLevel = titleOrderNumberMapping[catalogItem?.level]
    const titleLevel = titleOrderNumberMapping[title.level!]
    if (catalogItem && titleLevel > catalogItemLevel) {
      recursiveInsert(title, catalogItem)
    } else {
      catalog.push({
        id: title.titleId!,
        name: title.value,
        level: title.level!,
        pageNo: title.pageNo,
        subCatalog: []
      })
    }
  }
  return catalog
}

if (typeof self !== 'undefined') {
  onmessage = evt => {
    const payload = <IGetCatalogPayload>evt.data
    const catalog = getCatalog(payload)
    postMessage(catalog)
  }
}
