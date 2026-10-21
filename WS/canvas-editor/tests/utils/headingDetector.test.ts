import { describe, it, expect, vi } from 'vitest'
import { autoDetectHeadings } from '@/utils/headingDetector'
import { TitleLevel, IElement } from '@/editor'

describe('autoDetectHeadings', () => {
  it('detects Roman numerals and numbered sections from document elements', () => {
    const mainList: IElement[] = [
      { value: 'II. THỐNG KÊ CHI TIẾT SỐ LƯỢNG PHIẾU KIỂM TRA', bold: true },
      { value: '\n' },
      { value: '1. Phân loại theo từng Công đoạn sản xuất', bold: true, color: '#C00000' },
      { value: '\n' },
      { value: 'Nội dung bảng số liệu hoặc văn bản bình thường không phải tiêu đề.' },
      { value: '\n' },
      { value: '2. Phân loại theo từng Loại phiếu kiểm định', bold: true },
      { value: '\n' }
    ]

    const fakeInstance: any = {
      command: {
        getValue: vi.fn().mockReturnValue({
          data: {
            header: [],
            main: mainList,
            footer: []
          }
        }),
        executeSetValue: vi.fn()
      }
    }

    const count = autoDetectHeadings(fakeInstance)
    expect(count).toBe(3)
    expect(fakeInstance.command.executeSetValue).toHaveBeenCalled()

    // Roman numeral should be FIRST
    expect(mainList[0].level).toBe(TitleLevel.FIRST)
    expect(mainList[0].titleId).toBeDefined()

    // Numbered sections should be SECOND (since document has Roman numeral)
    expect(mainList[2].level).toBe(TitleLevel.SECOND)
    expect(mainList[2].titleId).toBeDefined()
    expect(mainList[6].level).toBe(TitleLevel.SECOND)
    expect(mainList[6].titleId).toBeDefined()

    // Normal text paragraph should NOT have level or titleId
    expect((mainList[4] as any).level).toBeUndefined()
    expect((mainList[4] as any).titleId).toBeUndefined()
  })

  it('skips auto-detection when headings already exist and force is false', () => {
    const mainList = [
      { value: 'Tiêu đề có sẵn', titleId: 'uuid-1', level: TitleLevel.FIRST },
      { value: '\n' },
      { value: '1. Mục con', bold: true },
      { value: '\n' }
    ]

    const fakeInstance: any = {
      command: {
        getValue: vi.fn().mockReturnValue({
          data: { header: [], main: mainList, footer: [] }
        }),
        executeSetValue: vi.fn()
      }
    }

    const count = autoDetectHeadings(fakeInstance, { force: false })
    expect(count).toBe(0)
    expect(fakeInstance.command.executeSetValue).not.toHaveBeenCalled()
  })

  it('re-detects when force is true', () => {
    const mainList: IElement[] = [
      { value: 'I. PHẦN MỞ ĐẦU', bold: true },
      { value: '\n' },
      { value: '1. Giới thiệu', bold: true },
      { value: '\n' }
    ]

    const fakeInstance: any = {
      command: {
        getValue: vi.fn().mockReturnValue({
          data: { header: [], main: mainList, footer: [] }
        }),
        executeSetValue: vi.fn()
      }
    }

    const count = autoDetectHeadings(fakeInstance, { force: true })
    expect(count).toBe(2)
    expect(mainList[0].level).toBe(TitleLevel.FIRST)
    expect(mainList[2].level).toBe(TitleLevel.SECOND)
  })
})
