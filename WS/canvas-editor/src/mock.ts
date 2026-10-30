import {
  ControlType,
  ElementType,
  IEditorOption,
  IElement,
  ListType,
  TitleLevel
} from './editor'

const text = `Lý do khám:\nSốt ba ngày, ho năm ngày.\nBệnh sử:\nBệnh nhân khởi phát bệnh 3 ngày trước không rõ nguyên nhân, sau cảm cúm phát hiện phù mặt, không phát ban, lượng nước tiểu giảm, mệt mỏi, điều trị ngoại trú không đỡ, nay đến khám tại bệnh viện.\nTiền sử bệnh:\nĐái tháo đường 10 năm, tăng huyết áp 2 năm, Bệnh truyền nhiễm 1 năm. Báo cáo các bệnh lý khác nếu có.\nTiền sử dịch tễ:\nKhông tiếp xúc với người bệnh xác định, ca nghi nhiễm hoặc người mang mầm bệnh trong 14 ngày qua; không đến các khu vực nguy cơ cao: chợ đầu mối, siêu thị lớn, chợ đêm; xung quanh nơi ở và cơ quan không có chùm ca bệnh; bản thân không có triệu chứng đường hô hấp bất thường; người nhà đi cùng bình thường.\nKhám lâm sàng:\nNhiệt độ: 39.5℃, Mạch: 80 lần/phút, Nhịp thở: 20 lần/phút, Huyết áp: 120/80 mmHg;\nCận lâm sàng:\nNgày 10 tháng 06 năm 2020, xét nghiệm: HCT (Hematocrit) 36.50% (thấp) 40～50; Bạch cầu Monocyte tuyệt đối 0.75*10/L (cao) tham chiếu: 0.1～0.6;\nChẩn đoán:Điều trị & Xử trí:Chữ ký điện tử:【】\nGhi chú khác:`

// Tiêu đề đề mục
const titleText = [
  'Lý do khám:',
  'Bệnh sử:',
  'Tiền sử bệnh:',
  'Tiền sử dịch tễ:',
  'Khám lâm sàng:',
  'Cận lâm sàng:',
  'Chẩn đoán:',
  'Điều trị & Xử trí:',
  'Chữ ký điện tử:',
  'Ghi chú khác:'
]
const titleMap: Map<number, string> = new Map()
for (let t = 0; t < titleText.length; t++) {
  const value = titleText[t]
  const i = text.indexOf(value)
  if (~i) {
    titleMap.set(i, value)
  }
}

// Chữ đổi màu đỏ
const colorText = ['Bệnh truyền nhiễm']
const colorIndex: number[] = colorText
  .map(b => {
    const i = text.indexOf(b)
    return ~i
      ? Array(b.length)
          .fill(i)
          .map((_, j) => i + j)
      : []
  })
  .flat()

// Chữ highlight vàng (gắn kèm bình luận)
const highlightText = ['HCT (Hematocrit)']
const highlightIndex: number[] = highlightText
  .map(b => {
    const i = text.indexOf(b)
    return ~i
      ? Array(b.length)
          .fill(i)
          .map((_, j) => i + j)
      : []
  })
  .flat()

const elementList: IElement[] = []
const textList = text.split('')
let index = 0
while (index < textList.length) {
  const value = textList[index]
  const title = titleMap.get(index)
  if (title) {
    elementList.push({
      value: '',
      type: ElementType.TITLE,
      level: TitleLevel.FIRST,
      valueList: [
        {
          value: title,
          size: 18
        }
      ]
    })
    index += title.length - 1
  } else if (colorIndex.includes(index)) {
    elementList.push({
      value,
      color: '#FF0000',
      size: 16
    })
  } else if (highlightIndex.includes(index)) {
    elementList.push({
      value,
      highlight: '#F2F27F',
      groupIds: ['1']
    })
  } else {
    elementList.push({
      value,
      size: 16
    })
  }
  index++
}

function findIndexAfterText(pattern: string): number {
  let accumulated = ''
  for (let i = 0; i < elementList.length; i++) {
    const el = elementList[i]
    accumulated +=
      (el.valueList && el.valueList[0] ? el.valueList[0].value : el.value) || ''
    if (accumulated.endsWith(pattern)) {
      return i + 1
    }
  }
  return -1
}

function findIndexBeforeText(pattern: string): number {
  let accumulated = ''
  for (let i = 0; i < elementList.length; i++) {
    const el = elementList[i]
    const prev = accumulated
    accumulated +=
      (el.valueList && el.valueList[0] ? el.valueList[0].value : el.value) || ''
    if (accumulated.includes(pattern) && !prev.includes(pattern)) {
      return i - pattern.length + 1
    }
  }
  return -1
}

// 1. Trường văn bản (Bổ sung khác)
const pos1 = findIndexAfterText('ho năm ngày.')
if (pos1 !== -1) {
  elementList.splice(pos1, 0, {
    type: ElementType.CONTROL,
    value: '',
    control: {
      conceptId: '1',
      type: ControlType.TEXT,
      value: null,
      placeholder: 'Bổ sung khác',
      prefix: '{',
      postfix: '}'
    }
  })
}

// 2. Trường danh sách chọn (Có/Không)
const pos2 = findIndexBeforeText('Báo cáo các bệnh lý khác nếu có.')
if (pos2 !== -1) {
  elementList.splice(pos2, 0, {
    type: ElementType.CONTROL,
    value: '',
    control: {
      conceptId: '2',
      type: ControlType.SELECT,
      value: null,
      code: null,
      placeholder: 'Có/Không',
      prefix: '{',
      postfix: '}',
      valueSets: [
        {
          value: 'Có',
          code: '98175'
        },
        {
          value: 'Không',
          code: '98176'
        },
        {
          value: 'Không rõ',
          code: '98177'
        }
      ]
    }
  })
}

// 3. Liên kết COVID-19
const posLink = findIndexBeforeText('trong 14 ngày qua')
if (posLink !== -1) {
  elementList.splice(posLink, 0, {
    type: ElementType.HYPERLINK,
    value: '',
    valueList: [
      { value: 'C', size: 16 },
      { value: 'O', size: 16 },
      { value: 'V', size: 16 },
      { value: 'I', size: 16 },
      { value: 'D', size: 16 },
      { value: '-', size: 16 },
      { value: '1', size: 16 },
      { value: '9', size: 16 },
      { value: ' ', size: 16 }
    ],
    url: 'https://hufe.club/canvas-editor'
  })
}

// 4. Trường văn bản ghi chú khác
const pos4 = findIndexAfterText('người nhà đi cùng bình thường.')
if (pos4 !== -1) {
  elementList.splice(pos4, 0, {
    type: ElementType.CONTROL,
    value: '',
    control: {
      conceptId: '6',
      type: ControlType.TEXT,
      value: null,
      placeholder: 'Nội dung',
      preText: ' Khác: ',
      postText: '.'
    }
  })
}

// 5. Chỉ số dưới (Delta)
const pos5 = findIndexAfterText('Nhiệt độ: 39.5℃')
if (pos5 !== -1) {
  elementList.splice(pos5, 0, {
    value: '∆',
    color: '#FF0000',
    type: ElementType.SUBSCRIPT
  })
}

// 6. Chỉ số trên (mũ 9)
const pos6 = findIndexAfterText('0.75*10')
if (pos6 !== -1) {
  elementList.splice(pos6, 0, {
    value: '9',
    type: ElementType.SUPERSCRIPT
  })
}

// 7. Danh sách chẩn đoán
const pos7 = findIndexAfterText('Chẩn đoán:')
if (pos7 !== -1) {
  elementList.splice(pos7, 0, {
    value: '',
    type: ElementType.LIST,
    listType: ListType.OL,
    valueList: [
      {
        value:
          'Tăng huyết áp\nĐái tháo đường\nCảm cúm do virus\nViêm mũi dị ứng\nPolyp mũi dị ứng'
      }
    ]
  })
}

// 8. Danh sách điều trị & xử trí
const pos8 = findIndexAfterText('Điều trị & Xử trí:')
if (pos8 !== -1) {
  elementList.splice(pos8, 0, {
    value: '',
    type: ElementType.LIST,
    listType: ListType.OL,
    valueList: [
      {
        value:
          'Chọc hút kim nhỏ tuyến giáp dưới hướng dẫn siêu âm;\nXét nghiệm kháng thể bề mặt virus viêm gan B;\nLấy mẫu tế bào học tổn thương màng, dưới da vùng gáy;'
      }
    ]
  })
}

// 9. Chữ ký hình ảnh
const pos9 = findIndexAfterText('【')
if (pos9 !== -1) {
  elementList.splice(pos9, 0, {
    value: `data:image/png;base64,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`,
    width: 89,
    height: 32,
    id: 'signature',
    type: ElementType.IMAGE
  })
}

// 10. Bảng biểu
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 180 },
    { width: 80 },
    { width: 130 },
    { width: 130 }
  ],
  trList: [
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 2,
          value: [{ value: `1`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `2`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 2,
          rowspan: 1,
          value: [{ value: `3`, size: 16 }, { value: '.', size: 16 }]
        }
      ]
    },
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `4`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `5`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `6`, size: 16 }, { value: '.', size: 16 }]
        }
      ]
    },
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `7`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `8`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [{ value: `9`, size: 16 }, { value: '.', size: 16 }]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `1`, size: 16 },
            { value: `0`, size: 16 },
            { value: '.', size: 16 }
          ]
        }
      ]
    }
  ]
})

// 11. Checkbox đồng ý
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Xác nhận đồng ý các nội dung trên: '
    },
    {
      type: ElementType.CONTROL,
      control: {
        conceptId: '3',
        type: ControlType.CHECKBOX,
        code: '98175',
        value: '',
        valueSets: [
          {
            value: 'Đồng ý',
            code: '98175'
          },
          {
            value: 'Từ chối',
            code: '98176'
          }
        ]
      },
      value: ''
    },
    {
      value: '\n'
    }
  ])
)

// 12. LaTex
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Công thức y học: '
    },
    {
      value: `{E_k} = hv - {W_0}`,
      type: ElementType.LATEX
    },
    {
      value: '\n'
    }
  ])
)

// 13. Ngày ký
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Ngày ký: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '5',
        type: ControlType.DATE,
        value: [
          {
            value: `2022-08-10 17:30:01`
          }
        ],
        placeholder: 'Ngày ký'
      }
    },
    {
      value: '\n'
    }
  ])
)

// 14. Nhãn chẩn đoán
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Nhãn chẩn đoán: '
    },
    {
      type: ElementType.LABEL,
      value: 'Tăng huyết áp',
      labelId: 'l1',
      size: 14
    },
    {
      value: '\n'
    }
  ])
)

// 15. Chữ ký bệnh nhân gạch chân cố định
elementList.push(
  ...[
    {
      value: 'Chữ ký bệnh nhân: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '4',
        type: ControlType.TEXT,
        value: null,
        placeholder: '',
        prefix: '\u200c',
        postfix: '\u200c',
        minWidth: 160,
        underline: true
      }
    }
  ]
)

// 16. Số lần khám
elementList.push(
  ...[
    {
      value: '\nSố lần khám: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '7',
        type: ControlType.NUMBER,
        value: null,
        placeholder: 'Số lần',
        prefix: '{',
        postfix: '}',
        numberExclusiveOptions: {
          calculatorDisabled: false
        }
      }
    }
  ]
)

// 17. Phân độ tăng huyết áp (Cascade)
elementList.push(
  ...(<IElement[]>[
    {
      value: '\nTiền sử tăng huyết áp: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: 'hypertension',
        type: ControlType.SELECT,
        value: null,
        code: null,
        placeholder: 'Có/Không',
        prefix: '{',
        postfix: '}',
        valueSets: [
          {
            value: 'Có',
            code: '1'
          },
          {
            value: 'Không',
            code: '0'
          }
        ],
        cascade: [
          {
            expression: "getValue(@self) == '1'",
            actions: [
              {
                conceptId: 'hypertensionLevel',
                effects: {
                  hide: false,
                  required: true
                }
              }
            ]
          }
        ]
      }
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        preText: ', phân độ tăng huyết áp: ',
        conceptId: 'hypertensionLevel',
        type: ControlType.SELECT,
        value: null,
        code: null,
        placeholder: 'Phân độ',
        prefix: '{',
        postfix: '}',
        hide: true,
        valueSets: [
          {
            value: 'Độ I',
            code: '1'
          },
          {
            value: 'Độ II',
            code: '2'
          },
          {
            value: 'Độ III',
            code: '3'
          }
        ]
      }
    }
  ])
)

// 18. Tính toán BMI tự động
elementList.push(
  ...(<IElement[]>[
    {
      value: '\nChiều cao: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        postText: 'cm',
        conceptId: 'height',
        type: ControlType.NUMBER,
        value: null,
        placeholder: 'Chiều cao',
        prefix: '{',
        postfix: '}',
        required: true,
        validation: {
          min: 0,
          max: 300
        }
      }
    },
    {
      value: ', cân nặng: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        postText: 'kg',
        conceptId: 'weight',
        type: ControlType.NUMBER,
        value: null,
        placeholder: 'Cân nặng',
        prefix: '{',
        postfix: '}'
      }
    },
    {
      value: ', chỉ số BMI: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: 'bmi',
        type: ControlType.NUMBER,
        value: null,
        placeholder: 'Tự động tính',
        prefix: '{',
        postfix: '}',
        compute:
          "round(getValue('weight') / ((getValue('height') * getValue('height')) / 10000), 2)",
        cascade: [
          {
            expression: 'getValue(@self) > 28',
            actions: [
              {
                conceptId: 'obesityTip',
                effects: {
                  hide: false,
                  required: true
                }
              }
            ]
          }
        ]
      }
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        preText: ', tư vấn can thiệp béo phì: ',
        conceptId: 'obesityTip',
        type: ControlType.TEXT,
        value: null,
        placeholder: 'Khuyến nghị can thiệp',
        prefix: '{',
        postfix: '}',
        hide: true
      }
    }
  ])
)

// 19. Kết thúc
elementList.push(
  ...[
    {
      value: '\n'
    },
    {
      value: '',
      type: ElementType.TAB
    },
    {
      value: 'E',
      size: 16
    },
    {
      value: 'O',
      size: 16
    },
    {
      value: 'F',
      size: 16
    }
  ]
)

export const mockData: IElement[] = elementList
export const data: IElement[] = []

interface IComment {
  id: string
  content: string
  userName: string
  rangeText: string
  createdDate: string
}
export const mockCommentList: IComment[] = [
  {
    id: '1',
    content:
      'Thể tích khối hồng cầu (HCT) là tỷ lệ phần trăm thể tích hồng cầu trên toàn bộ thể tích máu, dùng để phản ánh tỷ lệ giữa hồng cầu và huyết tương.',
    userName: 'Bác sĩ',
    rangeText: 'HCT (Hematocrit)',
    createdDate: '2023-08-20 23:10:55'
  }
]
export const commentList: IComment[] = []

export const options: IEditorOption = {
  locale: 'vi',
  scale: 0.8,
  defaultFont: 'Times New Roman',
  defaultColor: '#000000',
  margins: [100, 120, 100, 120],
  lab: {
    incrementalCompute: true
  },
  trace: {
    author: 'Người dùng 1'
  },
  watermark: {
    data: '',
    size: 120
  },
  header: {
    editable: false
  },
  footer: {
    editable: false
  },
  pageNumber: {
    disabled: true,
    format: 'Trang {pageNo} / {pageCount}'
  },
  placeholder: {
    data: 'Nhập nội dung văn bản...'
  },
  zone: {
    tipDisabled: false
  },
  pageBreak: {
    disabled: true
  },
  maskMargin: [64, 0, 38, 0]
}
