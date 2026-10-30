import { ZERO } from '../../../dataset/constant/Common'
import {
  formatOrderedListMarker,
  ulStyleMapping
} from '../../../dataset/constant/List'
import { ElementType } from '../../../dataset/enum/Element'
import { KeyMap } from '../../../dataset/enum/KeyMap'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { getUUID } from '../../../utils'
import { RangeManager } from '../../range/RangeManager'
import { Draw } from '../Draw'

export class ListParticle {
  private draw: Draw
  private range: RangeManager
  private options: DeepRequired<IEditorOption>

  // 非递增样式直接返回默认值
  private readonly UN_COUNT_STYLE_WIDTH = 20
  private readonly MEASURE_BASE_TEXT = '0'
  private readonly LIST_GAP = 10
  public readonly LIST_INDENT_WIDTH = 30
  private readonly MAX_LEVEL = 8

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  public setList(listType: ListType | null, listStyle?: ListStyle) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range.getRangeParagraphElementList()
    if (!changeElementList || !changeElementList.length) return
    // 如果包含列表则设置为取消列表
    const isUnsetList = changeElementList.find(
      el =>
        el.listType === listType && (!listStyle || el.listStyle === listStyle)
    )
    if (isUnsetList || !listType) {
      this.unsetList()
      return
    }
    // 保留当前缩进层级（如已按 Tab 缩进后再切换列表样式）
    const targetLevel =
      changeElementList.find(el => el.listLevel !== undefined)?.listLevel ?? 0
    const elementList = this.draw.getElementList()
    const firstEl = changeElementList[0]
    const oldListId = firstEl?.listId
    // 自动查找前序同级同类型列表以连续编号（如被子列表 • 或空行隔开时继续 1., 2., 3.）
    const listId =
      this.findContinuableListId(
        firstEl,
        listType,
        listStyle,
        targetLevel,
        elementList
      ) || getUUID()
    // 设置值
    this.draw.setElementProperty(changeElementList, {
      listId,
      listType,
      listStyle,
      listLevel: targetLevel
    })
    // 若原属于某个列表且仅切换有序列表样式，同步更新同列表后续项
    if (oldListId && oldListId !== listId) {
      const lastChanged = changeElementList[changeElementList.length - 1]
      const afterIdx = elementList.indexOf(lastChanged)
      if (~afterIdx) {
        for (let i = afterIdx + 1; i < elementList.length; i++) {
          const el = elementList[i]
          if (el.listId === oldListId && (el.listLevel ?? 0) === targetLevel) {
            this.draw.setElementProperty(el, { listId, listType, listStyle })
          }
        }
      }
    }
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 重新开始编号（从 1 开始 - Restart at 1）
  public restartListNumbering() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const segments = this.extractListSegments()
    if (!segments.length) return
    const elementList = this.draw.getElementList()
    const firstEl = segments[0][0]
    const oldListId = firstEl?.listId
    if (!oldListId) return
    const targetLevel = firstEl.listLevel ?? 0
    const newListId = getUUID()
    const startPos = elementList.indexOf(firstEl)
    if (!~startPos) return
    for (let i = startPos; i < elementList.length; i++) {
      const el = elementList[i]
      if (el.listId === oldListId && (el.listLevel ?? 0) === targetLevel) {
        this.draw.setElementProperty(el, { listId: newListId })
      }
    }
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 继续上一列表编号（Continue numbering）
  public continueListNumbering() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const segments = this.extractListSegments()
    if (!segments.length) return
    const elementList = this.draw.getElementList()
    const firstEl = segments[0][0]
    const oldListId = firstEl?.listId
    if (!oldListId) return
    const targetLevel = firstEl.listLevel ?? 0
    const targetType = firstEl.listType || ListType.OL
    const startPos = elementList.indexOf(firstEl)
    if (!~startPos) return
    let prevListId: string | undefined
    let prevListStyle: ListStyle | undefined
    for (let i = startPos - 1; i >= 0; i--) {
      const pre = elementList[i]
      if (!pre?.listId || pre.listId === oldListId) continue
      if (pre.listType === targetType && (pre.listLevel ?? 0) === targetLevel) {
        prevListId = pre.listId
        prevListStyle = pre.listStyle
        break
      }
    }
    if (!prevListId) return
    for (let i = startPos; i < elementList.length; i++) {
      const el = elementList[i]
      if (el.listId === oldListId && (el.listLevel ?? 0) === targetLevel) {
        this.draw.setElementProperty(el, {
          listId: prevListId,
          ...(prevListStyle ? { listStyle: prevListStyle } : {})
        })
      }
    }
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 查找同一章节内可延续编号的前序 listId（支持跳过内嵌子列表 • 或空行）
  private findContinuableListId(
    element: IElement | undefined,
    listType: ListType,
    listStyle: ListStyle | undefined,
    level: number,
    elementList: IElement[]
  ): string | undefined {
    if (!element) return
    const start = elementList.indexOf(element)
    if (!~start) return
    for (let i = start - 1; i >= 0; i--) {
      const pre = elementList[i]
      if (!pre) continue
      // 遇到标题、表格、分页符则视为新章节，不再跨章节自动延续
      if (
        pre.titleId ||
        pre.level ||
        pre.type === ElementType.TITLE ||
        pre.type === ElementType.TABLE ||
        pre.type === ElementType.PAGE_BREAK
      ) {
        break
      }
      if (pre.listId) {
        const preLevel = pre.listLevel ?? 0
        // 子列表遇到更浅层父项时停止查找
        if (preLevel < level) break
        // 跳过更深层级的子列表
        if (preLevel > level) continue
        if (
          pre.listType === listType &&
          (!listStyle || !pre.listStyle || pre.listStyle === listStyle)
        ) {
          return pre.listId
        }
        // 顶级有序列表允许跳过中间夹杂的无序符号子项（•）继续编号
        if (listType === ListType.OL && pre.listType === ListType.UL) {
          continue
        }
      } else {
        // 跳过空行或空白字符
        if (pre.value === ZERO || !pre.value?.trim()) {
          continue
        }
        // 若存在普通正文段落，则停止自动合并（用户仍可手动右键选择“继续编号”）
        break
      }
    }
    return
  }

  public unsetList() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    // 如果列表最后字符不是换行符则需插入换行符
    const elementList = this.draw.getElementList()
    const endElement = elementList[endIndex]
    if (endElement.listId) {
      let start = endIndex + 1
      while (start < elementList.length) {
        const element = elementList[start]
        if (element.value === ZERO && !element.listWrap) break
        if (element.listId !== endElement.listId) {
          this.draw.spliceElementList(elementList, start, 0, [
            {
              value: ZERO
            }
          ])
          break
        }
        start++
      }
    }
    // 取消设置
    this.draw.deleteElementProperty(changeElementList, [
      'listId',
      'listType',
      'listStyle',
      'listWrap',
      'listLevel'
    ])
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 提升当前选区列表层级，用于列表项行首 Tab 缩进
  public increaseListLevel() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const segments = this.extractListSegments()
    if (!segments.length) return
    const elementList = this.draw.getElementList()
    let changed = false
    for (const segment of segments) {
      const curLevel = segment[0]?.listLevel ?? 0
      if (curLevel >= this.MAX_LEVEL) continue
      const targetLevel = curLevel + 1
      this.applySegmentLevel(segment, targetLevel, elementList)
      changed = true
    }
    if (!changed) return
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 降低当前选区列表层级，顶级列表继续降级时退出列表
  public decreaseListLevel() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const segments = this.extractListSegments()
    if (!segments.length) return
    const hasTopLevelInSelection = segments.some(
      seg => seg[0]?.listId && (seg[0].listLevel ?? 0) === 0
    )
    if (hasTopLevelInSelection) {
      const elementList = this.draw.getElementList()
      for (const segment of segments) {
        const segListId = segment[0]?.listId
        for (const el of segment) {
          this.clearListInfo(el)
        }
        if (segListId) {
          this.clearPreviousEmptyListItems(elementList, segment[0], segListId)
        }
      }
      const isSetCursor = startIndex === endIndex
      const curIndex = isSetCursor ? endIndex : startIndex
      this.draw.render({ curIndex, isSetCursor })
      return
    }
    const elementList = this.draw.getElementList()
    let changed = false
    for (const segment of segments) {
      const curLevel = segment[0]?.listLevel ?? 0
      if (curLevel <= 0) continue
      const targetLevel = curLevel - 1
      this.applySegmentLevel(segment, targetLevel, elementList)
      changed = true
    }
    if (!changed) return
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  // 将一个或多个完整列表项切换到目标层级，并同步列表标识
  private applySegmentLevel(
    segment: IElement[],
    targetLevel: number,
    elementList: IElement[]
  ) {
    const firstEl = segment[0]
    // 同级列表复用前一个 listId，跨父项的子列表重新生成 listId
    const listId =
      this.findPreviousListId(firstEl, targetLevel, elementList) || getUUID()
    this.draw.setElementProperty(segment, { listId, listLevel: targetLevel })
    if (firstEl.listType) {
      this.draw.setElementProperty(segment, { listType: firstEl.listType })
    }
    if (firstEl.listStyle) {
      this.draw.setElementProperty(segment, { listStyle: firstEl.listStyle })
    }
  }

  // 查找同一父项内最近的同级 listId，用于保持同一子列表连续编号
  private findPreviousListId(
    element: IElement,
    level: number,
    elementList: IElement[]
  ): string | undefined {
    const start = elementList.indexOf(element)
    if (!~start) return
    for (let i = start - 1; i >= 0; i--) {
      const pre = elementList[i]
      if (!pre?.listId) continue
      if (pre.value !== ZERO || pre.listWrap) continue
      // 遇到更浅层级说明已跨出当前父项，子列表编号需要重新开始
      if ((pre.listLevel ?? 0) < level) break
      if (pre.listType !== element.listType) continue
      if ((pre.listLevel ?? 0) !== level) continue
      if (this.isParagraphStart(elementList, i)) {
        return pre.listId
      }
    }
    return
  }

  // 判断元素是否位于列表项段首，只有段首的 listId 才能作为编号锚点
  private isParagraphStart(elementList: IElement[], index: number): boolean {
    const element = elementList[index]
    const pre = elementList[index - 1]
    return (
      !pre ||
      pre.value === ZERO ||
      pre.listId !== element.listId ||
      (element.value === ZERO && !element.listWrap)
    )
  }

  // 清理元素上的列表属性，保留其它文本样式
  private clearListInfo(element: IElement) {
    if (!element.listId) return
    this.draw.deleteElementProperty(element, [
      'listId',
      'listType',
      'listStyle',
      'listWrap',
      'listLevel'
    ])
  }

  // 退出列表时清理同 listId 下连续的前置空列表项
  private clearPreviousEmptyListItems(
    elementList: IElement[],
    segmentStart: IElement,
    listId: string
  ) {
    const start = elementList.indexOf(segmentStart)
    for (let i = start - 1; i >= 0; i--) {
      const pre = elementList[i]
      if (pre.listId !== listId) break
      if (pre.value !== ZERO || pre.listWrap) break
      // 顶级空列表项退出列表时，清理前面连续的空列表项
      this.clearListInfo(pre)
    }
  }

  // 将选区按列表项拆成段，确保缩进操作作用于完整列表项
  private extractListSegments(): IElement[][] {
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return []
    const elementList = this.draw.getElementList()
    if (!elementList.length) return []
    let pStart = Math.min(startIndex, endIndex)
    let pEnd = Math.max(startIndex, endIndex)
    // 光标在列表项起始 ZERO 上时，当前元素已经是段首
    const startElAtZero =
      elementList[pStart]?.value === ZERO &&
      !elementList[pStart]?.listWrap &&
      !!elementList[pStart]?.listId
    if (!startElAtZero) {
      while (pStart > 0) {
        const prev = elementList[pStart - 1]
        if (!prev) break
        if (prev.value === ZERO && !prev.listWrap) {
          if (prev.listId) {
            pStart--
          }
          break
        }
        pStart--
      }
    }
    while (pEnd < elementList.length - 1) {
      const next = elementList[pEnd + 1]
      if (!next) break
      if (next.value === ZERO && !next.listWrap) break
      pEnd++
    }
    const segments: IElement[][] = []
    let current: IElement[] = []
    for (let i = pStart; i <= pEnd; i++) {
      const el = elementList[i]
      const isParagraphStart =
        el.value === ZERO && !el.listWrap && current.length > 0
      if (isParagraphStart) {
        if (current.length) segments.push(current)
        current = []
      }
      current.push(el)
    }
    if (current.length) segments.push(current)
    return segments.filter(seg => seg.some(el => el.listId))
  }

  public computeListStyle(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[]
  ): Map<string, number> {
    const listStyleMap = new Map<string, number>()
    const groupedByListId = new Map<string, IElement[]>()
    for (let i = 0; i < elementList.length; i++) {
      const curElement = elementList[i]
      if (!curElement.listId) continue
      let group = groupedByListId.get(curElement.listId)
      if (!group) {
        group = []
        groupedByListId.set(curElement.listId, group)
      }
      group.push(curElement)
    }
    groupedByListId.forEach((groupElements, listId) => {
      const width = this.getListStyleWidth(ctx, groupElements)
      listStyleMap.set(listId, width)
    })
    return listStyleMap
  }

  private findStyledElement(elementList: IElement[]): IElement {
    let styleElement = elementList[0]
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (!element.value || element.value === ZERO || element.value.trim() === '') {
        continue
      }
      if (element.font || element.size || element.bold || element.italic) {
        styleElement = element
        break
      }
    }
    return styleElement
  }

  private getListFontStyle(elementList: IElement[], scale: number): string {
    const startElement = elementList[0]
    const styleElement = this.findStyledElement(elementList)
    const isOrderedList = startElement?.listType === ListType.OL
    const isHeadingRow = elementList.some(el => !!(el.titleId || el.level))
    if (
      isOrderedList ||
      this.options.list.inheritStyle ||
      isHeadingRow ||
      styleElement?.bold ||
      styleElement?.italic
    ) {
      const effectiveStyle: IElement = isOrderedList
        ? { ...styleElement, bold: true }
        : styleElement
      return this.draw.getElementFont(effectiveStyle, scale)
    } else {
      const { defaultFont, defaultSize } = this.options
      return `${defaultSize * scale}px ${defaultFont}`
    }
  }

  public getListStyleWidth(
    ctx: CanvasRenderingContext2D,
    listElementList: IElement[]
  ): number {
    const { scale, checkbox } = this.options
    const startElement = listElementList[0]
    // 非递增样式返回固定值
    if (
      startElement.listType === ListType.UL ||
      startElement.listStyle === ListStyle.DISC ||
      startElement.listStyle === ListStyle.CIRCLE ||
      startElement.listStyle === ListStyle.SQUARE ||
      startElement.listStyle === ListStyle.CHECKBOX
    ) {
      if (startElement.listStyle === ListStyle.CHECKBOX) {
        return (checkbox.width + this.LIST_GAP) * scale
      }
      return this.UN_COUNT_STYLE_WIDTH * scale
    }
    // 计算列表数量
    const count = listElementList.reduce((pre, cur) => {
      if (cur.value === ZERO && !cur.listWrap) {
        pre += 1
      }
      return pre
    }, 0)
    if (!count) return 0
    ctx.save()
    ctx.font = this.getListFontStyle(listElementList, scale)
    // 以递增样式最大宽度为准
    const sampleMarker = formatOrderedListMarker(
      count - 1,
      startElement.listStyle
    )
    const minDecimalText = `${this.MEASURE_BASE_TEXT.repeat(
      String(count).length - 1 || 1
    )}${KeyMap.PERIOD}`
    const text =
      sampleMarker.length > minDecimalText.length
        ? sampleMarker
        : minDecimalText
    const textMetrics = ctx.measureText(text)
    ctx.restore()
    return Math.ceil((textMetrics.width + this.LIST_GAP) * scale)
  }

  public drawListStyle(
    ctx: CanvasRenderingContext2D,
    row: IRow,
    position: IElementPosition
  ) {
    const { elementList, offsetX, listIndex, ascent } = row
    const startElement = elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    // tab width
    let tabWidth = 0
    const { defaultTabWidth, scale } = this.options
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element?.type !== ElementType.TAB) break
      tabWidth += defaultTabWidth * scale
    }
    // 列表样式渲染
    const {
      coordinate: {
        leftTop: [startX, startY]
      }
    } = position
    const indentWidth =
      (startElement.listLevel
        ? this.LIST_INDENT_WIDTH * startElement.listLevel * scale
        : 0) + (row.chiMucIndent || 0)
    const x = startX - offsetX! + indentWidth + tabWidth
    const y = startY + ascent
    // 复选框样式特殊处理
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const { width, height, gap } = this.options.checkbox
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: height * scale
        }
      }
      this.draw.getCheckboxParticle().render({
        ctx,
        x: x - gap * scale,
        y,
        index: 0,
        row: {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        }
      })
    } else {
      let text = ''
      if (startElement.listType === ListType.UL) {
        const level = startElement.listLevel ?? 0
        const rotation = [UlStyle.DISC, UlStyle.CIRCLE, UlStyle.SQUARE]
        const rotated = rotation[level % rotation.length]
        const fallbackStyle =
          level === 0
            ? <UlStyle>(<unknown>startElement.listStyle) || UlStyle.DISC
            : rotated
        text = ulStyleMapping[fallbackStyle] || ulStyleMapping[UlStyle.DISC]
      } else {
        text = formatOrderedListMarker(listIndex!, startElement.listStyle)
      }
      if (!text) return
      ctx.save()
      ctx.font = this.getListFontStyle(elementList, scale)
      ctx.fillText(text, x, y)
      ctx.restore()
    }
  }
}
