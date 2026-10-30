import { describe, it, expect } from 'vitest'
import { mergeOption } from '@/editor/utils/option'
import {
  getTitleFormatting,
  applyHeadingTextCase
} from '@/editor/dataset/constant/Title'
import { TitleLevel } from '@/editor/dataset/enum/Title'
import { formatOrderedListMarker } from '@/editor/dataset/constant/List'
import { ListStyle, ListType } from '@/editor/dataset/enum/List'
import { zipElementList } from '@/editor/utils/element'
import { getCatalog } from '@/editor/core/worker/works/catalog'

describe('mergeOption', () => {
  it('空参数返回完整默认配置', () => {
    const options = mergeOption()
    expect(options.width).toBe(794)
    expect(options.height).toBe(1123)
    expect(options.defaultSize).toBe(13)
    expect(options.defaultFont).toBe('Times New Roman')
  })

  it('自定义 width 覆盖默认值', () => {
    const options = mergeOption({ width: 500 })
    expect(options.width).toBe(500)
    expect(options.height).toBe(1123)
  })

  it('嵌套 table 默认值合并', () => {
    const options = mergeOption({
      table: { tdPadding: [0, 10, 10, 10] as any }
    })
    expect(options.table.tdPadding).toEqual([0, 10, 10, 10])
    expect(options.table.defaultBorderColor).toBeDefined()
  })

  it('header disabledPages 合并', () => {
    const options = mergeOption({ header: { disabledPages: [0, 2] } })
    expect(options.header.disabledPages).toEqual([0, 2])
    expect(options.header.disabled).toBe(false)
  })

  it('footer disabledPages 合并', () => {
    const options = mergeOption({ footer: { disabledPages: [0] } })
    expect(options.footer.disabledPages).toEqual([0])
    expect(options.footer.bottom).toBeDefined()
  })

  it('#1405 回归:恶意原型键不污染', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}')
    mergeOption(malicious)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('hint 总开关默认关闭', () => {
    const options = mergeOption()
    expect(options.hint.disabled).toBe(true)
    expect(options.hint.color).toBeDefined()
    expect(options.hint.maxWidth).toBeGreaterThan(0)
  })

  it('hint 配置可覆盖默认值', () => {
    const options = mergeOption({
      hint: { disabled: false, color: '#ff0000', maxWidth: 200 }
    })
    expect(options.hint.disabled).toBe(false)
    expect(options.hint.color).toBe('#ff0000')
    expect(options.hint.maxWidth).toBe(200)
  })

  it('spellcheck 使用默认配置', () => {
    const options = mergeOption()
    expect(options.spellcheck.disabled).toBe(true)
    expect(options.spellcheck.color).toBe('#FF0000')
  })

  it('spellcheck 配置可覆盖默认值', () => {
    const options = mergeOption({
      spellcheck: { disabled: false, color: '#00FF00' }
    })
    expect(options.spellcheck.disabled).toBe(false)
    expect(options.spellcheck.color).toBe('#00FF00')
  })

  it('Heading 1-6 formatting and text case rules match ISO Word specification', () => {
    expect(getTitleFormatting(TitleLevel.FIRST)).toEqual({
      size: 16,
      bold: true,
      italic: false
    })
    expect(getTitleFormatting(TitleLevel.SECOND)).toEqual({
      size: 14,
      bold: true,
      italic: false
    })
    expect(getTitleFormatting(TitleLevel.THIRD)).toEqual({
      size: 13,
      bold: true,
      italic: false
    })
    expect(getTitleFormatting(TitleLevel.FOURTH)).toEqual({
      size: 13,
      bold: true,
      italic: true
    })
    expect(getTitleFormatting(TitleLevel.FIFTH)).toEqual({
      size: 13,
      bold: true,
      italic: true
    })
    expect(getTitleFormatting(TitleLevel.SIXTH)).toEqual({
      size: 13,
      bold: false,
      italic: true
    })

    const h1Chars = '1. mục đích và phạm vi'.split('').map(c => ({ value: c }))
    applyHeadingTextCase(h1Chars, TitleLevel.FIRST)
    expect(h1Chars.map(c => c.value).join('')).toBe('1. MỤC ĐÍCH VÀ PHẠM VI')

    const h2Chars = '1.1. quy trình kiểm soát chất lượng'
      .split('')
      .map(c => ({ value: c }))
    applyHeadingTextCase(h2Chars, TitleLevel.SECOND)
    expect(h2Chars.map(c => c.value).join('')).toBe(
      '1.1. Quy Trình Kiểm Soát Chất Lượng'
    )

    const h3Chars = '1.1.1. kiểm tra nguyên vật liệu đầu vào'
      .split('')
      .map(c => ({ value: c }))
    applyHeadingTextCase(h3Chars, TitleLevel.THIRD)
    expect(h3Chars.map(c => c.value).join('')).toBe(
      '1.1.1. Kiểm tra nguyên vật liệu đầu vào'
    )
  })

  it('Ordered list markers and zipElementList preserve listId across interrupted lists', () => {
    expect(formatOrderedListMarker(0, ListStyle.DECIMAL)).toBe('1.')
    expect(formatOrderedListMarker(1, ListStyle.DECIMAL_PAREN)).toBe('2)')
    expect(formatOrderedListMarker(0, ListStyle.LOWER_ALPHA)).toBe('a.')
    expect(formatOrderedListMarker(2, ListStyle.LOWER_ALPHA_PAREN)).toBe('c)')
    expect(formatOrderedListMarker(3, ListStyle.LOWER_ROMAN)).toBe('iv.')

    const zipped = zipElementList([
      {
        value: '\n',
        listId: 'shared_ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'A',
        listId: 'shared_ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: '\n',
        listId: 'sub_ul_1',
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      },
      {
        value: 'B',
        listId: 'sub_ul_1',
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      },
      {
        value: '\n',
        listId: 'shared_ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'C',
        listId: 'shared_ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      }
    ] as any)

    expect(zipped.length).toBe(3)
    expect(zipped[0].listId).toBe('shared_ol_1')
    expect(zipped[2].listId).toBe('shared_ol_1')
  })

  it('getCatalog includes numbered list items (1., 2., 3., 4.) nested under parent heading', () => {
    const ZERO = '\u200B'
    const elementList: any[] = [
      {
        value: 'CHÍNH SÁCH LAO ĐỘNG NỮ',
        titleId: 'title_main',
        level: TitleLevel.FIRST
      },
      {
        value: ZERO,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'Được cải thiện điều kiện lao động: ',
        bold: true,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'Công ty đảm bảo có đủ buồng tắm, buồng vệ sinh tại nơi làm việc.',
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: ZERO,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'Được hưởng các điều kiện chăm sóc sức khỏe như sau:',
        bold: true,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: ZERO,
        listId: 'ul_sub',
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      },
      {
        value: 'Khi khám sức khỏe định kỳ được khám chuyên khoa phụ sản;',
        listId: 'ul_sub',
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      },
      {
        value: ZERO,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value:
          'Được quyền đơn phương chấm dứt hợp đồng hoặc tạm hoãn thực hiện hợp đồng lao động ',
        bold: true,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'nếu có xác nhận của cơ sở khám, chữa bệnh có thẩm quyền.',
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: ZERO,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'Được người sử dụng lao động hỗ trợ ',
        bold: true,
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: 'trong việc xây dựng nhà trẻ, lớp mẫu giáo.',
        listId: 'ol_1',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      }
    ]

    const catalog = getCatalog({
      elementList,
      positionList: []
    })

    expect(catalog).not.toBeNull()
    expect(catalog!.length).toBe(1)
    expect(catalog![0].name).toBe('CHÍNH SÁCH LAO ĐỘNG NỮ')
    expect(catalog![0].subCatalog.map(s => s.name)).toEqual([
      '1. Được cải thiện điều kiện lao động',
      '2. Được hưởng các điều kiện chăm sóc sức khỏe như sau',
      '3. Được quyền đơn phương chấm dứt hợp đồng hoặc tạm hoãn thực hiện hợp đồng lao động',
      '4. Được người sử dụng lao động hỗ trợ'
    ])
  })

  it('computeChiMucIndentMap indents content lines below each chỉ mục (1. MỤC ĐÍCH, 1.ádhasd) by 1 tab', async () => {
    const { Draw } = await import('../../src/editor/core/draw/Draw')
    const ZERO = '\u200B'
    const mockDraw = {
      options: {
        defaultTabWidth: 32
      }
    }
    const elementList: any[] = [
      { value: ZERO },
      { value: '1. MỤC ĐÍCH', bold: true },
      { value: ZERO },
      { value: 'Chính sách này nhằm thiết lập...' },
      { value: ZERO },
      { value: '1.ádhasd' },
      { value: ZERO },
      { value: 'Dòng nội dung dưới thụt vào 1 tab' }
    ]

    const indentMap = Draw.prototype.computeChiMucIndentMap.call(
      mockDraw,
      elementList,
      1
    )

    // Dòng chỉ mục 1 (index 0, 1) không thụt lề
    expect(indentMap.get(0)).toBeUndefined()
    expect(indentMap.get(1)).toBeUndefined()
    // Dòng nội dung dưới chỉ mục 1 (index 2, 3) thụt vào 1 tab (32px)
    expect(indentMap.get(2)).toBe(32)
    expect(indentMap.get(3)).toBe(32)
    // Dòng chỉ mục 2 '1.ádhasd' (index 4, 5) không thụt lề
    expect(indentMap.get(4)).toBeUndefined()
    expect(indentMap.get(5)).toBeUndefined()
    // Dòng nội dung dưới '1.ádhasd' (index 6, 7) thụt vào 1 tab (32px)
    expect(indentMap.get(6)).toBe(32)
    expect(indentMap.get(7)).toBe(32)
  })

  it('computeRowList indents only the first line of paragraph under chi muc, while wrapped lines start at left margin (offsetX = 0)', async () => {
    const { Editor } = await import('../../src/editor')
    const container = document.createElement('div')
    const ZERO = '\u200B'
    const longText = 'Công ty cổ phần VINA G7 hiểu rõ tầm quan trọng và tôn trọng quyền bảo mật thông tin cá nhân của Người lao động, Khách hàng và các bên có liên quan khi làm việc, sử dụng dịch vụ của Công ty Cổ phần VINA G7 tạiCCN Tam Phước 1, KP Long Khánh, Tam Phước, Biên Hòa, Đồng Nai. '.repeat(5)
    const editor = new Editor(container, [
      { value: '1. MỤC ĐÍCH', bold: true },
      { value: ZERO },
      { value: longText }
    ], {
      width: 300,
      defaultTabWidth: 32
    })
    const rowList = editor.draw.getRowList()
    // Row 0: Heading -> offsetX = 0
    expect(rowList[0].offsetX || 0).toBe(0)
    // Row 1: Paragraph first line -> offsetX = 32
    expect(rowList[1].offsetX).toBe(32)
    // Row 2+: Continuation wrapped lines -> offsetX = 0
    expect(rowList.length).toBeGreaterThanOrEqual(3)
    for (let r = 2; r < rowList.length; r++) {
      expect(rowList[r].offsetX).toBe(0)
    }
  })

  it('getCatalog preserves I., II., III. Roman hierarchy and nests bold a., b. definitions while skipping unbolded sub-list prose', () => {
    const ZERO = '\u200B'
    const elementList: any[] = [
      {
        value: 'CHÍNH SÁCH ĐẠO ĐỨC KINH DOANH',
        titleId: 'title_cs07',
        level: TitleLevel.FIRST
      },
      {
        value: ZERO,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: 'Phạm vi áp dụng',
        bold: true,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: ZERO,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: 'Định nghĩa',
        bold: true,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: ZERO,
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: 'Hối lộ',
        bold: true,
        italic: true,
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: ' là hành vi dùng tiền, vật chất...',
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: ZERO,
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: 'Tham nhũng',
        bold: true,
        italic: true,
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: ' là hành vi của một tổ chức hay cá nhân...',
        listId: 'alpha_def',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value: ZERO,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: 'Nghiêm cấm các hành vi hối lộ',
        bold: true,
        listId: 'roman_1',
        listType: ListType.OL,
        listStyle: ListStyle.UPPER_ROMAN
      },
      {
        value: ZERO,
        listId: 'alpha_sec3',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      },
      {
        value:
          'Trong mọi trường hợp, không bao giờ thông đồng, móc nối để đưa tiền;',
        listId: 'alpha_sec3',
        listType: ListType.OL,
        listStyle: ListStyle.LOWER_ALPHA
      }
    ]

    const catalog = getCatalog({
      elementList,
      positionList: []
    })

    expect(catalog).not.toBeNull()
    expect(catalog!.length).toBe(1)
    expect(catalog![0].name).toBe('CHÍNH SÁCH ĐẠO ĐỨC KINH DOANH')
    expect(catalog![0].subCatalog.map(s => s.name)).toEqual([
      'I. Phạm vi áp dụng',
      'II. Định nghĩa',
      'III. Nghiêm cấm các hành vi hối lộ'
    ])
    expect(catalog![0].subCatalog[1].subCatalog.map(s => s.name)).toEqual([
      'a. Hối lộ',
      'b. Tham nhũng'
    ])
    expect(catalog![0].subCatalog[2].subCatalog).toEqual([])
  })
})
