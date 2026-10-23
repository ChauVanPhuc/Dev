import { commentList, data, mockData, options } from './mock'
import './style.css'
import prism from 'prismjs'
import Editor, {
  BlockType,
  Command,
  ControlState,
  ControlType,
  EditorMode,
  EditorZone,
  ElementType,
  IBlock,
  ICatalogItem,
  IElement,
  KeyMap,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel,
  splitText
} from './editor'
import { Dialog } from './components/dialog/Dialog'
import { formatPrismToken } from './utils/prism'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick, scrollIntoView } from './utils'

import docxPlugin from '@hufe921/canvas-editor-plugin-docx'
import { autoDetectHeadings } from './utils/headingDetector'
import { SettingsModal } from './components/settings/SettingsModal'

window.onload = function () {
  const isApple =
    typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)
  let updateCatalogRef: (() => Promise<void>) | null = null

  // Hàm định dạng logo trang bìa luôn nằm lọt trong khung (Cell 0,0) và căn giữa ngang + dọc
  function formatCoverLogoCell(t0: any): boolean {
    if (!t0?.trList?.[0]?.tdList?.[0]) return false
    const r0 = t0.trList[0]
    r0.height = 75
    r0.minHeight = 75

    const c00 = r0.tdList[0]
    c00.verticalAlign = 'middle' as any
    c00.height = 75
    c00.realHeight = 75
    c00.realMinHeight = 75

    if (r0.tdList[1]) {
      r0.tdList[1].verticalAlign = 'middle' as any
      r0.tdList[1].height = 75
      r0.tdList[1].realHeight = 75
      r0.tdList[1].realMinHeight = 75
    }

    if (!c00.value || !Array.isArray(c00.value)) return false

    let imgItem: any = null
    for (const it of c00.value) {
      if (it.type === 'image') {
        imgItem = it
        break
      }
    }

    if (imgItem) {
      // 1. Xóa bỏ hoàn toàn chế độ ảnh nổi (float) - nguyên nhân làm logo bị dính góc (0,0) và đè viền
      delete imgItem.imgDisplay
      delete imgItem.imgFloatPosition
      delete imgItem.translateX
      delete imgItem.left
      imgItem.rowFlex = 'center' as any
      imgItem.disabled = true

      // 2. Chuẩn hóa kích thước logo để nằm lọt gọn gàng trong khung (140 x 75)
      const origW = Number(imgItem.width) || 80
      const origH = Number(imgItem.height) || 80
      const maxW = 100
      const maxH = 50
      let targetW = origW
      let targetH = origH

      if (targetH > maxH) {
        targetW = Math.round(targetW * (maxH / targetH))
        targetH = maxH
      }
      if (targetW > maxW) {
        targetH = Math.round(targetH * (maxW / targetW))
        targetW = maxW
      }
      imgItem.width = targetW
      imgItem.height = targetH

      // 3. Giữ duy nhất logo trong ô, căn giữa 100%
      c00.value = [imgItem]
      return true
    }
    return false
  }

  // Xây dựng Bảng thông tin nhỏ 4 dòng chuẩn ảnh 4 (Viền nét đứt, cỡ chữ 13, căn giữa)
  function buildCoverMetadataNestedTable(meta: {
    code?: string
    version?: string
    issueDate?: string
    deptName?: string
  }) {
    const codeVal = (meta.code || '').trim() || '[mã hiệu]'
    const verVal = (meta.version || '').trim() || '[lần ban hành]'
    let dateVal = (meta.issueDate || '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      dateVal = dateVal.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
    }
    if (!dateVal) dateVal = '[ngày ban hành]'
    const deptVal = (meta.deptName || '').trim() || '[phòng ban/ bộ phận]'

    return {
      type: 'table',
      id: 'iso-metadata-nested-table',
      rowFlex: 'center' as any,
      tableFlex: 'center',
      noSplit: true,
      borderType: 'dash' as any,
      borderColor: '#94A3B8',
      borderWidth: 1,
      colgroup: [
        { width: 175 },
        { width: 225 }
      ],
      trList: [
        {
          height: 28,
          minHeight: 28,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              width: 175,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: 'Mã hiệu:', size: 13, font: 'Times New Roman' }]
            },
            {
              colspan: 1,
              rowspan: 1,
              width: 225,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: codeVal, size: 13, font: 'Times New Roman', bold: codeVal !== '[mã hiệu]' }]
            }
          ]
        },
        {
          height: 28,
          minHeight: 28,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              width: 175,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: 'Lần ban hành :', size: 13, font: 'Times New Roman' }]
            },
            {
              colspan: 1,
              rowspan: 1,
              width: 225,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: verVal, size: 13, font: 'Times New Roman' }]
            }
          ]
        },
        {
          height: 28,
          minHeight: 28,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              width: 175,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: 'Ngày ban hành :', size: 13, font: 'Times New Roman' }]
            },
            {
              colspan: 1,
              rowspan: 1,
              width: 225,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: dateVal, size: 13, font: 'Times New Roman' }]
            }
          ]
        },
        {
          height: 28,
          minHeight: 28,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              width: 175,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: 'Bộ phận thực hiện:', size: 13, font: 'Times New Roman' }]
            },
            {
              colspan: 1,
              rowspan: 1,
              width: 225,
              height: 28,
              realHeight: 28,
              realMinHeight: 28,
              verticalAlign: 'middle' as any,
              value: [{ value: deptVal, size: 13, font: 'Times New Roman' }]
            }
          ]
        }
      ]
    }
  }

  // Định dạng và đồng bộ toàn diện Table 0 (Trang 1 - Bìa) chuẩn 100% bố cục ảnh 4, xóa sạch dữ liệu cứng
  function formatAndSyncCoverTable(
    el: any,
    meta: {
      title?: string
      code?: string
      version?: string
      issueDate?: string
      deptName?: string
      issuer?: string
      approver?: string
    } = {}
  ): boolean {
    if (!el || el.type !== 'table' || !el.trList) return false
    el.noSplit = true
    ;(el as any).id = 'iso-cover-table'
    el.rowMargin = 0

    // 0. Căn giữa logo ô (0, 0)
    formatCoverLogoCell(el)

    // 1. Ô Header (0, 1): "CÔNG TY CỔ PHẦN VINA G7"
    if (el.trList[0]?.tdList?.[1]) {
      const c01 = el.trList[0].tdList[1]
      c01.verticalAlign = 'middle' as any
      c01.value = [
        {
          value: 'CÔNG TY CỔ PHẦN VINA G7',
          size: 16,
          bold: true,
          font: 'Times New Roman',
          rowFlex: 'center' as any
        }
      ]
    }

    // 2. Lấy thông tin từ form cha
    let pForm: any = null
    try {
      pForm = (window.parent as any)?.__ISO_FORM_DATA__ || (window.parent as any)?.formData
    } catch (_) {}

    const effTitle = (meta.title || '').trim().toUpperCase() || (pForm?.name || pForm?.title || '').trim().toUpperCase() || '[Tên quy trình]'
    const effCode = (meta.code || '').trim() || (pForm?.new_code || pForm?.code || '').trim()
    const effVersion = (meta.version || '').trim() || (pForm?.version || '').trim()
    const effIssueDate = (meta.issueDate || '').trim() || (pForm?.issue_date || '').trim()
    const effDept = (meta.deptName || '').trim() || (pForm?.folder || pForm?.department_name || '').trim()
    const effIssuer = (meta.issuer || '').trim() || (pForm?.issuer || pForm?.editor || pForm?.owner || '').trim()
    const effApprover = (meta.approver || '').trim() || (pForm?.approver || '').trim()

    // 3. Ô thân bìa (Row 1, Cell 0): Tiêu đề + Bảng thông tin nhỏ 4 dòng nét đứt
    if (el.trList[1]?.tdList?.[0]) {
      const c10 = el.trList[1].tdList[0]
      const nestedTbl = buildCoverMetadataNestedTable({
        code: effCode,
        version: effVersion,
        issueDate: effIssueDate,
        deptName: effDept
      })

      const newValues: any[] = []
      // Đệm trên tiêu đề (gọn gàng, thanh thoát)
      for (let k = 0; k < 2; k++) {
        newValues.push({ value: '\n', size: 16, rowFlex: 'center' as any, disabled: true })
      }
      // Tiêu đề quy trình
      newValues.push({
        value: effTitle,
        size: 19,
        bold: true,
        rowFlex: 'center' as any,
        font: 'Times New Roman',
        titleId: 'iso-title-cover-page',
        disabled: true
      })
      // Khoảng cách an toàn giữa tiêu đề và bảng thông tin
      for (let k = 0; k < 3; k++) {
        newValues.push({ value: '\n', size: 16, rowFlex: 'center' as any, disabled: true })
      }
      // Bảng thông tin nhỏ 4 dòng nét đứt
      newValues.push(nestedTbl)
      // Đệm dưới
      newValues.push({ value: '\n', size: 12, rowFlex: 'center' as any, disabled: true })

      c10.value = newValues
      c10.verticalAlign = 'top' as any
      // Chiều cao chuẩn xác 550px để toàn bộ Trang bìa (Table 0) nằm gọn 100% trong Trang 1, tuyệt đối không tràn sang Trang 2
      const targetTr1Height = 550
      c10.height = targetTr1Height
      c10.realHeight = targetTr1Height
      c10.realMinHeight = targetTr1Height
      el.trList[1].height = targetTr1Height
      el.trList[1].minHeight = targetTr1Height
    }

    // 4. Bảng phân công trách nhiệm (Rows 2, 3, 4) - Xóa triệt để tên cứng cũ
    if (el.trList[2]) {
      el.trList[2].height = 30
      el.trList[2].minHeight = 30
      const headers = ['TRÁCH NHIỆM', 'HỌ TÊN', 'CHỨC VỤ', 'KÝ TÊN']
      for (let c = 0; c < 4 && c < (el.trList[2].tdList || []).length; c++) {
        const td = el.trList[2].tdList[c]
        td.verticalAlign = 'middle' as any
        td.value = [
          { value: headers[c], size: 12, bold: true, font: 'Times New Roman', rowFlex: 'center' as any }
        ]
      }
    }

    if (el.trList[3]) {
      el.trList[3].height = 38
      el.trList[3].minHeight = 38
      const tds = el.trList[3].tdList || []
      if (tds[0]) {
        tds[0].verticalAlign = 'middle' as any
        tds[0].value = [{ value: 'Biên soạn', size: 12, font: 'Times New Roman', rowFlex: 'center' as any }]
      }
      if (tds[1]) {
        tds[1].verticalAlign = 'middle' as any
        const issVal = effIssuer || '[Họ tên người biên soạn]'
        tds[1].value = [{ value: issVal, size: 12, font: 'Times New Roman', rowFlex: 'center' as any, bold: !!effIssuer }]
      }
      if (tds[2]) {
        tds[2].verticalAlign = 'middle' as any
        const posVal = effIssuer ? (pForm?.issuer_role || 'Nhân viên') : '[CV NBS]'
        tds[2].value = [{ value: posVal, size: 12, font: 'Times New Roman', rowFlex: 'center' as any }]
      }
      if (tds[3]) {
        tds[3].verticalAlign = 'middle' as any
        tds[3].value = [{ value: '', size: 12, rowFlex: 'center' as any }]
      }
    }

    if (el.trList[4]) {
      el.trList[4].height = 38
      el.trList[4].minHeight = 38
      const tds = el.trList[4].tdList || []
      if (tds[0]) {
        tds[0].verticalAlign = 'middle' as any
        tds[0].value = [{ value: 'Phê duyệt', size: 12, font: 'Times New Roman', rowFlex: 'center' as any }]
      }
      if (tds[1]) {
        tds[1].verticalAlign = 'middle' as any
        const appVal = effApprover || '[Họ tên người phê duyệt]'
        tds[1].value = [{ value: appVal, size: 12, font: 'Times New Roman', rowFlex: 'center' as any, bold: !!effApprover }]
      }
      if (tds[2]) {
        tds[2].verticalAlign = 'middle' as any
        const posVal = effApprover ? (pForm?.approver_role || 'Trưởng phòng / BGĐ') : '[CV NPD]'
        tds[2].value = [{ value: posVal, size: 12, font: 'Times New Roman', rowFlex: 'center' as any }]
      }
      if (tds[3]) {
        tds[3].verticalAlign = 'middle' as any
        tds[3].value = [{ value: '', size: 12, rowFlex: 'center' as any }]
      }
    }

    if (el.colgroup) {
      if (el.colgroup.length === 5) {
        el.colgroup[0].width = 45
        el.colgroup[1].width = 55 // Tổng 100px cho TRÁCH NHIỆM
        el.colgroup[2].width = 175 // HỌ TÊN
        el.colgroup[3].width = 145 // CHỨC VỤ
        el.colgroup[4].width = 175 // KÝ TÊN (tăng rộng ra)
      } else if (el.colgroup.length >= 4) {
        el.colgroup[0].width = 100 // TRÁCH NHIỆM (nhỏ lại từ 130 xuống 100px)
        el.colgroup[1].width = 175 // HỌ TÊN
        el.colgroup[2].width = 145 // CHỨC VỤ
        el.colgroup[3].width = 175 // KÝ TÊN (dài ra thêm từ 135 lên 175px)
      }
    }

    // 5. Khóa toàn bộ các ô để không cho gõ bậy làm lệch khung
    for (const tr of el.trList) {
      for (const td of tr.tdList || []) {
        td.disabled = true
        td.deletable = false
        for (const inner of td.value || []) {
          inner.disabled = true
          inner.deletable = false
          if (inner.type === 'table' && inner.trList) {
            inner.disabled = true
            inner.deletable = false
            for (const ntr of inner.trList) {
              for (const ntd of ntr.tdList || []) {
                ntd.disabled = true
                ntd.deletable = false
                for (const nEl of ntd.value || []) {
                  nEl.disabled = true
                  nEl.deletable = false
                }
              }
            }
          }
        }
      }
    }

    return true
  }

  // Chuẩn hóa Table 1 (Trang 2 - Nhật ký sửa đổi): Giới hạn tối đa 10 hàng để TUYỆT ĐỐI KHÔNG tràn sang trang 3
  function formatTable1Revision(t1: any): boolean {
    if (!t1 || t1.type !== 'table' || !t1.trList) return false
    t1.noSplit = true
    t1.rowMargin = 0

    // Giới hạn tối đa 10 hàng (1 tiêu đề + 9 hàng dữ liệu) để luôn nằm vừa khít trong Trang 2
    while (t1.trList.length > 10) {
      t1.trList.pop()
    }

    if (t1.colgroup && t1.colgroup.length >= 4) {
      const totalW = t1.colgroup.reduce((sum: number, c: any) => sum + (c.width || 0), 0)
      t1.colgroup[0].width = 55 // Số TT
      t1.colgroup[1].width = 120 // Ngày Sửa
      t1.colgroup[3].width = 90 // Trang Số
      t1.colgroup[2].width = Math.max(260, totalW - 55 - 120 - 90) // Nội Dung
    }

    for (let r = 0; r < t1.trList.length; r++) {
      const tr = t1.trList[r]
      const targetH = r === 0 ? 38 : 34
      tr.height = targetH
      tr.minHeight = targetH
      for (let d = 0; d < (tr.tdList || []).length; d++) {
        const td = tr.tdList[d]
        td.disabled = true
        td.deletable = false
        td.hint = 'Bảng lịch sử sửa đổi được hệ thống tạo tự động'
        td.verticalAlign = 'middle' as any
        td.height = targetH
        td.realHeight = targetH
        td.realMinHeight = targetH

        if (r === 0) {
          for (const innerEl of td.value || []) {
            innerEl.bold = true
            innerEl.size = 12
            innerEl.font = 'Times New Roman'
            innerEl.rowFlex = 'center' as any
          }
        } else {
          if (d === 0 || d === 1 || d === 3) {
            for (const innerEl of td.value || []) {
              innerEl.rowFlex = 'center' as any
              innerEl.size = 12
              innerEl.font = 'Times New Roman'
              if (d === 1 && innerEl.value && /^\d{4}-\d{2}-\d{2}$/.test(innerEl.value.trim())) {
                innerEl.value = innerEl.value.trim().replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
              }
            }
          } else if (d === 2) {
            for (const innerEl of td.value || []) {
              innerEl.rowFlex = 'left' as any
              innerEl.size = 12
              innerEl.font = 'Times New Roman'
            }
          }
        }
      }
    }
    return true
  }

  // Hàm bảo đảm tuyệt đối: Trang 1 và 2 luôn bị khóa (không thể sửa/xóa/gõ), luôn có PageBreak ngăn cách, và mặc định luôn có Trang 3
  function lockAndEnsureThreePages(mainList: any[]): boolean {
    if (!Array.isArray(mainList) || mainList.length === 0) return false
    let modified = false
    let tblCount = 0
    let t0: any = null
    let t1: any = null
    let t0Idx = -1
    let t1Idx = -1

    for (let i = 0; i < mainList.length; i++) {
      const el = mainList[i]
      if (el.type === 'table') {
        tblCount++
        if (tblCount === 1) {
          t0 = el
          t0Idx = i
        } else if (tblCount === 2) {
          t1 = el
          t1Idx = i
        }
      }
    }

    // 1. Khóa toàn diện Table 0 (Trang bìa - Trang 1)
    if (t0 && t0.trList) {
      formatAndSyncCoverTable(t0)
      modified = true
    }

    // 2. Khóa PageBreak sau Table 0 và Tiêu đề theo dõi sửa đổi trước Table 1
    // Đảm bảo TUYỆT ĐỐI chỉ có đúng 1 pageBreak giữa Table 0 và Table 1 (không có trang trắng/dư thừa)
    if (t0Idx !== -1 && t1Idx !== -1) {
      // Tìm tiêu đề theo dõi sửa đổi hiện có nếu có
      let headingItem: any = null
      for (let i = t0Idx + 1; i < t1Idx; i++) {
        const item = mainList[i]
        if (item?.titleId === 'iso-title-rev-log' || (item?.value && item.value.includes('THEO DÕI SỬA ĐỔI'))) {
          headingItem = item
          break
        }
      }

      if (!headingItem) {
        headingItem = {
          value: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU\n',
          size: 16,
          bold: true,
          rowFlex: 'center' as any,
          disabled: true,
          deletable: false
        }
      } else {
        headingItem.disabled = true
        headingItem.deletable = false
        headingItem.rowFlex = 'center' as any
        delete headingItem.titleId
        delete headingItem.level
      }

      // Xóa sạch mọi phần tử rác/pageBreak thừa giữa Table 0 và Table 1, chỉ giữ đúng [pageBreak, headingItem, newline nhỏ]
      const itemsBetween = [
        { type: ElementType.PAGE_BREAK as any, value: '', disabled: true, deletable: false },
        headingItem,
        { value: '\n', size: 6, disabled: true, deletable: false }
      ]
      mainList.splice(t0Idx + 1, t1Idx - (t0Idx + 1), ...itemsBetween)
      modified = true
      t1Idx = mainList.indexOf(t1)
    }

    // 3. Khóa toàn diện Table 1 (Bảng theo dõi sửa đổi - Trang 2, tối đa 10 hàng không bao giờ tràn)
    if (t1 && t1.trList) {
      formatTable1Revision(t1)
      modified = true
    }

    // 4. Đảm bảo luôn có PageBreak sau Table 1 và mặc định có Trang 3
    if (t1Idx !== -1) {
      if (mainList[t1Idx + 1]?.type !== ElementType.PAGE_BREAK) {
        mainList.splice(t1Idx + 1, 0, {
          type: ElementType.PAGE_BREAK as any,
          value: '',
          disabled: true,
          deletable: false
        })
        modified = true
      } else {
        mainList[t1Idx + 1].disabled = true
        mainList[t1Idx + 1].deletable = false
      }
      while (
        mainList[t1Idx + 1]?.type === ElementType.PAGE_BREAK &&
        mainList[t1Idx + 2]?.type === ElementType.PAGE_BREAK
      ) {
        mainList.splice(t1Idx + 2, 1)
        modified = true
      }

      // 5. Kiểm tra và bảo đảm mặc định có Trang 3 trống hoàn toàn cho người dùng soạn thảo
      const elementsAfterT1 = mainList.slice(t1Idx + 2)
      const isPlaceholderOnly =
        elementsAfterT1.length === 0 ||
        (elementsAfterT1.length <= 3 &&
          elementsAfterT1.every(
            (el: any) =>
              !el.value ||
              el.value.trim() === '' ||
              el.value.includes('1. MỤC ĐÍCH') ||
              el.value.includes('1.1.')
          ))

      if (isPlaceholderOnly) {
        mainList.splice(t1Idx + 2, mainList.length - (t1Idx + 2), {
          value: '\n',
          size: 14
        })
        modified = true
      }
    }

    return modified
  }

  // Hàm cập nhật footer metadata ăn theo form ISO (Mã hiệu, Ngày ban hành, Lần ban hành)
  function updateFooterMetadata(
    footerList: IElement[],
    meta: { code?: string; issueDate?: string; version?: string }
  ): boolean {
    if (!Array.isArray(footerList) || footerList.length === 0) return false

    let formattedDate = meta.issueDate || ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
      formattedDate = formattedDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
    }

    let changed = false

    // 1. Mã hiệu
    if (meta.code !== undefined) {
      const codeVal = meta.code || ''
      const maHieuIdx = footerList.findIndex(el => el.value && el.value.includes('Mã hiệu'))
      if (maHieuIdx !== -1) {
        const targetVal = `Mã hiệu: ${codeVal}`
        if (footerList[maHieuIdx].value !== targetVal) {
          footerList[maHieuIdx].value = targetVal
          changed = true
        }
        for (let i = maHieuIdx + 1; i < footerList.length; i++) {
          if (footerList[i].type === 'tab' || (footerList[i].value && footerList[i].value.includes('Ngày'))) {
            break
          }
          if (footerList[i].value && (footerList[i].value.includes('QTKS') || footerList[i].value.includes('-') || /^[A-Za-z0-9\._\-]+$/.test(footerList[i].value.trim()))) {
            footerList[i].value = ''
            changed = true
          }
        }
      }
    }

    // 2. Ngày ban hành
    if (formattedDate) {
      const ngayIdx = footerList.findIndex(el => el.value && (el.value.includes('Ngày ban hành') || el.value.trim() === 'Ngày'))
      if (ngayIdx !== -1) {
        const targetVal = `Ngày ban hành: ${formattedDate}`
        if (footerList[ngayIdx].value !== targetVal) {
          footerList[ngayIdx].value = targetVal
          changed = true
        }
        for (let i = ngayIdx + 1; i < footerList.length; i++) {
          if (footerList[i].value && footerList[i].value.includes('Lần ban hành')) {
            break
          }
          if (footerList[i].value && (footerList[i].value.includes('ban hành') || footerList[i].value.includes('/202') || /^\d{2}\/\d{2}\/\d{4}$/.test(footerList[i].value.trim()) || /^\d{2}$/.test(footerList[i].value.trim()))) {
            footerList[i].value = ''
            changed = true
          }
        }
      }
    }

    // 3. Lần ban hành
    if (meta.version !== undefined) {
      const verVal = meta.version || ''
      const lanIdx = footerList.findIndex(el => el.value && el.value.includes('Lần ban hành'))
      if (lanIdx !== -1) {
        const targetVal = `Lần ban hành: ${verVal}`
        if (footerList[lanIdx].value !== targetVal) {
          footerList[lanIdx].value = targetVal
          changed = true
        }
        for (let i = lanIdx + 1; i < footerList.length; i++) {
          if (footerList[i].type === 'tab' || (footerList[i].value && footerList[i].value.includes('Trang'))) {
            break
          }
          if (footerList[i].value && (footerList[i].value.includes(':') || /^\d+$/.test(footerList[i].value.trim()))) {
            footerList[i].value = ''
            changed = true
          }
        }
      }
    }

    return changed
  }


  // 1. Khởi tạo Editor
  const container = document.querySelector<HTMLDivElement>('.editor')!
  if (Array.isArray(data)) {
    lockAndEnsureThreePages(data)
  }
  const instance = new Editor(
    container,
    {
      header: [],
      main: <IElement[]>data,
      footer: []
    },
    options
  )

  // Đăng ký plugin xuất/nhập Word (.docx)
  instance.use(docxPlugin)

  // Bọc executeSetValue để mọi lần nạp dữ liệu đều khóa Trang 1 & 2 và đảm bảo Trang 3
  const originalSetValue = instance.command.executeSetValue
  if (typeof originalSetValue === 'function') {
    instance.command.executeSetValue = function (dataPayload: any) {
      try {
        const mainList = dataPayload?.main || (Array.isArray(dataPayload) ? dataPayload : null)
        if (mainList) {
          lockAndEnsureThreePages(mainList)
        }
      } catch (_) {}
      return originalSetValue.call(instance.command, dataPayload)
    }
  }

  // Bọc executeImportDocx để đảm bảo tương thích đa Realm (Cross-window Realm ArrayBuffer)
  // Tránh lỗi JSZip: Can't read the data of 'the loaded zip file'. Is it in a supported JavaScript type?
  const originalImportDocx = instance.command.executeImportDocx
  if (typeof originalImportDocx === 'function') {
    instance.command.executeImportDocx = async function (payload: any) {
      if (payload && payload.arrayBuffer) {
        const src = payload.arrayBuffer
        try {
          if (!(src instanceof ArrayBuffer)) {
            const byteLength = src.byteLength ?? src.size ?? (src.length || 0)
            const localBuffer = new ArrayBuffer(byteLength)
            new Uint8Array(localBuffer).set(new Uint8Array(src))
            payload.arrayBuffer = localBuffer
          }
        } catch (convErr) {
          console.warn('Lỗi chuyển đổi ArrayBuffer sang Realm nội bộ:', convErr)
        }
      }
      const res = await originalImportDocx.call(instance.command, payload)
      // Tự động căn giữa bảng nhỏ thông tin quy trình nếu nằm trong ô
      try {
        const curData = instance.command.getValue().data
        let updateCatalogTimer: any = null
        let tableIndex = 0
        let modified = false
        let pForm: any = null
        try {
          pForm = (window.parent as any)?.__ISO_FORM_DATA__ || (window.parent as any)?.formData
        } catch (_) {}
        const parentCode = (pForm?.new_code || pForm?.code || '').trim()
        const parentVersion = (pForm?.version || '').trim()
        const parentIssueDate = (pForm?.issue_date || '').trim()
        const scanElements = (elements: any[]) => {
          if (!elements) return
          for (const el of elements) {
            if (el.type === 'table' && el.trList) {
              const currentTblIdx = tableIndex++
              if (currentTblIdx === 0) {
                // Table 0 (Trang 1 - Bìa quy trình chuẩn 100% Ảnh 4)
                formatAndSyncCoverTable(el)
                modified = true
              } else if (currentTblIdx === 1) {
                // Table 1 (Trang 2 - Bảng theo dõi sửa đổi tối đa 10 hàng không bao giờ tràn)
                formatTable1Revision(el)
                modified = true
              }
            }
          }
        }
        scanElements(curData.main || [])

        // 5. Chuẩn hóa cấu trúc 3 trang chuẩn mực:
        // Trang 1: Table 0 (Trang bìa - cao 921px, neo sát mép lề dưới trang 1)
        // Trang 2: Tiêu đề sửa đổi + Table 1 (15 dòng chuẩn) + Ngắt trang
        // Trang 3: Vùng soạn thảo nội dung người dùng
        const originalMain = curData.main || []
        let t0: any = null
        let t1: any = null
        let revTitleItem: any = null
        const userElements: any[] = []
        let tblFound = 0

        for (let i = 0; i < originalMain.length; i++) {
          const item = originalMain[i]
          if (item.type === 'table') {
            tblFound++
            if (tblFound === 1) t0 = item
            else if (tblFound === 2) t1 = item
            else userElements.push(item)
          } else if (tblFound >= 2) {
            // Sau Table 1: gom nội dung người dùng (bỏ các pageBreak thừa bám sát Table 1)
            if (item.type !== 'pageBreak' || userElements.length > 0) {
              userElements.push(item)
            }
          } else if (tblFound === 1) {
            if (item.value && item.value.includes('THEO DÕI SỬA ĐỔI')) {
              revTitleItem = item
            }
          }
        }

        const headingEl = revTitleItem || {
          value: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU\n',
          size: 16,
          bold: true,
          rowFlex: 'center' as any
        }
        delete headingEl.titleId
        delete headingEl.level
        headingEl.bold = true
        headingEl.disabled = true
        headingEl.deletable = false
        headingEl.rowFlex = 'center' as any

        // Lắp ráp lại danh sách phần tử hoàn chỉnh:
        // Trang 1: Table 0 (Trang bìa đầy đủ các hàng)
        // Ngắt trang sang Trang 2
        // Trang 2: Tiêu đề theo dõi sửa đổi + Table 1 (Bảng lịch sử)
        // Ngắt trang sang Trang 3
        // Trang 3: Nội dung soạn thảo người dùng (mặc định luôn có ít nhất 1 trang 3)
        const cleanMain: any[] = []
        if (t0) {
          t0.disabled = true
          t0.deletable = false
          cleanMain.push(t0)
          cleanMain.push({ type: 'pageBreak', value: '', disabled: true, deletable: false })
        }
        cleanMain.push(headingEl)
        cleanMain.push({ value: '\n', size: 6, disabled: true, deletable: false })
        if (t1) {
          t1.disabled = true
          t1.deletable = false
          cleanMain.push(t1)
        }
        cleanMain.push({ type: 'pageBreak', value: '', disabled: true, deletable: false })

        const filteredUserElements = userElements.filter(
          el =>
            !el.value ||
            (!el.value.includes('1. MỤC ĐÍCH') &&
              !el.value.includes('1.1.') &&
              el.titleId !== 'iso-title-section-1')
        )
        // Loại bỏ các pageBreak thừa ở đầu nội dung người dùng tránh tạo thêm trang trắng
        while (
          filteredUserElements.length > 0 &&
          (filteredUserElements[0].type === 'pageBreak' || filteredUserElements[0].type === ElementType.PAGE_BREAK)
        ) {
          filteredUserElements.shift()
        }
        const hasUserContent = filteredUserElements.some(
          el => (el.value && el.value.trim().length > 0) || el.type === 'table' || el.type === 'image'
        )
        if (hasUserContent) {
          cleanMain.push(...filteredUserElements)
        } else {
          // Mặc định Trang 3 hoàn toàn trống rỗng cho người dùng soạn thảo
          cleanMain.push({
            value: '\n',
            size: 14
          })
        }

        lockAndEnsureThreePages(cleanMain)
        curData.main = cleanMain

        // Đồng bộ Footer metadata nếu có thông tin form từ parent
        if (pForm) {
          updateFooterMetadata(curData.footer || [], {
            code: parentCode,
            issueDate: parentIssueDate,
            version: parentVersion
          })
        }

        instance.command.executeSetValue(curData)
        try {
          autoDetectHeadings(instance, { force: true })
        } catch (_) {}

        // Tự động đặt con trỏ chuột vào vị trí bắt đầu soạn thảo tại Trang 3 (sau Bảng sửa đổi)
        setTimeout(() => {
          try {
            const latestData = instance.command.getValue().data
            let tblCount = 0
            let targetIdx = -1
            const mainList = latestData.main || []
            for (let i = 0; i < mainList.length; i++) {
              const el = mainList[i]
              if (el.type === 'table') {
                tblCount++
                continue
              }
              if (tblCount >= 2 && !el.disabled && el.type !== 'pageBreak') {
                targetIdx = i
                break
              }
            }
            if (targetIdx !== -1) {
              instance.command.executeSetRange(targetIdx, targetIdx)
            } else if (mainList.length > 0) {
              instance.command.executeSetRange(mainList.length - 1, mainList.length - 1)
            }
          } catch (_) {}
        }, 350)

        clearTimeout(updateCatalogTimer)
        updateCatalogTimer = setTimeout(() => {
          if (typeof updateCatalogRef === 'function') {
            updateCatalogRef()
          }
        }, 300)
      } catch (centerErr) {
        console.warn('Lỗi xử lý hậu import docx:', centerErr)
      }
      return res
    }
  }

  console.log('instance: ', instance)
  // cypress使用
  Reflect.set(window, 'editor', instance)
  // canvas-editor-devtools使用
  Reflect.set(window, '__CANVAS_EDITOR_INSTANCE__', instance)

  // Hàm cập nhật siêu tốc tiêu đề và metadata Trang bìa (không cần reload tài liệu)
  function updateCoverMetadata(meta: {
    title?: string
    code?: string
    version?: string
    issueDate?: string
    deptName?: string
    issuer?: string
    approver?: string
  }) {
    try {
      const curData = instance.command.getValue().data
      if (!curData || !curData.main) return
      let modified = false

      let t0: any = null
      let t1: any = null
      for (const el of curData.main) {
        if (el.type === 'table') {
          if (!t0) t0 = el
          else if (!t1) t1 = el
        }
      }

      if (t0) {
        formatAndSyncCoverTable(t0, meta)
        modified = true
      }
      if (t1) {
        formatTable1Revision(t1)
        modified = true
      }

      // Footer metadata
      if (meta.code !== undefined || meta.issueDate !== undefined || meta.version !== undefined) {
        if (!curData.footer || curData.footer.length === 0) {
          const codeVal = meta.code || ''
          let dStr = meta.issueDate || ''
          if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
            dStr = dStr.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')
          }
          const vStr = meta.version || ''
          curData.footer = [
            { value: `Mã hiệu: ${codeVal}`, font: 'Times New Roman', size: 13, italic: true },
            { value: '', type: 'tab' as any },
            { value: `Ngày ban hành: ${dStr}         Lần ban hành: ${vStr}`, font: 'Times New Roman', size: 13, italic: true },
            { value: '', type: 'tab' as any },
            { value: 'Trang 1', font: 'Times New Roman', size: 13, italic: true }
          ]
          modified = true
        } else {
          if (updateFooterMetadata(curData.footer, meta)) {
            modified = true
          }
        }

        try {
          const drawObj = (instance as any).draw
          const liveFooterList = drawObj?.getFooterElementList?.() || drawObj?.getFooter?.()?.getElementList?.()
          if (liveFooterList && liveFooterList.length > 0) {
            if (updateFooterMetadata(liveFooterList, meta)) {
              drawObj?.getFooter?.()?.compute?.()
            }
          }
        } catch (_) {}
      }

      if (lockAndEnsureThreePages(curData.main)) {
        modified = true
      }

      if (modified) {
        instance.command.executeSetValue(curData)
      }
    } catch (err) {
      console.warn('Lỗi updateCoverMetadata:', err)
    }
  }

  Reflect.set(window, '__updateCoverMetadata__', updateCoverMetadata)

  function insertOrUpdateFlowchartSvg(payload: {
    svgDataUrl: string
    width?: number
    height?: number
    stepCount?: number
  }) {
    if (!payload?.svgDataUrl) return
    try {
      const curData = instance.command.getValue().data
      const mainList = curData.main || []
      const w = payload.width || 640
      const h = payload.height || 450

      // 1. Kiểm tra xem trong tài liệu đã có ảnh flowchart cũ chưa
      let existingIndex = -1
      for (let i = 0; i < mainList.length; i++) {
        const el = mainList[i]
        if (el.type === 'image' && (el.id === 'iso-flowchart-svg' || (el as any).extension === 'iso-flowchart')) {
          existingIndex = i
          break
        }
      }

      // 2. Nếu chưa có ảnh SVG, kiểm tra xem có bảng table lưu đồ cũ (ví dụ bảng Word thô được import) không
      let existingTableIndex = -1
      if (existingIndex === -1) {
        for (let i = 0; i < mainList.length; i++) {
          const el = mainList[i]
          if (el.type === 'table' && (el as any).trList && (el as any).trList.length >= 2) {
            let tableText = ''
            for (const tr of (el as any).trList) {
              for (const td of (tr.tdList || [])) {
                for (const item of (td.value || [])) {
                  if (typeof item.value === 'string') {
                    tableText += ' ' + item.value
                  }
                }
              }
            }
            const low = tableText.toLowerCase()
            // Bảng lưu đồ có chứa "bước 1" và ("trách nhiệm" hoặc "lưu đồ" hoặc "bước 2" hoặc "phụ lục")
            if (low.includes('bước 1') && (low.includes('bước 2') || low.includes('trách nhiệm') || low.includes('lưu đồ') || low.includes('phụ lục'))) {
              existingTableIndex = i
              break
            }
          }
        }
      }

      const flowchartEl: IElement = {
        type: ElementType.IMAGE,
        value: payload.svgDataUrl,
        width: w,
        height: h,
        id: 'iso-flowchart-svg',
        extension: 'iso-flowchart' as any,
        rowFlex: RowFlex.CENTER
      }

      if (existingIndex !== -1) {
        mainList[existingIndex].value = payload.svgDataUrl
        mainList[existingIndex].width = w
        mainList[existingIndex].height = h
        instance.command.executeSetValue(curData)
      } else if (existingTableIndex !== -1) {
        // Thay thế trực tiếp bảng Word thô bằng ảnh SVG chuẩn vector ISO
        mainList.splice(existingTableIndex, 1, flowchartEl)
        instance.command.executeSetValue(curData)
      } else {
        let sec51Idx = -1
        for (let i = 0; i < mainList.length; i++) {
          const el = mainList[i]
          if (el.value && typeof el.value === 'string' && /5\.1|Sơ đồ lưu trình|Lưu trình|Lưu đồ|6\.\s*Nội dung|5\.\s*Nội dung|Bước 1/i.test(el.value)) {
            sec51Idx = i
            break
          }
        }

        if (sec51Idx !== -1) {
          mainList.splice(sec51Idx + 1, 0, { value: '\n' }, flowchartEl, { value: '\n\n' })
          instance.command.executeSetValue(curData)
        } else {
          instance.command.executeInsertElementList([
            { value: '\n' },
            flowchartEl,
            { value: '\n\n' }
          ])
        }
      }
    } catch (e) {
      console.warn('Lỗi chèn/cập nhật Flowchart SVG vào Canvas Editor:', e)
    }
  }

  Reflect.set(window, '__insertFlowchartSvg__', insertOrUpdateFlowchartSvg)

  // Lắng nghe nhấp đúp vào Sơ đồ để mở lại bảng thiết kế
  if (instance.listener) {
    const origImageDblclick = instance.listener.imageDblclick
    instance.listener.imageDblclick = payload => {
      if (payload.element?.id === 'iso-flowchart-svg' || (payload.element as any)?.extension === 'iso-flowchart') {
        try {
          if (typeof (window.parent as any).__openIsoFlowchartModal === 'function') {
            (window.parent as any).__openIsoFlowchartModal()
          } else if (typeof (window.top as any)?.__openIsoFlowchartModal === 'function') {
            (window.top as any).__openIsoFlowchartModal()
          } else {
            window.parent.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
            window.top?.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
          }
        } catch (_) {
          window.parent.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
        }
        return
      }
      if (origImageDblclick) origImageDblclick(payload)
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'UPDATE_COVER_METADATA' && event.data?.payload) {
      updateCoverMetadata(event.data.payload)
    }
    if (event.data?.type === 'INSERT_FLOWCHART_SVG' && event.data?.payload) {
      insertOrUpdateFlowchartSvg(event.data.payload)
    }
  })
  // Hàm tải dữ liệu mẫu khi cần xem lại bệnh án mẫu
  Reflect.set(window, 'loadSampleData', () => {
    instance.command.executeSetValue({
      header: [
        {
          value: 'BỆNH VIỆN ĐA KHOA TRUNG ƯƠNG',
          size: 32,
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\nBỆNH ÁN NGOẠI TRÚ',
          size: 18,
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\n',
          type: ElementType.SEPARATOR
        }
      ],
      main: mockData,
      footer: [
        {
          value: 'canvas-editor',
          size: 12
        }
      ]
    })
  })

  // 菜单弹窗销毁
  window.addEventListener(
    'click',
    evt => {
      const visibleDom = document.querySelector('.visible')
      if (!visibleDom || visibleDom.contains(<Node>evt.target)) return
      visibleDom.classList.remove('visible')
    },
    {
      capture: true
    }
  )

  // 2. | 撤销 | 重做 | 格式刷 | 清除格式 |
  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.title = `Hoàn tác(${isApple ? '⌘' : 'Ctrl'}+Z)`
  undoDom.onclick = function () {
    console.log('undo')
    instance.command.executeUndo()
  }

  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.title = `Làm lại(${isApple ? '⌘' : 'Ctrl'}+Y)`
  redoDom.onclick = function () {
    console.log('redo')
    instance.command.executeRedo()
  }

  const painterDom = document.querySelector<HTMLDivElement>(
    '.menu-item__painter'
  )!

  let isFirstClick = true
  let painterTimeout: number
  painterDom.onclick = function () {
    if (isFirstClick) {
      isFirstClick = false
      painterTimeout = window.setTimeout(() => {
        console.log('painter-click')
        isFirstClick = true
        instance.command.executePainter({
          isDblclick: false
        })
      }, 200)
    } else {
      window.clearTimeout(painterTimeout)
    }
  }

  painterDom.ondblclick = function () {
    console.log('painter-dblclick')
    isFirstClick = true
    window.clearTimeout(painterTimeout)
    instance.command.executePainter({
      isDblclick: true
    })
  }

  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick =
    function () {
      console.log('format')
      instance.command.executeFormat()
    }

  // 3. | 字体 | 字体变大 | 字体变小 | 加粗 | 斜体 | 下划线 | 删除线 | 上标 | 下标 | 字体颜色 | 背景色 |
  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = function () {
    console.log('font')
    fontOptionDom.classList.toggle('visible')
  }
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }

  const sizeSetDom = document.querySelector<HTMLDivElement>('.menu-item__size')!
  const sizeSelectDom = sizeSetDom.querySelector<HTMLDivElement>('.select')!
  const sizeOptionDom = sizeSetDom.querySelector<HTMLDivElement>('.options')!
  sizeSetDom.title = `Cỡ chữ`
  sizeSetDom.onclick = function () {
    console.log('size')
    sizeOptionDom.classList.toggle('visible')
  }
  sizeOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeSize(Number(li.dataset.size!))
  }

  const sizeAddDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-add'
  )!
  sizeAddDom.title = `Tăng cỡ chữ(${isApple ? '⌘' : 'Ctrl'}+[)`
  sizeAddDom.onclick = function () {
    console.log('size-add')
    instance.command.executeSizeAdd()
  }

  const sizeMinusDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-minus'
  )!
  sizeMinusDom.title = `Giảm cỡ chữ(${isApple ? '⌘' : 'Ctrl'}+])`
  sizeMinusDom.onclick = function () {
    console.log('size-minus')
    instance.command.executeSizeMinus()
  }

  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.title = `In đậm(${isApple ? '⌘' : 'Ctrl'}+B)`
  boldDom.onclick = function () {
    console.log('bold')
    instance.command.executeBold()
  }

  const italicDom =
    document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.title = `In nghiêng(${isApple ? '⌘' : 'Ctrl'}+I)`
  italicDom.onclick = function () {
    console.log('italic')
    instance.command.executeItalic()
  }

  const underlineDom = document.querySelector<HTMLDivElement>(
    '.menu-item__underline'
  )!
  underlineDom.title = `Gạch chân(${isApple ? '⌘' : 'Ctrl'}+U)`
  const underlineOptionDom =
    underlineDom.querySelector<HTMLDivElement>('.options')!
  underlineDom.querySelector<HTMLSpanElement>('.select')!.onclick =
    function () {
      underlineOptionDom.classList.toggle('visible')
    }
  underlineDom.querySelector<HTMLElement>('i')!.onclick = function () {
    console.log('underline')
    instance.command.executeUnderline()
    underlineOptionDom.classList.remove('visible')
  }
  underlineDom.querySelector<HTMLUListElement>('ul')!.onmousedown = function (
    evt
  ) {
    const li = evt.target as HTMLLIElement
    const decorationStyle = <TextDecorationStyle>li.dataset.decorationStyle
    instance.command.executeUnderline({
      style: decorationStyle
    })
    underlineOptionDom.classList.remove('visible')
  }

  const strikeoutDom = document.querySelector<HTMLDivElement>(
    '.menu-item__strikeout'
  )!
  strikeoutDom.onclick = function () {
    console.log('strikeout')
    instance.command.executeStrikeout()
  }

  const superscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__superscript'
  )!
  superscriptDom.title = `Chỉ số trên(${isApple ? '⌘' : 'Ctrl'}+Shift+,)`
  superscriptDom.onclick = function () {
    console.log('superscript')
    instance.command.executeSuperscript()
  }

  const subscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__subscript'
  )!
  subscriptDom.title = `Chỉ số dưới(${isApple ? '⌘' : 'Ctrl'}+Shift+.)`
  subscriptDom.onclick = function () {
    console.log('subscript')
    instance.command.executeSubscript()
  }

  const colorControlDom = document.querySelector<HTMLInputElement>('#color')!
  colorControlDom.oninput = function () {
    instance.command.executeColor(colorControlDom.value)
  }
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = function () {
    console.log('color')
    colorControlDom.click()
  }

  const highlightControlDom =
    document.querySelector<HTMLInputElement>('#highlight')!
  highlightControlDom.oninput = function () {
    instance.command.executeHighlight(highlightControlDom.value)
  }
  const highlightDom = document.querySelector<HTMLDivElement>(
    '.menu-item__highlight'
  )!
  const highlightSpanDom = highlightDom.querySelector('span')!
  highlightDom.onclick = function () {
    console.log('highlight')
    highlightControlDom?.click()
  }

  const titleDom = document.querySelector<HTMLDivElement>('.menu-item__title')!
  const titleSelectDom = titleDom.querySelector<HTMLDivElement>('.select')!
  const titleOptionDom = titleDom.querySelector<HTMLDivElement>('.options')!
  titleOptionDom.querySelectorAll('li').forEach((li, index) => {
    li.title = `Ctrl+${isApple ? 'Option' : 'Alt'}+${index}`
  })

  titleDom.onclick = function () {
    console.log('title')
    titleOptionDom.classList.toggle('visible')
  }
  titleOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const level = <TitleLevel>li.dataset.level
    instance.command.executeTitle(level || null)
  }

  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.title = `Căn trái(${isApple ? '⌘' : 'Ctrl'}+L)`
  leftDom.onclick = function () {
    console.log('left')
    instance.command.executeRowFlex(RowFlex.LEFT)
  }

  const centerDom =
    document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.title = `Căn giữa(${isApple ? '⌘' : 'Ctrl'}+E)`
  centerDom.onclick = function () {
    console.log('center')
    instance.command.executeRowFlex(RowFlex.CENTER)
  }

  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.title = `Căn phải(${isApple ? '⌘' : 'Ctrl'}+R)`
  rightDom.onclick = function () {
    console.log('right')
    instance.command.executeRowFlex(RowFlex.RIGHT)
  }

  const alignmentDom = document.querySelector<HTMLDivElement>(
    '.menu-item__alignment'
  )!
  alignmentDom.title = `Căn đều hai bên(${isApple ? '⌘' : 'Ctrl'}+J)`
  alignmentDom.onclick = function () {
    console.log('alignment')
    instance.command.executeRowFlex(RowFlex.ALIGNMENT)
  }

  const justifyDom = document.querySelector<HTMLDivElement>(
    '.menu-item__justify'
  )!
  justifyDom.title = `Căn đều dàn dòng(${isApple ? '⌘' : 'Ctrl'}+Shift+J)`
  justifyDom.onclick = function () {
    console.log('justify')
    instance.command.executeRowFlex(RowFlex.JUSTIFY)
  }

  const rowMarginDom = document.querySelector<HTMLDivElement>(
    '.menu-item__row-margin'
  )!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = function () {
    console.log('row-margin')
    rowOptionDom.classList.toggle('visible')
  }
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }

  const spacingDom = document.querySelector<HTMLDivElement>(
    '.menu-item__spacing'
  )!
  const spacingIconDom = spacingDom.querySelector<HTMLElement>('i')!
  const spacingOptionDom =
    spacingDom.querySelector<HTMLDivElement>('.options')!
  const spacingBeforeInputDom =
    spacingOptionDom.querySelector<HTMLInputElement>(
      '[data-spacingbefore-input]'
    )!
  const spacingAfterInputDom =
    spacingOptionDom.querySelector<HTMLInputElement>(
      '[data-spacingafter-input]'
    )!
  spacingIconDom.onclick = function () {
    console.log('spacing')
    spacingOptionDom.classList.toggle('visible')
  }
  spacingOptionDom.onclick = function (evt) {
    evt.stopPropagation()
  }
  const changeSpacingBefore = (value: number) => {
    const spacing = Math.max(0, Math.round(value) || 0)
    spacingBeforeInputDom.value = `${spacing}`
    instance.command.executeSpacingBefore(spacing)
  }
  const changeSpacingAfter = (value: number) => {
    const spacing = Math.max(0, Math.round(value) || 0)
    spacingAfterInputDom.value = `${spacing}`
    instance.command.executeSpacingAfter(spacing)
  }
  spacingOptionDom.querySelector<HTMLButtonElement>(
    '[data-spacingbefore-decrease]'
  )!.onclick = () => changeSpacingBefore(Number(spacingBeforeInputDom.value) - 6)
  spacingOptionDom.querySelector<HTMLButtonElement>(
    '[data-spacingbefore-increase]'
  )!.onclick = () => changeSpacingBefore(Number(spacingBeforeInputDom.value) + 6)
  spacingOptionDom.querySelector<HTMLButtonElement>(
    '[data-spacingafter-decrease]'
  )!.onclick = () => changeSpacingAfter(Number(spacingAfterInputDom.value) - 6)
  spacingOptionDom.querySelector<HTMLButtonElement>(
    '[data-spacingafter-increase]'
  )!.onclick = () => changeSpacingAfter(Number(spacingAfterInputDom.value) + 6)
  spacingBeforeInputDom.onchange = () =>
    changeSpacingBefore(Number(spacingBeforeInputDom.value))
  spacingAfterInputDom.onchange = () =>
    changeSpacingAfter(Number(spacingAfterInputDom.value))

  const listDom = document.querySelector<HTMLDivElement>('.menu-item__list')!
  listDom.title = `Danh sách(${isApple ? '⌘' : 'Ctrl'}+Shift+U)`
  const listOptionDom = listDom.querySelector<HTMLDivElement>('.options')!
  listDom.onclick = function () {
    console.log('list')
    listOptionDom.classList.toggle('visible')
  }
  listOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const listType = <ListType>li.dataset.listType || null
    const listStyle = <ListStyle>(<unknown>li.dataset.listStyle)
    instance.command.executeList(listType, listStyle)
  }

  // 4. | 表格 | 图片 | 超链接 | 分割线 | 水印 | 代码块 | 分隔符 | 控件 | 复选框 | LaTeX | 日期选择器
  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>(
    '.menu-item__table__collapse'
  )!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  // 绘制行列
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  // 移除所有格选择
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => {
      tr.forEach(td => td.classList.remove('active'))
    })
  }
  // 设置标题内容
  function setTableTitle(payload: string) {
    tableTitle.innerText = payload
  }
  // 恢复初始状态
  function recoveryTable() {
    // 还原选择样式、标题、选择行列
    removeAllTableCellSelect()
    setTableTitle('Chèn')
    colIndex = 0
    rowIndex = 0
    // 隐藏panel
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = function () {
    console.log('table')
    tablePanelContainer!.style.display = 'block'
  }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16
    const rowMarginTop = 10
    const celMarginRight = 6
    const { offsetX, offsetY } = evt
    // 移除所有选择
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    // 改变选择样式
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) {
          td.classList.add('active')
        }
      })
    })
    // 改变表格标题
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = function () {
    recoveryTable()
  }
  tablePanel.onclick = function () {
    // 应用选择
    instance.command.executeInsertTable(rowIndex, colIndex)
    recoveryTable()
  }

  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
  const imageFileDom = document.querySelector<HTMLInputElement>('#image')!
  imageDom.onclick = function () {
    imageFileDom.click()
  }
  imageFileDom.onchange = function () {
    const file = imageFileDom.files![0]!
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = function () {
      // 计算宽高
      const image = new Image()
      const value = fileReader.result as string
      image.src = value
      image.onload = function () {
        instance.command.executeImage({
          value,
          width: image.width,
          height: image.height
        })
        imageFileDom.value = ''
      }
    }
  }

  const hyperlinkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__hyperlink'
  )!
  hyperlinkDom.onclick = function () {
    console.log('hyperlink')
    new Dialog({
      title: 'Chèn liên kết',
      data: [
        {
          type: 'text',
          label: 'Văn bản',
          name: 'name',
          required: true,
          placeholder: 'Nhập văn bản hiển thị...',
          value: instance.command.getRangeText()
        },
        {
          type: 'text',
          label: 'Liên kết',
          name: 'url',
          required: true,
          placeholder: 'Nhập đường dẫn URL...'
        }
      ],
      onConfirm: payload => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({
          url,
          valueList: splitText(name).map(n => ({
            value: n,
            size: 16
          }))
        })
      }
    })
  }

  const separatorDom = document.querySelector<HTMLDivElement>(
    '.menu-item__separator'
  )!
  const separatorOptionDom =
    separatorDom.querySelector<HTMLDivElement>('.options')!
  separatorDom.onclick = function () {
    console.log('separator')
    separatorOptionDom.classList.toggle('visible')
  }
  separatorOptionDom.onmousedown = function (evt) {
    let payload: number[] = []
    const li = evt.target as HTMLLIElement
    const separatorDash = li.dataset.separator?.split(',').map(Number)
    if (separatorDash) {
      const isSingleLine = separatorDash.every(d => d === 0)
      if (!isSingleLine) {
        payload = separatorDash
      }
    }
    instance.command.executeSeparator(payload)
  }

  const pageBreakDom = document.querySelector<HTMLDivElement>(
    '.menu-item__page-break'
  )!
  pageBreakDom.onclick = function () {
    console.log('pageBreak')
    instance.command.executePageBreak()
  }

  const watermarkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__watermark'
  )!
  const watermarkOptionDom =
    watermarkDom.querySelector<HTMLDivElement>('.options')!
  watermarkDom.onclick = function () {
    console.log('watermark')
    watermarkOptionDom.classList.toggle('visible')
  }
  watermarkOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const menu = li.dataset.menu!
    watermarkOptionDom.classList.toggle('visible')
    if (menu === 'add') {
      new Dialog({
        title: 'Hình mờ (Watermark)',
        data: [
          {
            type: 'text',
            label: 'Nội dung',
            name: 'data',
            required: true,
            placeholder: 'Nhập nội dung hình mờ...'
          },
          {
            type: 'color',
            label: 'Màu sắc',
            name: 'color',
            required: true,
            value: '#AEB5C0'
          },
          {
            type: 'number',
            label: 'Cỡ chữ',
            name: 'size',
            required: true,
            value: '120'
          },
          {
            type: 'number',
            label: 'Độ mờ đục',
            name: 'opacity',
            required: true,
            value: '0.3'
          },
          {
            type: 'select',
            label: 'Lặp lại',
            name: 'repeat',
            value: '0',
            required: false,
            options: [
              {
                label: 'Không lặp',
                value: '0'
              },
              {
                label: 'Lặp lại',
                value: '1'
              }
            ]
          },
          {
            type: 'number',
            label: 'Khoảng cách ngang',
            name: 'horizontalGap',
            required: false,
            value: '10'
          },
          {
            type: 'number',
            label: 'Khoảng cách dọc',
            name: 'verticalGap',
            required: false,
            value: '10'
          }
        ],
        onConfirm: payload => {
          const nullableIndex = payload.findIndex(p => !p.value)
          if (~nullableIndex) return
          const watermark = payload.reduce(
            (pre, cur) => {
              pre[cur.name] = cur.value
              return pre
            },
            <any>{}
          )
          const repeat = watermark.repeat === '1'
          instance.command.executeAddWatermark({
            data: watermark.data,
            color: watermark.color,
            size: Number(watermark.size),
            opacity: Number(watermark.opacity),
            repeat,
            gap:
              repeat && watermark.horizontalGap && watermark.verticalGap
                ? [
                    Number(watermark.horizontalGap),
                    Number(watermark.verticalGap)
                  ]
                : undefined
          })
        }
      })
    } else {
      instance.command.executeDeleteWatermark()
    }
  }

  function triggerOpenIsoFlowchartModal() {
    try {
      if (typeof (window.parent as any)?.__openIsoFlowchartModal === 'function') {
        (window.parent as any).__openIsoFlowchartModal()
      } else if (typeof (window.top as any)?.__openIsoFlowchartModal === 'function') {
        (window.top as any).__openIsoFlowchartModal()
      } else {
        window.parent.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
        window.top?.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
      }
    } catch (_) {
      try {
        window.parent.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
        window.top?.postMessage({ type: 'OPEN_ISO_FLOWCHART_DESIGNER' }, '*')
      } catch (__) {}
    }
  }

  const flowchartDom = document.querySelector<HTMLDivElement>(
    '.menu-item__flowchart'
  )
  if (flowchartDom) {
    flowchartDom.onclick = function () {
      triggerOpenIsoFlowchartModal()
    }
  }

  const codeblockDom = document.querySelector<HTMLDivElement>(
    '.menu-item__codeblock'
  )!
  codeblockDom.onclick = function () {
    console.log('codeblock')
    new Dialog({
      title: 'Khối mã (Code block)',
      data: [
        {
          type: 'textarea',
          name: 'codeblock',
          placeholder: 'Nhập mã nguồn...',
          width: 500,
          height: 300
        }
      ],
      onConfirm: payload => {
        const codeblock = payload.find(p => p.name === 'codeblock')?.value
        if (!codeblock) return
        const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
        const formatTokenList = formatPrismToken(tokenList)
        const elementList: IElement[] = []
        for (let i = 0; i < formatTokenList.length; i++) {
          const formatToken = formatTokenList[i]
          const tokenStringList = splitText(formatToken.content)
          for (let j = 0; j < tokenStringList.length; j++) {
            const value = tokenStringList[j]
            const element: IElement = {
              value
            }
            if (formatToken.color) {
              element.color = formatToken.color
            }
            if (formatToken.bold) {
              element.bold = true
            }
            if (formatToken.italic) {
              element.italic = true
            }
            elementList.push(element)
          }
        }
        elementList.unshift({
          value: '\n'
        })
        instance.command.executeInsertElementList(elementList)
      }
    })
  }

  const controlDom = document.querySelector<HTMLDivElement>(
    '.menu-item__control'
  )!
  const controlOptionDom = controlDom.querySelector<HTMLDivElement>('.options')!
  controlDom.onclick = function () {
    console.log('control')
    controlOptionDom.classList.toggle('visible')
  }
  controlOptionDom.onmousedown = function (evt) {
    controlOptionDom.classList.toggle('visible')
    const li = evt.target as HTMLLIElement
    const type = <ControlType>li.dataset.control
    switch (type) {
      case ControlType.TEXT:
        new Dialog({
          title: 'Trường văn bản',
          data: [
            {
              type: 'text',
              label: 'Gợi ý (Placeholder)',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập gợi ý placeholder...'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Nhập giá trị mặc định...'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.SELECT:
        new Dialog({
          title: 'Trường danh sách chọn',
          data: [
            {
              type: 'text',
              label: 'Gợi ý (Placeholder)',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập gợi ý placeholder...'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định...'
            },
            {
              type: 'textarea',
              label: 'Tập giá trị',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập JSON tập giá trị, ví dụ:\n[{\n"value":"Có",\n"code":"1"\n}]`
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                placeholder,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.CHECKBOX:
        new Dialog({
          title: 'Trường ô kiểm (Checkbox)',
          data: [
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định, phân cách bằng dấu phẩy'
            },
            {
              type: 'textarea',
              label: 'Tập giá trị',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập JSON tập giá trị, ví dụ:\n[{\n"value":"Có",\n"code":"1"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.RADIO:
        new Dialog({
          title: 'Trường nút chọn một (Radio)',
          data: [
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'code',
              placeholder: 'Nhập giá trị mặc định...'
            },
            {
              type: 'textarea',
              label: 'Tập giá trị',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Nhập JSON tập giá trị, ví dụ:\n[{\n"value":"Có",\n"code":"1"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.DATE:
        new Dialog({
          title: 'Trường ngày tháng',
          data: [
            {
              type: 'text',
              label: 'Gợi ý (Placeholder)',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập gợi ý placeholder...'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Nhập giá trị mặc định...'
            },
            {
              type: 'select',
              label: 'Định dạng ngày',
              name: 'dateFormat',
              value: 'yyyy-MM-dd hh:mm:ss',
              required: true,
              options: [
                {
                  label: 'yyyy-MM-dd hh:mm:ss',
                  value: 'yyyy-MM-dd hh:mm:ss'
                },
                {
                  label: 'yyyy-MM-dd',
                  value: 'yyyy-MM-dd'
                }
              ]
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            const dateFormat =
              payload.find(p => p.name === 'dateFormat')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                dateFormat,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.NUMBER:
        new Dialog({
          title: 'Trường số (Number)',
          data: [
            {
              type: 'text',
              label: 'Gợi ý (Placeholder)',
              name: 'placeholder',
              required: true,
              placeholder: 'Nhập gợi ý placeholder...'
            },
            {
              type: 'text',
              label: 'Giá trị mặc định',
              name: 'value',
              placeholder: 'Nhập giá trị mặc định...'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      default:
        break
    }
  }

  const checkboxDom = document.querySelector<HTMLDivElement>(
    '.menu-item__checkbox'
  )!
  checkboxDom.onclick = function () {
    console.log('checkbox')
    instance.command.executeInsertElementList([
      {
        type: ElementType.CHECKBOX,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const radioDom = document.querySelector<HTMLDivElement>('.menu-item__radio')!
  radioDom.onclick = function () {
    console.log('radio')
    instance.command.executeInsertElementList([
      {
        type: ElementType.RADIO,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const latexDom = document.querySelector<HTMLDivElement>('.menu-item__latex')!
  latexDom.onclick = function () {
    console.log('LaTeX')
    new Dialog({
      title: 'Công thức LaTeX',
      data: [
        {
          type: 'textarea',
          height: 100,
          name: 'value',
          placeholder: 'Nhập mã công thức LaTeX...'
        }
      ],
      onConfirm: payload => {
        const value = payload.find(p => p.name === 'value')?.value
        if (!value) return
        instance.command.executeInsertElementList([
          {
            type: ElementType.LATEX,
            value
          }
        ])
      }
    })
  }

  const dateDom = document.querySelector<HTMLDivElement>('.menu-item__date')!
  const dateDomOptionDom = dateDom.querySelector<HTMLDivElement>('.options')!
  dateDom.onclick = function () {
    console.log('date')
    dateDomOptionDom.classList.toggle('visible')
    // 定位调整
    const bodyRect = document.body.getBoundingClientRect()
    const dateDomOptionRect = dateDomOptionDom.getBoundingClientRect()
    if (dateDomOptionRect.left + dateDomOptionRect.width > bodyRect.width) {
      dateDomOptionDom.style.right = '0px'
      dateDomOptionDom.style.left = 'unset'
    } else {
      dateDomOptionDom.style.right = 'unset'
      dateDomOptionDom.style.left = '0px'
    }
    // 当前日期
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dateTimeString = `${dateString} ${hour}:${minute}:${second}`
    dateDomOptionDom.querySelector<HTMLLIElement>('li:first-child')!.innerText =
      dateString
    dateDomOptionDom.querySelector<HTMLLIElement>('li:last-child')!.innerText =
      dateTimeString
  }
  dateDomOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const dateFormat = li.dataset.format!
    dateDomOptionDom.classList.toggle('visible')
    instance.command.executeInsertElementList([
      {
        type: ElementType.DATE,
        value: '',
        dateFormat,
        valueList: [
          {
            value: li.innerText.trim()
          }
        ]
      }
    ])
  }

  const blockDom = document.querySelector<HTMLDivElement>('.menu-item__block')!
  blockDom.onclick = function () {
    console.log('block')
    new Dialog({
      title: 'Khối nội dung & Sơ đồ',
      data: [
        {
          type: 'select',
          label: 'Loại khối',
          name: 'type',
          value: 'flowchart',
          required: true,
          options: [
            {
              label: '🔀 Sơ đồ lưu trình ISO (Flowchart)',
              value: 'flowchart'
            },
            {
              label: 'Trang web (Iframe)',
              value: 'iframe'
            },
            {
              label: 'Video',
              value: 'video'
            }
          ]
        },
        {
          type: 'number',
          label: 'Chiều rộng',
          name: 'width',
          placeholder: 'Nhập chiều rộng (mặc định theo chiều rộng trang)'
        },
        {
          type: 'number',
          label: 'Chiều cao',
          name: 'height',
          required: true,
          placeholder: 'Nhập chiều cao'
        },
        {
          type: 'input',
          label: 'Đường dẫn URL',
          name: 'src',
          required: false,
          placeholder: 'Nhập đường dẫn URL'
        },
        {
          type: 'textarea',
          label: 'Mã HTML',
          height: 100,
          name: 'srcdoc',
          required: false,
          placeholder: 'Nhập mã HTML (chỉ có hiệu lực với loại Iframe)'
        }
      ],
      onConfirm: payload => {
        const type = payload.find(p => p.name === 'type')?.value
        if (!type) return
        if (type === 'flowchart') {
          triggerOpenIsoFlowchartModal()
          return
        }
        const width = payload.find(p => p.name === 'width')?.value
        const height = payload.find(p => p.name === 'height')?.value
        if (!height) return
        // 地址或HTML代码至少存在一项
        const src = payload.find(p => p.name === 'src')?.value
        const srcdoc = payload.find(p => p.name === 'srcdoc')?.value
        const block: IBlock = {
          type: <BlockType>type
        }
        if (block.type === BlockType.IFRAME) {
          if (!src && !srcdoc) return
          block.iframeBlock = {
            src,
            srcdoc
          }
        } else if (block.type === BlockType.VIDEO) {
          if (!src) return
          block.videoBlock = {
            src
          }
        }
        const blockElement: IElement = {
          type: ElementType.BLOCK,
          value: '',
          height: Number(height),
          block
        }
        if (width) {
          blockElement.width = Number(width)
        }
        instance.command.executeInsertElementList([blockElement])
      }
    })
  }

  // 5. | 搜索&替换 | 打印 |
  const searchCollapseDom = document.querySelector<HTMLDivElement>(
    '.menu-item__search__collapse'
  )!
  const searchInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__search input'
  )!
  const replaceInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__replace input'
  )!
  const searchRegInputDom =
    document.querySelector<HTMLInputElement>('#option-reg')!
  const searchCaseInputDom =
    document.querySelector<HTMLInputElement>('#option-case')!
  const searchSelectionInputDom =
    document.querySelector<HTMLInputElement>('#option-selection')!
  const searchDom =
    document.querySelector<HTMLDivElement>('.menu-item__search')!
  searchDom.title = `Tìm kiếm & Thay thế (${isApple ? '⌘' : 'Ctrl'}+F)`
  const searchResultDom =
    searchCollapseDom.querySelector<HTMLLabelElement>('.search-result')!
  function setSearchResult() {
    const result = instance.command.getSearchNavigateInfo()
    if (result) {
      const { index, count } = result
      searchResultDom.innerText = `${index}/${count}`
    } else {
      searchResultDom.innerText = ''
    }
  }
  searchDom.onclick = function () {
    console.log('search')
    searchCollapseDom.style.display = 'block'
    const bodyRect = document.body.getBoundingClientRect()
    const searchRect = searchDom.getBoundingClientRect()
    const searchCollapseRect = searchCollapseDom.getBoundingClientRect()
    if (searchRect.left + searchCollapseRect.width > bodyRect.width) {
      searchCollapseDom.style.right = '0px'
      searchCollapseDom.style.left = 'unset'
    } else {
      searchCollapseDom.style.right = 'unset'
    }
    searchInputDom.focus()
  }
  searchCollapseDom.querySelector<HTMLSpanElement>('span')!.onclick =
    function () {
      searchCollapseDom.style.display = 'none'
      searchInputDom.value = ''
      replaceInputDom.value = ''
      instance.command.executeSearch(null)
      setSearchResult()
    }

  function emitSearch() {
    instance.command.executeSearch(searchInputDom.value || null, {
      isRegEnable: searchRegInputDom.checked,
      isIgnoreCase: searchCaseInputDom.checked,
      isLimitSelection: searchSelectionInputDom.checked
    })
    setSearchResult()
  }

  searchInputDom.oninput = emitSearch
  searchRegInputDom.onchange = emitSearch
  searchCaseInputDom.onchange = emitSearch
  searchSelectionInputDom.onchange = emitSearch
  searchInputDom.onkeydown = function (evt) {
    if (evt.key === 'Enter') {
      emitSearch()
    }
  }
  searchCollapseDom.querySelector<HTMLButtonElement>('button')!.onclick =
    function () {
      const searchValue = searchInputDom.value
      const replaceValue = replaceInputDom.value
      if (searchValue && searchValue !== replaceValue) {
        instance.command.executeReplace(replaceValue)
      }
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-left')!.onclick =
    function () {
      instance.command.executeSearchNavigatePre()
      setSearchResult()
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-right')!.onclick =
    function () {
      instance.command.executeSearchNavigateNext()
      setSearchResult()
    }

  const printDom = document.querySelector<HTMLDivElement>('.menu-item__print')!
  printDom.title = `In ấn / Xuất PDF (${isApple ? '⌘' : 'Ctrl'}+P)`
  printDom.onclick = function () {
    console.log('print')
    instance.command.executePrint()
  }

  const exportDocxDom =
    document.querySelector<HTMLDivElement>('.menu-item__export-docx')
  if (exportDocxDom) {
    exportDocxDom.onclick = async function () {
      try {
        await instance.command.executeExportDocx({
          fileName: 'Van_ban'
        })
      } catch (err) {
        console.error('Lỗi khi xuất file Word:', err)
      }
    }
  }

  const importDocxDom =
    document.querySelector<HTMLDivElement>('.menu-item__import-docx')
  const docxFileInput =
    document.querySelector<HTMLInputElement>('#docx-input')
  if (importDocxDom && docxFileInput) {
    importDocxDom.onclick = function () {
      docxFileInput.click()
    }
    docxFileInput.onchange = async function (e) {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        if (typeof (window.parent as any)?.__uploadAndMergeCanvasWord__ === 'function') {
          await (window.parent as any).__uploadAndMergeCanvasWord__(file)
          return
        }
        const arrayBuffer = await file.arrayBuffer()
        await instance.command.executeImportDocx({ arrayBuffer })

        // Tự động nhận diện tiêu đề nếu file Word không có sẵn style Heading chuẩn
        const catalog = await instance.command.getCatalog()
        if (!catalog || catalog.length === 0) {
          autoDetectHeadings(instance)
        }

        // Cập nhật số từ, mục lục, ghi chú
        await handleContentChange()
        if (isCatalogShow) {
          await updateCatalog()
        }
      } catch (err) {
        console.error('Lỗi khi mở file Word:', err)
      } finally {
        docxFileInput.value = ''
      }
    }
  }

  // 6. 目录显隐 | 页面模式 | 纸张缩放 | 纸张大小 | 纸张方向 | 页边距 | 全屏 | 设置
  const editorOptionDom =
    document.querySelector<HTMLDivElement>('.editor-option')!
  editorOptionDom.onclick = function () {
    new SettingsModal(instance)
  }

  async function updateCatalog() {
    try {
      const catalog = (await instance.command.getCatalog()) || []
      const catalogMainDom =
        document.querySelector<HTMLDivElement>('.catalog__main')!
      catalogMainDom.innerHTML = ''

      // Hàm đệ quy bóc tách các mục nội dung hợp lệ (từ trang 3 trở đi, pageNo >= 2)
      // Nếu có mục cha ở trang bìa hoặc bảng sửa đổi bị lồng các mục con của trang nội dung,
      // giải phóng các mục con đó ra ngoài để không bao giờ bị mất Tiêu đề 2, 3...
      const extractBodyItems = (items: ICatalogItem[]): ICatalogItem[] => {
        const result: ICatalogItem[] = []
        for (const item of items) {
          const isCoverOrRev =
            item.id === 'iso-title-cover-page' ||
            item.id === 'iso-title-rev-log' ||
            item.name.includes('THEO DÕI SỬA ĐỔI') ||
            (item.pageNo !== undefined && item.pageNo < 2)

          if (isCoverOrRev) {
            if (item.subCatalog && item.subCatalog.length > 0) {
              result.push(...extractBodyItems(item.subCatalog))
            }
          } else {
            const cleanSub =
              item.subCatalog && item.subCatalog.length > 0
                ? extractBodyItems(item.subCatalog)
                : []
            result.push({
              ...item,
              subCatalog: cleanSub
            })
          }
        }
        return result
      }

      const bodyItems = extractBodyItems(catalog)

      // Xây dựng danh sách mục lục chuẩn ISO luôn đầy đủ Trang 1 và Trang 2
      const fullCatalog: ICatalogItem[] = [
        {
          id: 'iso-title-cover-page',
          name: 'TRANG BÌA',
          level: 'first' as any,
          pageNo: 0,
          subCatalog: []
        },
        {
          id: 'iso-title-rev-log',
          name: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU',
          level: 'first' as any,
          pageNo: 1,
          subCatalog: []
        },
        ...bodyItems
      ]

      const appendCatalog = (
        parent: HTMLDivElement,
        catalogItems: ICatalogItem[]
      ) => {
        for (let c = 0; c < catalogItems.length; c++) {
          const catalogItem = catalogItems[c]
          const catalogItemDom = document.createElement('div')
          catalogItemDom.classList.add('catalog-item')
          // 渲染
          const catalogItemContentDom = document.createElement('div')
          catalogItemContentDom.classList.add('catalog-item__content')
          const catalogItemContentSpanDom = document.createElement('span')
          catalogItemContentSpanDom.innerText = catalogItem.name
          catalogItemContentDom.append(catalogItemContentSpanDom)
          // 定位
          catalogItemContentDom.onclick = () => {
            if (catalogItem.id === 'iso-title-cover-page' || catalogItem.pageNo === 0) {
              const canvasList = document.querySelectorAll('.page-container canvas')
              if (canvasList[0]) {
                canvasList[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              try { instance.command.executeLocationCatalog('iso-title-cover-page') } catch (_) {}
            } else if (catalogItem.id === 'iso-title-rev-log' || catalogItem.pageNo === 1) {
              const canvasList = document.querySelectorAll('.page-container canvas')
              if (canvasList[1]) {
                canvasList[1].scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              try { instance.command.executeLocationCatalog('iso-title-rev-log') } catch (_) {}
            } else {
              try {
                instance.command.executeLocationCatalog(catalogItem.id)
              } catch (_) {
                if (catalogItem.pageNo !== undefined) {
                  const canvasList = document.querySelectorAll('.page-container canvas')
                  if (canvasList[catalogItem.pageNo]) {
                    canvasList[catalogItem.pageNo].scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }
              }
            }
          }
          catalogItemDom.append(catalogItemContentDom)
          if (catalogItem.subCatalog && catalogItem.subCatalog.length) {
            appendCatalog(catalogItemDom, catalogItem.subCatalog)
          }
          parent.append(catalogItemDom)
        }
      }
      appendCatalog(catalogMainDom, fullCatalog)
    } catch (err) {
      console.error('Lỗi khi cập nhật mục lục:', err)
    }
  }
  updateCatalogRef = updateCatalog
  Reflect.set(window, 'updateCatalog', updateCatalog)
  setTimeout(() => { updateCatalog() }, 500)
  let isCatalogShow = true
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const catalogModeDom =
    document.querySelector<HTMLDivElement>('.catalog-mode')!
  const catalogHeaderCloseDom = document.querySelector<HTMLDivElement>(
    '.catalog__header__close'
  )!
  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    if (isCatalogShow) {
      catalogDom.style.display = 'block'
      updateCatalog()
    } else {
      catalogDom.style.display = 'none'
    }
  }
  catalogModeDom.onclick = switchCatalog
  catalogHeaderCloseDom.onclick = switchCatalog
  const catalogHeaderAutoDom = document.querySelector<HTMLDivElement>(
    '.catalog__header__auto'
  )
  if (catalogHeaderAutoDom) {
    catalogHeaderAutoDom.onclick = async () => {
      autoDetectHeadings(instance, { force: true })
      await updateCatalog()
    }
  }

  const pageModeDom = document.querySelector<HTMLDivElement>('.page-mode')!
  const pageModeOptionsDom =
    pageModeDom.querySelector<HTMLDivElement>('.options')!
  pageModeDom.onclick = function () {
    pageModeOptionsDom.classList.toggle('visible')
  }
  pageModeOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePageMode(<PageMode>li.dataset.pageMode!)
  }

  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick =
    function () {
      console.log('page-scale-recovery')
      instance.command.executePageScaleRecovery()
    }

  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick =
    function () {
      console.log('page-scale-minus')
      instance.command.executePageScaleMinus()
    }

  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick =
    function () {
      console.log('page-scale-add')
      instance.command.executePageScaleAdd()
    }

  // 纸张大小
  const paperSizeDom = document.querySelector<HTMLDivElement>('.paper-size')!
  const paperSizeDomOptionsDom =
    paperSizeDom.querySelector<HTMLDivElement>('.options')!
  paperSizeDom.onclick = function () {
    paperSizeDomOptionsDom.classList.toggle('visible')
  }
  paperSizeDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperType = li.dataset.paperSize!
    const [width, height] = paperType.split('*').map(Number)
    instance.command.executePaperSize(width, height)
    // 纸张状态回显
    paperSizeDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // 纸张方向
  const paperDirectionDom =
    document.querySelector<HTMLDivElement>('.paper-direction')!
  const paperDirectionDomOptionsDom =
    paperDirectionDom.querySelector<HTMLDivElement>('.options')!
  paperDirectionDom.onclick = function () {
    paperDirectionDomOptionsDom.classList.toggle('visible')
  }
  paperDirectionDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    if (li.tagName !== 'LI' || li.classList.contains('option-caption')) return
    const { paperDirection, sectionDirection } = li.dataset
    if (sectionDirection) {
      // 指定页面方向（本节）
      instance.command.executePageDirection(
        sectionDirection === 'inherit' ? null : <PaperDirection>sectionDirection
      )
    } else if (paperDirection) {
      instance.command.executePaperDirection(<PaperDirection>paperDirection)
    }
    // 纸张方向状态回显
    paperDirectionDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // 页面边距
  const paperMarginDom =
    document.querySelector<HTMLDivElement>('.paper-margin')!
  paperMarginDom.onclick = function () {
    const [topMargin, rightMargin, bottomMargin, leftMargin] =
      instance.command.getPaperMargin()
    new Dialog({
      title: 'Căn lề trang',
      data: [
        {
          type: 'text',
          label: 'Lề trên',
          name: 'top',
          required: true,
          value: `${topMargin}`,
          placeholder: 'Nhập lề trên'
        },
        {
          type: 'text',
          label: 'Lề dưới',
          name: 'bottom',
          required: true,
          value: `${bottomMargin}`,
          placeholder: 'Nhập lề dưới'
        },
        {
          type: 'text',
          label: 'Lề trái',
          name: 'left',
          required: true,
          value: `${leftMargin}`,
          placeholder: 'Nhập lề trái'
        },
        {
          type: 'text',
          label: 'Lề phải',
          name: 'right',
          required: true,
          value: `${rightMargin}`,
          placeholder: 'Nhập lề phải'
        }
      ],
      onConfirm: payload => {
        const top = payload.find(p => p.name === 'top')?.value
        if (!top) return
        const bottom = payload.find(p => p.name === 'bottom')?.value
        if (!bottom) return
        const left = payload.find(p => p.name === 'left')?.value
        if (!left) return
        const right = payload.find(p => p.name === 'right')?.value
        if (!right) return
        instance.command.executeSetPaperMargin([
          Number(top),
          Number(right),
          Number(bottom),
          Number(left)
        ])
      }
    })
  }

  // 分栏配置
  const columnConfigDom =
    document.querySelector<HTMLDivElement>('.column-config')!
  columnConfigDom.onclick = function () {
    const current = instance.command.getColumns()
    const count = current?.count ?? 1
    const gap = current?.gap ?? 20
    const separator = current?.separator ? 'true' : 'false'
    new Dialog({
      title: 'Chia cột',
      data: [
        {
          type: 'select',
          label: 'Số cột',
          name: 'count',
          required: true,
          value: `${count}`,
          options: [
            { value: '1', label: '1 (Tắt)' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        },
        {
          type: 'text',
          label: 'Khoảng cách cột',
          name: 'gap',
          required: true,
          value: `${gap}`,
          placeholder: 'Nhập khoảng cách cột (pixel)'
        },
        {
          type: 'select',
          label: 'Đường phân cách',
          name: 'separator',
          required: true,
          value: separator,
          options: [
            { value: 'false', label: 'Không hiển thị' },
            { value: 'true', label: 'Hiển thị' }
          ]
        }
      ],
      onConfirm: payload => {
        const countValue = payload.find(p => p.name === 'count')?.value
        if (!countValue) return
        const gapValue = payload.find(p => p.name === 'gap')?.value
        if (!gapValue) return
        const separatorValue = payload.find(p => p.name === 'separator')?.value
        if (!separatorValue) return
        instance.command.executeSetColumns({
          count: Number(countValue),
          gap: Number(gapValue),
          separator: separatorValue === 'true'
        })
      }
    })
  }

  // 标尺开关
  const rulerToggleDom =
    document.querySelector<HTMLDivElement>('.ruler-toggle')!
  rulerToggleDom.onclick = function () {
    instance.command.executeToggleRuler()
  }

  // 全屏
  const fullscreenDom = document.querySelector<HTMLDivElement>('.fullscreen')!
  fullscreenDom.onclick = toggleFullscreen
  window.addEventListener('keydown', evt => {
    if (evt.key === 'F11') {
      toggleFullscreen()
      evt.preventDefault()
    }
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenDom.classList.toggle('exist')
  })
  function toggleFullscreen() {
    console.log('fullscreen')
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 7. 编辑器使用模式
  const modeList = [
    {
      mode: EditorMode.EDIT,
      name: 'Chỉnh sửa'
    },
    {
      mode: EditorMode.CLEAN,
      name: 'Xem sạch'
    },
    {
      mode: EditorMode.READONLY,
      name: 'Chỉ đọc'
    },
    {
      mode: EditorMode.FORM,
      name: 'Biểu mẫu'
    },
    {
      mode: EditorMode.PRINT,
      name: 'Chế độ in'
    },
    {
      mode: EditorMode.DESIGN,
      name: 'Thiết kế'
    },
    {
      mode: EditorMode.GRAFFITI,
      name: 'Vẽ tự do'
    },
    {
      mode: EditorMode.TRACE,
      name: 'Theo dõi thay đổi'
    }
  ]
  const modeElement = document.querySelector<HTMLDivElement>('.editor-mode')!
  const modeOptionsElement =
    modeElement.querySelector<HTMLUListElement>('.options')!
  const modeTextElement = modeElement.querySelector<HTMLSpanElement>('.text')!
  const modeTextMap = modeList.reduce<Record<string, string>>((acc, item) => {
    acc[item.mode] = item.name
    return acc
  }, {})
  // 初始 active 与 .text 对齐当前模式
  const currentMode = instance.command.getOptions().mode
  modeTextElement.innerText =
    modeTextMap[currentMode] || modeTextMap[EditorMode.EDIT]
  modeOptionsElement.querySelectorAll<HTMLLIElement>('li').forEach(li => {
    li.classList.toggle('active', li.dataset.mode === currentMode)
  })

  // 留痕记录开关（仅 "留痕模式" 行可见；留痕查看模式下禁用）
  const traceToggleDom = document.querySelector<HTMLInputElement>(
    '.trace-toggle__input'
  )!
  traceToggleDom.checked = !instance.command.getOptions().trace?.disabled
  traceToggleDom.disabled = currentMode === EditorMode.TRACE
  traceToggleDom.onchange = function () {
    instance.command.executeToggleTrace(traceToggleDom.checked)
  }

  const applyMode = (mode: EditorMode) => {
    modeTextElement.innerText = modeTextMap[mode]
    instance.command.executeMode(mode)
    // 更新 active 高亮
    modeOptionsElement.querySelectorAll<HTMLLIElement>('li').forEach(li => {
      li.classList.toggle('active', li.dataset.mode === mode)
    })
    // 设置菜单栏权限视觉反馈
    const isReadonly = mode === EditorMode.READONLY || mode === EditorMode.TRACE
    const enableMenuList = ['search', 'print']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu))
        ? dom.classList.add('disable')
        : dom.classList.remove('disable')
    })
    // 留痕查看模式禁止切回记录态
    traceToggleDom.disabled = mode === EditorMode.TRACE
  }
  modeElement.onclick = function (evt) {
    // 点击 li 时不重复 toggle 弹窗（交由 options 处理）
    if ((evt.target as HTMLElement).tagName === 'LI') return
    modeOptionsElement.classList.toggle('visible')
  }
  modeOptionsElement.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.trace-toggle')) return
    const li = target.closest('li')
    if (!li) return
    const mode = li.dataset.mode as EditorMode
    if (!modeTextMap[mode]) return
    applyMode(mode)
    modeOptionsElement.classList.remove('visible')
  }

  const spellcheckDom = document.querySelector<HTMLDivElement>('.spellcheck')!
  const spellcheckOptionsDom =
    spellcheckDom.querySelector<HTMLDivElement>('.options')!
  const spellcheckToggleDom = spellcheckDom.querySelector<HTMLInputElement>(
    '.spellcheck-toggle__input'
  )!
  spellcheckToggleDom.checked =
    !instance.command.getOptions().spellcheck.disabled
  spellcheckDom.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.spellcheck-toggle')) return
    spellcheckOptionsDom.classList.toggle('visible')
  }
  let spellcheckPluginPromise: Promise<void> | null = null
  const loadSpellcheckPlugin = () => {
    if (!spellcheckPluginPromise) {
      spellcheckPluginPromise = import('./plugins/spellcheck')
        .then(({ spellcheckPlugin }) => {
          instance.use(spellcheckPlugin)
        })
        .catch(error => {
          spellcheckPluginPromise = null
          throw error
        })
    }
    return spellcheckPluginPromise
  }
  spellcheckToggleDom.onchange = async function () {
    if (spellcheckToggleDom.checked) {
      try {
        await loadSpellcheckPlugin()
      } catch {
        spellcheckToggleDom.checked = false
      }
    }
    const currentOptions = instance.command.getOptions()
    instance.command.executeUpdateOptions({
      ...currentOptions,
      spellcheck: {
        ...currentOptions.spellcheck,
        disabled: !spellcheckToggleDom.checked
      }
    })
    spellcheckOptionsDom.classList.remove('visible')
  }

  // 模拟批注
  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  async function updateComment() {
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      // 编辑器是否存在对应成组id
      if (groupIds.includes(comment.id)) {
        // 当前dom是否存在-不存在则追加
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => {
            instance.command.executeLocationGroup(comment.id)
          }
          commentDom.append(commentItem)
          // 选区信息
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const commentItemTitleContent = document.createElement('span')
          commentItemTitleContent.innerText = comment.rangeText
          commentItemTitle.append(commentItemTitleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => {
            instance.command.executeDeleteGroup(comment.id)
          }
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          // 基础信息
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const commentItemInfoName = document.createElement('span')
          commentItemInfoName.innerText = comment.userName
          const commentItemInfoDate = document.createElement('span')
          commentItemInfoDate.innerText = comment.createdDate
          commentItemInfo.append(commentItemInfoName)
          commentItemInfo.append(commentItemInfoDate)
          commentItem.append(commentItemInfo)
          // 详细评论
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        // 编辑器内不存在对应成组id则dom则移除
        activeCommentDom?.remove()
      }
    }
    // 按批注文字在文档中的位置排序批注卡片，避免连接线交叉
    const orderedCommentItemList = commentList
      .map(comment => {
        const commentItemDom = commentDom.querySelector<HTMLDivElement>(
          `.comment-item[data-id='${comment.id}']`
        )
        const rectList = instance.command.getGroupRectList(comment.id)
        return commentItemDom && rectList?.length
          ? { commentItemDom, anchor: rectList[0] }
          : null
      })
      .filter(item => !!item)
      .sort((a, b) => a.anchor.y - b.anchor.y || a.anchor.x - b.anchor.x)
    orderedCommentItemList.forEach(item =>
      commentDom.append(item.commentItemDom)
    )
    drawCommentLines()
  }
  // 批注连接线（在编辑器外绘制：通过 getGroupRectList 获取成组坐标）
  const commentLineSvg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  )
  commentLineSvg.classList.add('comment-line')
  document.body.append(commentLineSvg)
  // 连接线开关（默认关闭）
  let isCommentLineVisible = false
  const commentLineSwitch = document.querySelector<HTMLInputElement>(
    '#comment-line-switch'
  )!
  commentLineSwitch.onchange = () => {
    isCommentLineVisible = commentLineSwitch.checked
    drawCommentLines()
  }
  function drawCommentLines() {
    // 清空已有连线
    while (commentLineSvg.firstChild) {
      commentLineSvg.firstChild.remove()
    }
    if (!isCommentLineVisible) return
    const pageContainer =
      container.querySelector<HTMLDivElement>('.ce-page-container')
    if (!pageContainer) return
    const pageRect = pageContainer.getBoundingClientRect()
    for (const comment of commentList) {
      const commentItemDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      if (!commentItemDom) continue
      // 成组元素矩形信息（相对编辑器书写区，已包含缩放）
      const rectList = instance.command.getGroupRectList(comment.id)
      if (!rectList?.length) continue
      const firstRect = rectList[0]
      // 起点：批注文字首行右端中点；终点：批注卡片左端中点
      const startX = pageRect.left + firstRect.x + firstRect.width
      const startY = pageRect.top + firstRect.y + firstRect.height / 2
      const itemRect = commentItemDom.getBoundingClientRect()
      const endX = itemRect.left
      const endY = itemRect.top + itemRect.height / 2
      const controlOffset = Math.max((endX - startX) / 2, 0)
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )
      path.setAttribute(
        'd',
        `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${
          endX - controlOffset
        } ${endY}, ${endX} ${endY}`
      )
      if (commentItemDom.classList.contains('active')) {
        path.classList.add('active')
      }
      commentLineSvg.append(path)
    }
  }
  // 滚动/缩放时实时重绘（requestAnimationFrame 节流）
  let commentLineRafId = 0
  function requestDrawCommentLines() {
    cancelAnimationFrame(commentLineRafId)
    commentLineRafId = requestAnimationFrame(drawCommentLines)
  }
  window.addEventListener('scroll', requestDrawCommentLines, true)
  window.addEventListener('resize', requestDrawCommentLines)
  // 8. 内部事件监听
  instance.listener.rangeStyleChange = function (payload) {
    try {
      // 控件类型
      payload.type === ElementType.SUBSCRIPT
        ? subscriptDom.classList.add('active')
        : subscriptDom.classList.remove('active')
      payload.type === ElementType.SUPERSCRIPT
        ? superscriptDom.classList.add('active')
        : superscriptDom.classList.remove('active')
      payload.type === ElementType.SEPARATOR
        ? separatorDom.classList.add('active')
        : separatorDom.classList.remove('active')
      separatorOptionDom
        .querySelectorAll('li')
        .forEach(li => li.classList.remove('active'))
      if (payload.type === ElementType.SEPARATOR) {
        const separator = payload.dashArray.join(',') || '0,0'
        const curSeparatorDom = separatorOptionDom.querySelector<HTMLLIElement>(
          `[data-separator='${separator}']`
        )
        if (curSeparatorDom) {
          curSeparatorDom.classList.add('active')
        }
      }

      // 富文本
      fontOptionDom
        .querySelectorAll<HTMLLIElement>('li')
        .forEach(li => li.classList.remove('active'))
      const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(
        `[data-family='${payload.font}']`
      )
      if (curFontDom) {
        fontSelectDom.innerText = curFontDom.innerText
        fontSelectDom.style.fontFamily = payload.font
        curFontDom.classList.add('active')
      }
      sizeOptionDom
        .querySelectorAll<HTMLLIElement>('li')
        .forEach(li => li.classList.remove('active'))
      const curSizeDom = sizeOptionDom.querySelector<HTMLLIElement>(
        `[data-size='${payload.size}']`
      )
      if (curSizeDom) {
        sizeSelectDom.innerText = curSizeDom.innerText
        curSizeDom.classList.add('active')
      } else {
        sizeSelectDom.innerText = `${payload.size}`
      }
      payload.bold
        ? boldDom.classList.add('active')
        : boldDom.classList.remove('active')
      payload.italic
        ? italicDom.classList.add('active')
        : italicDom.classList.remove('active')
      payload.underline
        ? underlineDom.classList.add('active')
        : underlineDom.classList.remove('active')
      payload.strikeout
        ? strikeoutDom.classList.add('active')
        : strikeoutDom.classList.remove('active')
      if (payload.color) {
        colorDom.classList.add('active')
        colorControlDom.value = payload.color
        colorSpanDom.style.backgroundColor = payload.color
      } else {
        colorDom.classList.remove('active')
        colorControlDom.value = '#000000'
        colorSpanDom.style.backgroundColor = '#000000'
      }
      if (payload.highlight) {
        highlightDom.classList.add('active')
        highlightControlDom.value = payload.highlight
        highlightSpanDom.style.backgroundColor = payload.highlight
      } else {
        highlightDom.classList.remove('active')
        highlightControlDom.value = '#ffff00'
        highlightSpanDom.style.backgroundColor = '#ffff00'
      }

      // 行布局
      leftDom.classList.remove('active')
      centerDom.classList.remove('active')
      rightDom.classList.remove('active')
      alignmentDom.classList.remove('active')
      justifyDom.classList.remove('active')
      if (payload.rowFlex && payload.rowFlex === 'right') {
        rightDom.classList.add('active')
      } else if (payload.rowFlex && payload.rowFlex === 'center') {
        centerDom.classList.add('active')
      } else if (payload.rowFlex && payload.rowFlex === 'alignment') {
        alignmentDom.classList.add('active')
      } else if (payload.rowFlex && payload.rowFlex === 'justify') {
        justifyDom.classList.add('active')
      } else {
        leftDom.classList.add('active')
      }

      // 行间距
      rowOptionDom
        .querySelectorAll<HTMLLIElement>('li')
        .forEach(li => li.classList.remove('active'))
      if (payload.rowMargin !== undefined && payload.rowMargin !== null) {
        const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(
          `[data-rowmargin='${payload.rowMargin}']`
        )
        if (curRowMarginDom) {
          curRowMarginDom.classList.add('active')
        }
      }

      // 段落间距
      if (document.activeElement !== spacingBeforeInputDom) {
        spacingBeforeInputDom.value = `${payload.spacingBefore ?? 0}`
      }
      if (document.activeElement !== spacingAfterInputDom) {
        spacingAfterInputDom.value = `${payload.spacingAfter ?? 0}`
      }

      // 功能
      payload.undo
        ? undoDom.classList.remove('no-allow')
        : undoDom.classList.add('no-allow')
      payload.redo
        ? redoDom.classList.remove('no-allow')
        : redoDom.classList.add('no-allow')
      payload.painter
        ? painterDom.classList.add('active')
        : painterDom.classList.remove('active')

      // 标题
      titleOptionDom
        .querySelectorAll<HTMLLIElement>('li')
        .forEach(li => li.classList.remove('active'))
      if (payload.level) {
        const curTitleDom = titleOptionDom.querySelector<HTMLLIElement>(
          `[data-level='${payload.level}']`
        )
        if (curTitleDom) {
          titleSelectDom.innerText = curTitleDom.innerText
          curTitleDom.classList.add('active')
        } else {
          titleSelectDom.innerText = 'Văn bản thường'
        }
      } else {
        titleSelectDom.innerText = 'Văn bản thường'
        const firstLi = titleOptionDom.querySelector('li:first-child')
        if (firstLi) firstLi.classList.add('active')
      }

      // 列表
      listOptionDom
        .querySelectorAll<HTMLLIElement>('li')
        .forEach(li => li.classList.remove('active'))
      if (payload.listType) {
        listDom.classList.add('active')
        const listType = payload.listType
        const listStyle =
          payload.listType === ListType.OL ? ListStyle.DECIMAL : payload.listType
        const curListDom = listOptionDom.querySelector<HTMLLIElement>(
          `[data-list-type='${listType}'][data-list-style='${listStyle}']`
        )
        if (curListDom) {
          curListDom.classList.add('active')
        }
      } else {
        listDom.classList.remove('active')
      }

      // 批注
      commentDom
        .querySelectorAll<HTMLDivElement>('.comment-item')
        .forEach(commentItemDom => {
          commentItemDom.classList.remove('active')
        })
      if (payload.groupIds) {
        const [id] = payload.groupIds
        const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
          `.comment-item[data-id='${id}']`
        )
        if (activeCommentDom) {
          activeCommentDom.classList.add('active')
          scrollIntoView(commentDom, activeCommentDom)
        }
      }
      // 批注激活状态变化时重绘连接线
      requestDrawCommentLines()

      // 行列信息
      const rangeContext = instance.command.getRangeContext()
      if (rangeContext) {
        const rowNoDom = document.querySelector<HTMLSpanElement>('.row-no')
        if (rowNoDom) rowNoDom.innerText = `${rangeContext.startRowNo + 1}`
        const colNoDom = document.querySelector<HTMLSpanElement>('.col-no')
        if (colNoDom) colNoDom.innerText = `${rangeContext.startColNo + 1}`
      }
    } catch (err) {
      console.warn('Lỗi cập nhật toolbar style:', err)
    }
  }

  instance.listener.visiblePageNoListChange = function (payload) {
    const text = payload.map(i => i + 1).join('、')
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = text
  }

  instance.listener.pageSizeChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-size')!.innerText =
      `${payload}`
  }

  instance.listener.intersectionPageNoChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${
      payload + 1
    }`
  }

  instance.listener.pageScaleChange = function (payload) {
    document.querySelector<HTMLSpanElement>(
      '.page-scale-percentage'
    )!.innerText = `${Math.floor(payload * 10 * 10)}%`
    requestDrawCommentLines()
  }

  instance.listener.controlChange = function (payload) {
    const disableMenusInControlContext = [
      'table',
      'hyperlink',
      'separator',
      'page-break',
      'control'
    ]
    // 菜单操作权限
    disableMenusInControlContext.forEach(menu => {
      const menuDom = document.querySelector<HTMLDivElement>(
        `.menu-item__${menu}`
      )!
      payload.state === ControlState.ACTIVE
        ? menuDom.classList.add('disable')
        : menuDom.classList.remove('disable')
    })
  }

  instance.listener.pageModeChange = function (payload) {
    const activeMode = pageModeOptionsDom.querySelector<HTMLLIElement>(
      `[data-page-mode='${payload}']`
    )!
    pageModeOptionsDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    activeMode.classList.add('active')
  }

  const handleContentChange = async function () {
    // 字数
    const wordCount = await instance.command.getWordCount()
    document.querySelector<HTMLSpanElement>('.word-count')!.innerText = `${
      wordCount || 0
    }`
    // 目录
    if (isCatalogShow) {
      nextTick(() => {
        updateCatalog()
      })
    }
    // 批注
    nextTick(() => {
      updateComment()
    })
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()

  instance.listener.saved = function (payload) {
    console.log('elementList: ', payload)
  }

  // 9. 右键菜单注册
  // 宏：从 localStorage 恢复已保存的宏
  const MACRO_STORAGE_KEY = 'canvas-editor:macros'
  const saved = localStorage.getItem(MACRO_STORAGE_KEY)
  if (saved) {
    instance.macro.importMacros(saved)
  }
  instance.register.contextMenuList([
    {
      name: 'Bình luận',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.editorHasSelection &&
          payload.zone === EditorZone.MAIN
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Bình luận',
          data: [
            {
              type: 'textarea',
              label: 'Bình luận',
              height: 100,
              name: 'value',
              required: true,
              placeholder: 'Nhập bình luận...'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({
              id: groupId,
              content: value,
              userName: 'Hufe',
              rangeText: command.getRangeText(),
              createdDate: new Date().toLocaleString()
            })
          }
        })
      }
    },
    {
      name: 'Thêm chú thích ảnh',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !payload.startElement?.imgCaption
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Thêm chú thích ảnh',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              placeholder: 'Nhập nội dung chú thích, sử dụng {imageNo} để biểu thị số thứ tự ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            command.executeSetImageCaption({
              value
            })
          }
        })
      }
    },
    {
      name: 'Sửa chú thích ảnh',
      icon: 'caption',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.startElement?.type === ElementType.IMAGE &&
          !!payload.startElement?.imgCaption
        )
      },
      callback: (command: Command, context) => {
        const currentCaption = context.startElement?.imgCaption
        new Dialog({
          title: 'Sửa chú thích ảnh',
          data: [
            {
              type: 'text',
              label: 'Nội dung chú thích',
              name: 'value',
              required: true,
              value: currentCaption?.value,
              placeholder: 'Nhập nội dung chú thích, sử dụng {imageNo} để biểu thị số thứ tự ảnh'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            command.executeSetImageCaption({
              ...currentCaption,
              value: value || ''
            })
          }
        })
      }
    },
    {
      name: 'Chữ ký tay',
      icon: 'signature',
      when: payload => {
        return !payload.isReadonly && payload.editorTextFocus
      },
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([
              {
                value,
                width,
                height,
                type: ElementType.IMAGE
              }
            ])
          }
        })
      }
    },
    {
      name: 'Chuẩn hóa định dạng',
      icon: 'word-tool',
      when: payload => {
        return !payload.isReadonly
      },
      callback: (command: Command) => {
        command.executeWordTool()
      }
    },
    {
      name: 'Mở file Word (.docx)',
      icon: 'word-tool',
      when: payload => !payload.isReadonly,
      callback: () => {
        docxFileInput?.click()
      }
    },
    {
      name: 'Xuất file Word (.docx)',
      icon: 'word-tool',
      callback: (command: Command) => {
        command.executeExportDocx({
          fileName: 'Van_ban'
        })
      }
    },
    {
      name: 'Tự động nhận diện mục lục',
      icon: 'title',
      when: payload => !payload.isReadonly,
      callback: async () => {
        autoDetectHeadings(instance, { force: true })
        if (!isCatalogShow) {
          switchCatalog()
        } else {
          await updateCatalog()
        }
      }
    },
    {
      name: 'Xóa nét vẽ tự do',
      when: payload => {
        return payload.options.mode === EditorMode.GRAFFITI
      },
      callback: (command: Command) => {
        command.executeClearGraffiti()
      }
    },
    {
      name: 'Macro',
      when: payload => !payload.isReadonly,
      childMenus: [
        {
          name: 'Bắt đầu ghi Macro',
          icon: 'record',
          when: () => !instance.macro.isRecording(),
          callback: () => {
            instance.macro.startRecording()
          }
        },
        {
          name: 'Dừng ghi Macro',
          icon: 'stop',
          when: () => instance.macro.isRecording(),
          callback: () => {
            new Dialog({
              title: 'Lưu Macro',
              data: [
                {
                  type: 'text',
                  label: 'Tên Macro',
                  name: 'name',
                  required: true,
                  placeholder: 'Nhập tên Macro'
                }
              ],
              onConfirm: payload => {
                const name = payload.find(p => p.name === 'name')?.value
                if (!name) return
                const macro = instance.macro.stopRecording(name)
                if (!macro) return
                localStorage.setItem(
                  MACRO_STORAGE_KEY,
                  instance.macro.exportMacros()
                )
              },
              onCancel: () => {
                instance.macro.cancelRecording()
              }
            })
          }
        },
        {
          name: 'Chạy Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Chạy Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro',
                  name: 'macroId',
                  required: true,
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: async payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                await instance.macro.play(id)
              }
            })
          }
        },
        {
          name: 'Quản lý Macro',
          when: () =>
            !instance.macro.isRecording() &&
            instance.macro.getMacros().length > 0,
          callback: () => {
            const macros = instance.macro.getMacros()
            new Dialog({
              title: 'Quản lý Macro',
              data: [
                {
                  type: 'select',
                  label: 'Chọn Macro cần xóa',
                  name: 'macroId',
                  options: macros.map(m => ({
                    label: `${m.name} (${m.type})`,
                    value: m.id
                  }))
                }
              ],
              onConfirm: payload => {
                const id = payload.find(p => p.name === 'macroId')?.value
                if (!id) return
                if (instance.macro.removeMacro(id)) {
                  localStorage.setItem(
                    MACRO_STORAGE_KEY,
                    instance.macro.exportMacros()
                  )
                }
              }
            })
          }
        }
      ]
    }
  ])

  // 10. 快捷键注册
  instance.register.shortcutList([
    {
      key: KeyMap.P,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePrint()
      }
    },
    {
      key: KeyMap.F,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const text = command.getRangeText()
        searchDom.click()
        if (text) {
          searchInputDom.value = text
          instance.command.executeSearch(text)
          setSearchResult()
        }
      }
    },
    {
      key: KeyMap.MINUS,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleMinus()
      }
    },
    {
      key: KeyMap.EQUAL,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleAdd()
      }
    },
    {
      key: KeyMap.ZERO,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleRecovery()
      }
    }
  ])
}
