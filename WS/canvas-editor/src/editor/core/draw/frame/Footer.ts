import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { EditorZone, PaperDirection } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { Position } from '../../position/Position'
import { Zone } from '../../zone/Zone'
import { Draw } from '../Draw'

export class Footer {
  private draw: Draw
  private position: Position
  private zone: Zone
  private options: DeepRequired<IEditorOption>

  private elementList: IElement[]
  private layoutMap: Map<PaperDirection, [IRow[], IElementPosition[]]>

  constructor(draw: Draw, data?: IElement[]) {
    this.draw = draw
    this.position = draw.getPosition()
    this.zone = draw.getZone()
    this.options = draw.getOptions()

    this.elementList = data || []
    this.layoutMap = new Map()
  }

  public getRowList(): IRow[] {
    return this._getLayoutByDirection(this.options.paperDirection)[0]
  }

  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  public getElementList(): IElement[] {
    return this.elementList
  }

  public getPositionList(
    direction = this.options.paperDirection
  ): IElementPosition[] {
    return this._getLayoutByDirection(direction)[1]
  }

  public compute() {
    this.recovery()
    // 主方向立即计算，其余方向按需懒计算
    this._getLayoutByDirection(this.options.paperDirection)
  }

  public recovery() {
    this.layoutMap.clear()
  }

  private _getLayoutByDirection(
    direction: PaperDirection
  ): [IRow[], IElementPosition[]] {
    let layout = this.layoutMap.get(direction)
    if (!layout) {
      const rowList = this._computeRowList(direction)
      // 先登记 rowList，避免位置计算中的高度查询递归触发重复布局
      layout = [rowList, []]
      this.layoutMap.set(direction, layout)
      layout[1] = this._computePositionList(direction, rowList)
    }
    return layout
  }

  private _computeRowList(direction: PaperDirection): IRow[] {
    const innerWidth = this.draw.getInnerWidth(direction)
    return this.draw.computeRowList({
      innerWidth,
      elementList: this.elementList
    })
  }

  private _computePositionList(
    direction: PaperDirection,
    rowList: IRow[]
  ): IElementPosition[] {
    const footerBottom = this.getFooterBottom()
    const innerWidth = this.draw.getInnerWidth(direction)
    const margins = this.draw.getMargins(direction)
    const startX = margins[3]
    // 页面高度 - 页脚顶部距离页面底部高度
    const pageHeight = this.draw.getHeight(direction)
    const footerHeight = this.getHeight(undefined, direction)
    const startY = pageHeight - footerBottom - footerHeight
    const positionList: IElementPosition[] = []
    this.position.computePageRowPosition({
      positionList,
      rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.FOOTER
    })
    return positionList
  }

  public getFooterBottom(pageNo?: number): number {
    if (this.isDisabled(pageNo)) return 0
    const {
      footer: { bottom },
      scale
    } = this.options
    return Math.floor(bottom * scale)
  }

  public getMaxHeight(direction?: PaperDirection): number {
    const {
      footer: { maxHeightRadio }
    } = this.options
    const height = this.draw.getHeight(direction)
    return Math.floor(height * maxHeightRadioMapping[maxHeightRadio])
  }

  public getHeight(pageNo?: number, direction?: PaperDirection): number {
    if (this.isDisabled(pageNo)) return 0
    const curDirection = this._resolveDirection(pageNo, direction)
    const maxHeight = this.getMaxHeight(curDirection)
    const rowHeight = this.getRowHeight(curDirection)
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(direction = this.options.paperDirection): number {
    return this._getLayoutByDirection(direction)[0].reduce(
      (pre, cur) => pre + cur.height,
      0
    )
  }

  public getExtraHeight(pageNo?: number, direction?: PaperDirection): number {
    const curDirection = this._resolveDirection(pageNo, direction)
    // 页脚下边距 + 实际高 - 页面下边距
    const margins = this.draw.getMargins(curDirection)
    const footerHeight = this.getHeight(pageNo, curDirection)
    const footerBottom = this.getFooterBottom(pageNo)
    const extraHeight = footerBottom + footerHeight - margins[2]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  private _resolveDirection(
    pageNo?: number,
    direction?: PaperDirection
  ): PaperDirection {
    return (
      direction ??
      (pageNo !== undefined
        ? this.draw.getPageDirection(pageNo)
        : this.options.paperDirection)
    )
  }

  public isDisabled(pageNo?: number): boolean {
    if (this.options.footer.disabled) return true
    if (
      pageNo !== undefined &&
      this.options.footer.disabledPages.includes(pageNo)
    ) {
      return true
    }
    return false
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    if (this.options.footer.disabledPages.includes(pageNo)) return
    ctx.save()
    ctx.globalAlpha = this.zone.isFooterActive()
      ? 1
      : this.options.footer.inactiveAlpha
    const direction = this.draw.getPageDirection(pageNo)
    const innerWidth = this.draw.getInnerWidth(direction)
    const maxHeight = this.getMaxHeight(direction)
    // 超出最大高度不渲染
    const [allRowList, positionList] = this._getLayoutByDirection(direction)
    const rowList: IRow[] = []
    let curRowHeight = 0
    for (let r = 0; r < allRowList.length; r++) {
      const row = allRowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }

    // Tự động thay thế số trang động (Trang 1, Trang 2, Trang 3...) theo từng trang thực tế
    const currentPageStr = String(pageNo + 1)
    const pageCountStr = String(this.draw.getPageCount())

    // Lấy thông tin metadata từ form cha nếu có
    let pCode = ''
    let pDate = ''
    let pVer = ''
    try {
      const pForm =
        (typeof window !== 'undefined' && ((window.parent as any)?.__ISO_FORM_DATA__ || (window as any)?.__ISO_FORM_DATA__)) || null
      if (pForm) {
        pCode = (pForm.new_code || pForm.code || '').trim()
        pDate = (pForm.issue_date || '').trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(pDate)) {
          pDate = pDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
        }
        pVer = (pForm.version || '').trim()
      }
    } catch (_) {}

    const replacePageInElementList = (
      elements: IElement[],
      pageNumber: number,
      totalPages: number
    ): IElement[] => {
      if (!elements || elements.length === 0) return elements
      const newElements = elements.map(el => ({ ...el }))
      const fullText = newElements.map(el => el.value || '').join('')

      // Khớp dạng "Trang 1", "Trang 1 / 3", "Page 1", v.v.
      const regex = /((?:Trang|Page)\s*)(\d+)(\s*(?:\/|-)\s*(\d+))?/gi
      let match: RegExpExecArray | null

      while ((match = regex.exec(fullText)) !== null) {
        const prefixLen = match[1].length
        const pageDigitStart = match.index + prefixLen
        const pageDigitEnd = pageDigitStart + match[2].length

        let curOffset = 0
        let replacedPage = false

        for (let i = 0; i < newElements.length; i++) {
          const el = newElements[i]
          const val = el.value || ''
          const elStart = curOffset
          const elEnd = curOffset + val.length
          curOffset = elEnd

          // Kiểm tra chồng lấn với dải chữ số trang
          if (elEnd > pageDigitStart && elStart < pageDigitEnd) {
            const prefixPart =
              elStart < pageDigitStart
                ? val.slice(0, pageDigitStart - elStart)
                : ''
            const suffixPart =
              elEnd > pageDigitEnd ? val.slice(pageDigitEnd - elStart) : ''
            if (!replacedPage) {
              el.value = prefixPart + String(pageNumber) + suffixPart
              replacedPage = true
            } else {
              el.value = suffixPart
            }
          }
        }
      }

      // Khớp các biến mẫu {pageNo} và {pageCount} nếu có
      for (const el of newElements) {
        if (el.value) {
          if (el.value.includes('{pageNo}')) {
            el.value = el.value.replace(/\{pageNo\}/g, String(pageNumber))
          }
          if (el.value.includes('{pageCount}')) {
            el.value = el.value.replace(/\{pageCount\}/g, String(totalPages))
          }
        }
      }

      return newElements
    }

    const pageNum = pageNo + 1
    const totalPages = this.draw.getPageCount()

    const dynamicRowList: IRow[] = rowList.map(row => ({
      ...row,
      elementList: replacePageInElementList(row.elementList, pageNum, totalPages)
    }))
    const dynamicElementList = replacePageInElementList(
      this.elementList,
      pageNum,
      totalPages
    )

    this.draw.drawRow(ctx, {
      elementList: dynamicElementList,
      positionList,
      rowList: dynamicRowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.FOOTER
    })
    ctx.restore()
  }
}
