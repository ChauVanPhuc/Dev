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
  const approver = formData.approver || 'Người phê duyệt';

  // 1. TẠO TRANG BÌA (COVER PAGE)
  const coverElements = [
    // Header Logo & Tên Công Ty (Dạng Bảng 2 hàng hoặc Box)
    {
      type: 'table',
      colgroup: [{ width: 140 }, { width: 450 }],
      trList: [
        {
          height: 75,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              verticalAlign: 'middle',
              value: [
                {
                  type: 'image',
                  value: logoCty,
                  width: 95,
                  height: 50,
                  rowFlex: 'center'
                }
              ]
            },
            {
              colspan: 1,
              rowspan: 1,
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
        }
      ]
    },
    { value: '\n\n\n' },
    // Tên Quy Trình
    {
      value: cleanTitle,
      bold: true,
      size: 26,
      font: 'Times New Roman',
      rowFlex: 'center'
    },
    { value: '\n\n' },
    // Bảng Mã hiệu & Lần ban hành
    {
      type: 'table',
      rowFlex: 'center',
      colgroup: [{ width: 180 }, { width: 220 }],
      trList: [
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'Mã hiệu:', bold: true, size: 13, font: 'Times New Roman' }] },
            { colspan: 1, rowspan: 1, value: [{ value: docCode, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        },
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'Lần ban hành:', bold: true, size: 13, font: 'Times New Roman' }] },
            { colspan: 1, rowspan: 1, value: [{ value: version, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        },
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'Ngày ban hành:', bold: true, size: 13, font: 'Times New Roman' }] },
            { colspan: 1, rowspan: 1, value: [{ value: issueDate, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        },
        {
          height: 30,
          tdList: [
            { colspan: 1, rowspan: 1, value: [{ value: 'Bộ phận thực hiện:', bold: true, size: 13, font: 'Times New Roman' }] },
            { colspan: 1, rowspan: 1, value: [{ value: deptName, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        }
      ]
    },
    { value: '\n\n\n' },
    // Bảng Ký Duyệt Trách Nhiệm
    {
      type: 'table',
      colgroup: [{ width: 140 }, { width: 170 }, { width: 150 }, { width: 130 }],
      trList: [
        {
          height: 38,
          tdList: [
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'TRÁCH NHIỆM', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'HỌ TÊN', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'CHỨC VỤ', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'KÝ TÊN', bold: true, size: 13, font: 'Times New Roman', rowFlex: 'center' }] }
          ]
        },
        {
          height: 60,
          tdList: [
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Biên soạn', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: issuer, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Nhân viên', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
          ]
        },
        {
          height: 60,
          tdList: [
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Phê duyệt', bold: true, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: approver, size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: 'Trưởng phòng / Ban Giám Đốc', size: 12, font: 'Times New Roman', rowFlex: 'center' }] },
            { colspan: 1, rowspan: 1, verticalAlign: 'middle', value: [{ value: ' ', size: 12, font: 'Times New Roman' }] }
          ]
        }
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
      colgroup: [{ width: 55 }, { width: 120 }, { width: 335 }, { width: 90 }],
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
    colgroup: [{ width: 60 }, { width: 140 }, { width: 260 }, { width: 130 }],
    trList: rows
  };
};

/**
 * Tạo chân trang chuẩn ISO ăn theo metadata quy trình (Mã hiệu, Ngày ban hành, Lần ban hành, Trang)
 */
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

