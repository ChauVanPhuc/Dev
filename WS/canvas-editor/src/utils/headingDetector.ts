import Editor, { IElement, TitleLevel, ElementType } from '../editor'
import { getUUID } from '../editor/utils'

export interface IAutoDetectHeadingsOptions {
  force?: boolean // If true, re-detects even if some headings already exist
}

// Roman numerals: I. II. III. IV. V. VI. VII. VIII. IX. X. XI. XII...
const ROMAN_REGEX =
  /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\.\s+/i

// Chapter / Part / Section: CHƯƠNG 1, PHẦN 1, BÀI 1...
const MAJOR_SECTION_REGEX =
  /^(?:CHƯƠNG|Chương|PHẦN|Phần|BÀI|Bài)\s+[0-9IVXLCDM]+\b/i

// Article / Section: MỤC 1, ĐIỀU 1...
const SUB_SECTION_REGEX = /^(?:MỤC|Mục|ĐIỀU|Điều)\s+[0-9IVXLCDM]+\b/i

// Numbered sections: 1. , 2. , 3. ...
const NUMBERED_REGEX = /^\d+\.\s+/

// Sub-numbered sections: 1.1 , 1.2 , 1.1. ...
const SUB_NUMBERED_REGEX = /^\d+\.\d+\.?\s+/

// Sub-sub-numbered sections: 1.1.1 , 1.1.2 ...
const SUB_SUB_NUMBERED_REGEX = /^\d+\.\d+\.\d+\.?\s+/

// Letter sections: A. , B. , C. ...
const LETTER_REGEX = /^[A-Z]\.\s+/

// Sub-letter sections: a) , b) , c) ...
const SUB_LETTER_REGEX = /^[a-z]\)\s+/i

export function autoDetectHeadings(
  instance: Editor,
  options?: IAutoDetectHeadingsOptions
): number {
  const result = instance.command.getValue()
  const elementList = result?.data?.main
  if (!elementList || !elementList.length) return 0

  // If not forcing, check if titles already exist
  if (!options?.force) {
    const hasExistingTitles = elementList.some(
      (el: IElement) => !!el.titleId && !!el.level
    )
    if (hasExistingTitles) return 0
  }

  // Group elements into paragraphs (separated by \n or tables)
  interface IParagraph {
    elements: IElement[]
    text: string
  }

  const paragraphs: IParagraph[] = []
  let currentGroup: IElement[] = []

  for (let i = 0; i < elementList.length; i++) {
    const el = elementList[i]
    if (el.type === ElementType.TABLE) {
      if (currentGroup.length) {
        const text = currentGroup
          .map(e => e.value || '')
          .join('')
          .replace(/[\r\n]+/g, '')
          .trim()
        paragraphs.push({
          elements: currentGroup,
          text
        })
        currentGroup = []
      }
      continue
    }

    currentGroup.push(el)
    if (el.value && el.value.includes('\n')) {
      const text = currentGroup
        .map(e => e.value || '')
        .join('')
        .replace(/[\r\n]+/g, '')
        .trim()
      paragraphs.push({
        elements: currentGroup,
        text
      })
      currentGroup = []
    }
  }

  if (currentGroup.length) {
    const text = currentGroup
      .map(e => e.value || '')
      .join('')
      .replace(/[\r\n]+/g, '')
      .trim()
    paragraphs.push({
      elements: currentGroup,
      text
    })
  }

  // Check if document has Roman numerals or Major sections
  const hasRomanOrMajor = paragraphs.some(
    p => ROMAN_REGEX.test(p.text) || MAJOR_SECTION_REGEX.test(p.text)
  )

  let detectedCount = 0

  for (const para of paragraphs) {
    const { elements, text } = para
    if (!text || text.length < 2 || text.length > 150) continue

    // Skip if already has titleId and level
    if (elements.some(e => e.titleId && e.level)) continue

    // Check punctuation: should not end with sentence-ending punctuation like comma, semicolon, question mark
    if (/[,;?!]$/.test(text)) continue

    // Check formatting indicators: bold or large font size
    const isBold = elements.some(e => !!e.bold)
    const maxFontSize = Math.max(...elements.map(e => e.size || 0))
    const isLarge = maxFontSize >= 18 // >= 13.5pt (default size in canvas-editor is 16)

    let matchedLevel: TitleLevel | null = null

    if (SUB_SUB_NUMBERED_REGEX.test(text)) {
      matchedLevel = TitleLevel.FOURTH
    } else if (SUB_NUMBERED_REGEX.test(text)) {
      matchedLevel = hasRomanOrMajor ? TitleLevel.THIRD : TitleLevel.SECOND
    } else if (ROMAN_REGEX.test(text) || MAJOR_SECTION_REGEX.test(text)) {
      matchedLevel = TitleLevel.FIRST
    } else if (NUMBERED_REGEX.test(text)) {
      matchedLevel = hasRomanOrMajor ? TitleLevel.SECOND : TitleLevel.FIRST
    } else if (SUB_SECTION_REGEX.test(text) || LETTER_REGEX.test(text)) {
      matchedLevel = TitleLevel.SECOND
    } else if (SUB_LETTER_REGEX.test(text)) {
      matchedLevel = TitleLevel.THIRD
    } else if (
      (isBold || isLarge) &&
      text.length < 80 &&
      !text.endsWith('.') &&
      (text === text.toUpperCase() || isLarge)
    ) {
      // All-caps bold heading or large prominent title
      matchedLevel = TitleLevel.FIRST
    }

    if (matchedLevel) {
      const titleId = getUUID()
      for (const el of elements) {
        if (el.value === '\n') continue
        el.titleId = titleId
        el.level = matchedLevel
        if (el.bold === undefined) {
          el.bold = true
        }
      }
      detectedCount++
    }
  }

  if (detectedCount > 0) {
    instance.command.executeSetValue(result.data)
  }

  return detectedCount
}
