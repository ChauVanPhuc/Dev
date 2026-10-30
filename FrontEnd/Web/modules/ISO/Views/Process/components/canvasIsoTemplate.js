import logoCty from '../utils/logoCty';

/**
 * Tạo dữ liệu mẫu khởi tạo chuẩn ISO cho Canvas Editor:
 * - Trang 1: Trang bìa đầy đủ Logo VINA G7, bảng mã hiệu, bảng trách nhiệm ký duyệt
 * - Trang 2: Bảng Theo dõi sửa đổi nội dung tài liệu
 * - Trang 3+: Các đề mục tiêu chuẩn từ 1 đến 7
 */
export const buildDefaultISOElements = (formData = {}) => {
  const cleanTitle = (formData.name || formData.code || 'QUY TRÌNH QUẢN LÝ').trim().toUpperCase();
  const docCode = formData.code || formData.new_code || 'QT-001';
  const version = formData.version || '01';
  const issueDate = formData.issue_date || new Date().toISOString().split('T')[0];
  const deptName = formData.department_name || 'Công ty CP VINA G7';
  const issuer = formData.editor || formData.owner || 'Người biên soạn';
  const approver = formData.approver || 'Đặng Văn Nam';
  const approverBgd = formData.approver_bgd || 'Nguyễn Hòa';
  const isCompanyLevel = (formData.document_level || 'Cấp công ty') === 'Cấp công ty';

  // 1. TẠO TRANG BÌA (COVER PAGE) - Khung đơn thống nhất chuẩn VINA G7
  // Khổ rộng 718px tương ứng lề 2 bên 1cm (10mm) trên khổ giấy A4
  const coverElements = [
    {
      type: 'table',
      id: 'iso-cover-table',
      noSplit: true,
      rowMargin: 0,
      colgroup: [{ width: 160 }, { width: 210 }, { width: 150 }, { width: 198 }],
      trList: [
        // Hàng 0: Header Logo VINA G7 và Tên Công Ty (Cao ~85px)
        {
          height: 85,
          minHeight: 85,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              width: 160,
              verticalAlign: 'middle',
              value: [
                {
                  type: 'image',
                  value: logoCty,
                  width: 105,
                  height: 55,
                  rowFlex: 'center'
                }
              ]
            },
            {
              colspan: 3,
              rowspan: 1,
              width: 558,
              verticalAlign: 'middle',
              value: [
                {
                  value: 'CÔNG TY CỔ PHẦN VINA G7',
                  bold: true,
                  size: 20,
                  font: 'Times New Roman',
                  rowFlex: 'center'
                }
              ]
            }
          ]
        },
        // Hàng 1: Khung Tên Tài Liệu (Cao ~490px, căn giữa cả chiều dọc và chiều ngang)
        {
          height: 490,
          minHeight: 490,
          tdList: [
            {
              colspan: 4,
              rowspan: 1,
              width: 718,
              verticalAlign: 'middle',
              value: [
                {
                  value: cleanTitle,
                  bold: true,
                  size: 24,
                  font: 'Times New Roman',
                  rowFlex: 'center',
                  titleId: 'iso-title-cover-page'
                }
              ]
            }
          ]
        },
        // Hàng 2: Tiêu đề Bảng Trách Nhiệm (Cao ~38px)
        {
          height: 38,
          minHeight: 38,
          tdList: [
            { colspan: 1, rowspan: 1, width: 160, verticalAlign: 'middle', value: [{ value: 'TRÁCH NHIỆM', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 210, verticalAlign: 'middle', value: [{ value: 'HỌ TÊN', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 150, verticalAlign: 'middle', value: [{ value: 'CHỨC VỤ', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 198, verticalAlign: 'middle', value: [{ value: 'KÝ TÊN', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        },
        // Hàng 3: Biên soạn
        {
          height: 65,
          minHeight: 65,
          tdList: [
            { colspan: 1, rowspan: 1, width: 160, verticalAlign: 'middle', value: [{ value: 'Biên soạn', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 210, verticalAlign: 'middle', value: [{ value: issuer, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 150, verticalAlign: 'middle', value: [{ value: formData.issuer_role || 'Nhân viên', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, width: 198, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
          ]
        },
        // Hàng 4 (Xem xét nếu Cấp công ty) hoặc Phê duyệt
        ...(isCompanyLevel ? [
          {
            height: 65,
            minHeight: 65,
            tdList: [
              { colspan: 1, rowspan: 1, width: 160, verticalAlign: 'middle', value: [{ value: 'Xem xét', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 210, verticalAlign: 'middle', value: [{ value: approver, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 150, verticalAlign: 'middle', value: [{ value: 'Trưởng phòng', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 198, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
            ]
          },
          {
            height: 65,
            minHeight: 65,
            tdList: [
              { colspan: 1, rowspan: 1, width: 160, verticalAlign: 'middle', value: [{ value: 'Phê duyệt', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 210, verticalAlign: 'middle', value: [{ value: approverBgd, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 150, verticalAlign: 'middle', value: [{ value: 'Ban Giám Đốc', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 198, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
            ]
          }
        ] : [
          {
            height: 65,
            minHeight: 65,
            tdList: [
              { colspan: 1, rowspan: 1, width: 160, verticalAlign: 'middle', value: [{ value: 'Phê duyệt', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 210, verticalAlign: 'middle', value: [{ value: approver, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 150, verticalAlign: 'middle', value: [{ value: 'Trưởng phòng', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
              { colspan: 1, rowspan: 1, width: 198, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
            ]
          }
        ])
      ]
    },
    // Ngắt sang Trang 2
    { type: 'pageBreak', value: '' }
  ];

  // 2. TẠO TRANG 2: THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
  const revLogs = (formData.revision_logs && formData.revision_logs.length > 0)
    ? formData.revision_logs
    : [{ seq_no: 1, rev_date: issueDate, content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }];

  const revRows = [
    {
      height: 35,
      tdList: [
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Số TT', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Ngày Sửa', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Nội Dung Sửa Đổi', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Trang Số', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] }
      ]
    }
  ];

  // Thêm ít nhất 15 dòng để bảng trang 2 kín trang A4 chuyên nghiệp
  const maxRows = Math.max(15, revLogs.length);
  for (let i = 0; i < maxRows; i++) {
    const item = revLogs[i] || {};
    const formattedDate = (item.rev_date || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
    revRows.push({
      height: 46,
      tdList: [
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: item.seq_no ? String(item.seq_no).padStart(2, '0') : '', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: formattedDate, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: item.content || '', size: 12, font: 'Times New Roman' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: item.page_no || '', size: 12, font: 'Times New Roman', rowFlex: 'center' }] }
      ]
    });
  }

  const revLogElements = [
    {
      value: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU',
      bold: true,
      size: 15,
      font: 'Times New Roman',
      rowFlex: 'center'
    },
    { value: '\n' },
    {
      type: 'table',
      colgroup: [{ width: 70 }, { width: 120 }, { width: 428 }, { width: 100 }],
      trList: revRows
    },
    // Ngắt sang Trang 3 (Nội dung)
    { type: 'pageBreak', value: '' }
  ];

  // 3. TẠO TRANG 3: MẶC ĐỊNH HOÀN TOÀN TRỐNG CHO NGƯỜI DÙNG TỰ DO SOẠN THẢO
  const bodyElements = [
    { value: '\n', size: 14, font: 'Times New Roman' }
  ];

  return [...coverElements, ...revLogElements, ...bodyElements];
};

/**
 * Tạo bảng 4 cột Lưu đồ quy trình chuẩn ISO từ danh sách bước (steps)
 */
export const buildFlowchartTableFromSteps = (steps = []) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  const headerRow = {
    height: 35,
    tdList: [
      { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Bước', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
      { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Trách nhiệm', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
      { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Nội dung thực hiện', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
      { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Biểu mẫu / Hồ sơ', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] }
    ]
  };

  const rows = [headerRow];
  steps.forEach((st, idx) => {
    rows.push({
      height: 40,
      tdList: [
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: `B${st.step_number || (idx + 1)}`, bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: st.responsibility || st.role || 'Người thực hiện', size: 11, font: 'Times New Roman' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: st.name || st.content || '', size: 11, font: 'Times New Roman' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: st.template_files || st.template || '---', size: 11, font: 'Times New Roman' }] }
      ]
    });
  });

  return {
    type: 'table',
    colgroup: [{ width: 70 }, { width: 160 }, { width: 338 }, { width: 150 }],
    trList: rows
  };
};

/**
 * Tạo chân trang chuẩn ISO ăn theo metadata quy trình (Mã hiệu, Ngày ban hành, Lần ban hành, Trang)
 */

/**
 * Tạo bảng 4 cột Mục 6: Danh mục biểu mẫu và hồ sơ lưu trữ cho Canvas Editor
 * Ăn theo các biểu mẫu được gán trong các bước lưu đồ quy trình (steps)
 */
export const buildFormsTableFromSteps = (steps = [], relatedTemplates = [], baseCode = 'G7.ISO.QT01') => {
  const items = [];
  const seenCodes = new Set();
  (steps || []).forEach(s => {
    const tStr = s.template_files || s.template || s.transition?.template_files || '';
    if (tStr && tStr !== '---') {
      const parts = tStr.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
      parts.forEach(p => {
        let matched = null;
        if (relatedTemplates && relatedTemplates.length > 0) {
          matched = relatedTemplates.find(rt => {
            const rtCode = (rt.code || '').trim().toLowerCase();
            const rtTitle = (rt.title || rt.name || '').trim().toLowerCase();
            const pLow = p.toLowerCase();
            return (rtCode && (pLow.includes(rtCode) || rtCode.includes(pLow))) ||
                   (rtTitle && (pLow.includes(rtTitle) || rtTitle.includes(pLow)));
          });
        }
        let code = '';
        let name = '';
        let storage = matched?.storage_location || 'Ban hệ thống ISO (ISO)';
        let retention = matched?.retention_period || '12 tháng';
        if (matched) {
          code = matched.code || '';
          name = matched.title || matched.name || '';
        } else {
          const codeM = p.match(/\(([A-Z0-9\.\/_-]+(?:[-_]BM\d+)?)\)/i) || p.match(/^([A-Z0-9\.\/_-]+(?:[-_]BM\d+)?)\s*[-–—:]\s*(.+)$/i);
          if (codeM) {
            code = codeM[1].trim();
            name = (codeM[2] || p.replace(/\([^\)]+\)/, '')).trim();
          } else {
            code = p;
            name = ('Biểu mẫu kiểm soát ' + (s.name || '')).trim();
          }
        }
        if (/^(?:BM|HD|PL)\d+/i.test(code)) {
          code = baseCode + '-' + code.toUpperCase();
        }
        const key = (code || name).toLowerCase();
        if (key && !seenCodes.has(key)) {
          seenCodes.add(key);
          items.push({ code, name, storage, retention });
        }
      });
    }
  });

  if (items.length === 0 && relatedTemplates && relatedTemplates.length > 0) {
    relatedTemplates.forEach((t, idx) => {
      items.push({
        code: t.code || (baseCode + '-BM0' + (idx + 1)),
        name: t.title || t.name || ('Biểu mẫu 0' + (idx + 1)),
        storage: t.storage_location || 'Ban hệ thống ISO (ISO)',
        retention: t.retention_period || '12 tháng'
      });
    });
  }

  const headerTds = [
    { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Mã hiệu biểu mẫu', bold: true, size: 11, font: 'Times New Roman', rowFlex: 'center' }] },
    { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Tên biểu mẫu / Hồ sơ kiểm soát', bold: true, size: 11, font: 'Times New Roman', rowFlex: 'center' }] },
    { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Nơi lưu trữ', bold: true, size: 11, font: 'Times New Roman', rowFlex: 'center' }] },
    { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Thời hạn lưu', bold: true, size: 11, font: 'Times New Roman', rowFlex: 'center' }] }
  ];
  const rows = [{ height: 35, tdList: headerTds }];
  items.forEach(it => {
    rows.push({
      height: 35,
      tdList: [
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: it.code, size: 11, font: 'Times New Roman' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: it.name, size: 11, font: 'Times New Roman' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: it.storage, size: 11, font: 'Times New Roman', rowFlex: 'center' }] },
        { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: it.retention, size: 11, font: 'Times New Roman', rowFlex: 'center' }] }
      ]
    });
  });

  return {
    type: 'table',
    id: 'iso-forms-table',
    colgroup: [{ width: 145 }, { width: 245 }, { width: 150 }, { width: 140 }],
    trList: rows
  };
};

export const buildDefaultISOFooter = (formData = {}) => {
  const docCode = formData.code || formData.new_code || '';
  let formattedDate = formData.issue_date || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
    formattedDate = formattedDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  }
  const version = formData.version || '';

  return [
    { value: `Mã hiệu: ${docCode}`, font: 'Times New Roman', size: 13, italic: true },
    { value: '', type: 'tab' },
    { value: `Ngày ban hành: ${formattedDate}         Lần ban hành: ${version}`, font: 'Times New Roman', size: 13, italic: true },
    { value: '', type: 'tab' },
    { value: 'Trang 1', font: 'Times New Roman', size: 13, italic: true }
  ];
};

