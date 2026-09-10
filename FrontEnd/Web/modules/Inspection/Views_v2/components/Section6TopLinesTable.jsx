import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Edit3, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Table as TableIcon, Link as LinkIcon, 
  Undo, Redo, Eraser, X, Minus, Highlighter, Subscript, Superscript, 
  Indent, Outdent, CheckSquare, Info, Maximize2, Minimize2, ZoomIn, ZoomOut,
  FileText, Clock, Award
} from 'lucide-react';

export const Section6TopLinesTable = () => {
  // 1. Dữ liệu lưu trữ vĩnh viễn trên LocalStorage
  const [sectionTitle, setSectionTitle] = useState(() => {
    return localStorage.getItem('smartflow_section6_title') || '6. Khu vực mở rộng';
  });
  const [sectionContent, setSectionContent] = useState(() => {
    return localStorage.getItem('smartflow_section6_content') || '';
  });

  // State Modal và Trạng thái Soạn thảo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'insert', 'templates'
  
  const [tempTitle, setTempTitle] = useState(sectionTitle);
  const [tempContent, setTempContent] = useState(sectionContent);
  const [selectedFont, setSelectedFont] = useState('Segoe UI');
  const [selectedFontSize, setSelectedFontSize] = useState('3'); // 14pt chuẩn
  const [zoomLevel, setZoomLevel] = useState(100);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Dropdown Popups
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showSymbolMenu, setShowSymbolMenu] = useState(false);

  // Table grid hover state
  const [hoverGrid, setHoverGrid] = useState({ r: 3, c: 3 });

  const editorRef = useRef(null);

  // Cập nhật số từ và số ký tự
  const updateCounts = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setTempContent(editorRef.current.innerHTML);
    }
  };

  // Đồng bộ nội dung khi mở Modal
  useEffect(() => {
    if (isModalOpen) {
      setTempTitle(sectionTitle);
      setTempContent(sectionContent);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = sectionContent || '';
          updateCounts();
          editorRef.current.focus();
        }
      }, 70);
    }
  }, [isModalOpen, sectionTitle, sectionContent]);

  // Thực thi lệnh chuẩn Word (document.execCommand)
  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      updateCounts();
    }
  };

  // Đổi phông chữ
  const handleFontChange = (fontName) => {
    setSelectedFont(fontName);
    execCmd('fontName', fontName);
  };

  // Đổi cỡ chữ
  const handleFontSizeChange = (size) => {
    setSelectedFontSize(size);
    execCmd('fontSize', size);
  };

  // Tăng / Giảm cỡ chữ
  const stepFontSize = (delta) => {
    const current = parseInt(selectedFontSize, 10) || 3;
    const next = Math.max(1, Math.min(7, current + delta));
    handleFontSizeChange(next.toString());
  };

  // Chèn Bảng tùy biến
  const insertCustomTable = (rows = 3, cols = 3) => {
    let headerCells = '';
    for (let c = 1; c <= cols; c++) {
      headerCells += `<th style="padding: 10px 14px; border: 1px solid #CBD5E1; background-color: #F8FAFC; color: #5B3924; font-weight: 700; text-align: left; font-size: 0.88rem;">Tiêu đề ${c}</th>`;
    }
    let bodyRows = '';
    for (let r = 1; r <= rows; r++) {
      let rowCells = '';
      const rowBg = r % 2 === 0 ? '#FAF8F5' : '#FFFFFF';
      for (let c = 1; c <= cols; c++) {
        rowCells += `<td style="padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 0.86rem; color: #302820; background-color: ${rowBg};">Dữ liệu ${r}.${c}</td>`;
      }
      bodyRows += `<tr>${rowCells}</tr>`;
    }

    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 14px 0; border: 1.5px solid #CBD5E1; border-radius: 4px; overflow: hidden;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <p><br></p>
    `;
    execCmd('insertHTML', tableHTML);
    setShowTablePicker(false);
  };

  // Chèn Hộp thông báo / Callout
  const insertCallout = (type = 'info') => {
    let bg = '#FAF6F0', border = '#5B3924', icon = '📌', title = 'Thông tin lưu ý chất lượng';
    if (type === 'warning') {
      bg = '#FEFCE8'; border = '#EAB308'; icon = '⚠️'; title = 'Cảnh báo sự cố sản xuất';
    } else if (type === 'success') {
      bg = '#F0FDF4'; border = '#22C55E'; icon = '✅'; title = 'Kế hoạch đã phê duyệt';
    } else if (type === 'danger') {
      bg = '#FEF2F2'; border = '#EF4444'; icon = '⛔'; title = 'Lỗi nghiêm trọng cần khắc phục gấp';
    }

    const calloutHTML = `
      <div style="background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 4px; padding: 12px 16px; margin: 14px 0; font-size: 0.88rem;">
        <div style="font-weight: 800; color: #5B3924; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
          <span>${icon}</span> <span>${title}</span>
        </div>
        <div style="color: #302820; line-height: 1.55;">Nhập nội dung chi tiết cho ghi chú hoặc chỉ thị chất lượng tại đây...</div>
      </div>
      <p><br></p>
    `;
    execCmd('insertHTML', calloutHTML);
    setShowCalloutMenu(false);
  };

  // Chèn Checklist công việc
  const insertChecklist = () => {
    const checkHTML = `
      <div style="margin: 12px 0; font-size: 0.88rem; line-height: 1.8;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" style="width: 15px; height: 15px; accent-color: #5B3924; cursor: pointer;" />
          <span>Kiểm soát nhiệt độ và độ ẩm buồng sấy phôi trước khi chuyển chuyền</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" style="width: 15px; height: 15px; accent-color: #5B3924; cursor: pointer;" />
          <span>Kiểm tra độ bám dính mộng keo và khe hở kết cấu mộc</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" style="width: 15px; height: 15px; accent-color: #5B3924; cursor: pointer;" />
          <span>Đối chiếu màu sơn hoàn thiện với bảng mẫu chuẩn (Golden Sample)</span>
        </div>
      </div>
      <p><br></p>
    `;
    execCmd('insertHTML', checkHTML);
  };

  // Chèn Ký tự đặc biệt
  const insertSymbol = (sym) => {
    execCmd('insertText', ` ${sym} `);
    setShowSymbolMenu(false);
  };

  // Chèn Dấu thời gian hiện tại
  const insertTimestamp = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    execCmd('insertHTML', `<span style="background-color: #FAF8F5; padding: 2px 8px; border-radius: 4px; font-weight: 700; color: #5B3924; font-size: 0.82rem; border: 1px solid #E4DDD5;">${dateStr} - ${timeStr}</span> `);
  };

  // Chèn Đường kẻ ngang
  const insertDivider = () => {
    execCmd('insertHTML', '<hr style="border: none; border-top: 1.5px solid #CBD5E1; margin: 18px 0;"/><p><br></p>');
  };

  // Chèn Liên kết
  const insertLink = () => {
    const url = prompt('Nhập đường dẫn liên kết URL:', 'https://');
    if (url) {
      execCmd('createLink', url);
    }
  };

  // Chèn Khối ký tên phê duyệt
  const insertSignatureBlock = () => {
    const sigHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 32px; text-align: center; font-size: 0.86rem; color: #302820;">
        <div>
          <div style="font-weight: 700; color: #5B3924;">Người lập biểu</div>
          <div style="font-size: 0.76rem; color: #786B61; font-style: italic;">(Ký và ghi rõ họ tên)</div>
          <div style="height: 55px;"></div>
          <div style="font-weight: 600;">QA Inspector</div>
        </div>
        <div>
          <div style="font-weight: 700; color: #5B3924;">Trưởng bộ phận QC</div>
          <div style="font-size: 0.76rem; color: #786B61; font-style: italic;">(Ký và ghi rõ họ tên)</div>
          <div style="height: 55px;"></div>
          <div style="font-weight: 600;">QC Manager</div>
        </div>
        <div>
          <div style="font-weight: 700; color: #5B3924;">Giám đốc Nhà máy</div>
          <div style="font-size: 0.76rem; color: #786B61; font-style: italic;">(Phê duyệt thực hiện)</div>
          <div style="height: 55px;"></div>
          <div style="font-weight: 600;">Factory Director</div>
        </div>
      </div>
      <p><br></p>
    `;
    execCmd('insertHTML', sigHTML);
  };

  // Nạp các mẫu chuẩn có sẵn từ hệ thống ERP G7
  const loadTemplate = (templateType) => {
    let tplHTML = '';
    
    // Mẫu 1: Phiếu yêu cầu hành động khắc phục phòng ngừa (CAPA) - Chuẩn module ISO / Quality
    if (templateType === 'capa') {
      tplHTML = `
        <h2 style="color: #5B3924; border-bottom: 2px solid #5B3924; padding-bottom: 6px; font-size: 1.25rem;">PHIẾU YÊU CẦU HÀNH ĐỘNG KHẮC PHỤC PHÒNG NGỪA (CAPA)</h2>
        <p style="margin: 6px 0;"><strong>Mã phiếu:</strong> CAPA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)} | <strong>Ngày lập:</strong> ${new Date().toLocaleDateString('vi-VN')} | <strong>Bộ phận:</strong> Quản lý Chất lượng QA-QC</p>
        
        <div style="background-color: #FEFCE8; border-left: 4px solid #EAB308; border-radius: 4px; padding: 10px 14px; margin: 12px 0; font-size: 0.88rem;">
          <strong style="color: #854D0E;">Mô tả sự cố lỗi:</strong> Phát hiện tỷ lệ lỗi kích thước mộng và trầy xước bề mặt sơn tăng cao tại Chuyền Mộc 2 & Chuyền Sơn 1 trong tuần này.
        </div>

        <h3 style="color: #5B3924; font-size: 1.02rem; margin-top: 16px;">1. Kế hoạch hành động 5W2H:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1.5px solid #CBD5E1; font-size: 0.86rem;">
          <thead>
            <tr style="background-color: #FAF8F5; color: #5B3924;">
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">STT</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Biện pháp khắc phục</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Người phụ trách</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Thời hạn</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">1</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Hiệu chuẩn lại cữ cắt dao tubi chuyền mộc</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Tổ trưởng Cơ điện</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Trong ngày</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; color: #3F7D58; font-weight: 700;">Đang xử lý</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">2</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Bổ sung mút xốp chống va đập trên giá treo chuyền sơn</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Quản đốc Xưởng Sơn</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">48 giờ</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; color: #EAB308; font-weight: 700;">Chờ vật tư</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">3</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Đào tạo lại thao tác gá đặt chi tiết cho công nhân mới</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">QA Trainer</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Cuối tuần</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; color: #5B3924; font-weight: 700;">Đã lên lịch</td>
            </tr>
          </tbody>
        </table>

        <h3 style="color: #5B3924; font-size: 1.02rem; margin-top: 16px;">2. Checklist giám sát định kỳ:</h3>
        <div style="margin: 8px 0; font-size: 0.88rem; line-height: 1.8;">
          <div><input type="checkbox" checked /> Kiểm tra cữ cắt đầu ca mỗi 02 giờ/lần</div>
          <div><input type="checkbox" checked /> Đo độ ẩm phôi gỗ trước khi phun sơn lót</div>
          <div><input type="checkbox" /> Báo cáo tỷ lệ lỗi trực tiếp lên hệ thống ERP G7 mỗi 16h30 hàng ngày</div>
        </div>
      `;
    } 
    // Mẫu 2: Báo cáo kiểm định chất lượng xuất xưởng (Inspection Report) - Chuẩn module Inspection
    else if (templateType === 'inspection') {
      tplHTML = `
        <h2 style="color: #5B3924; text-align: center; margin-bottom: 4px; font-size: 1.25rem;">BIÊN BẢN KIỂM ĐỊNH CHẤT LƯỢNG LÔ HÀNG XUẤT XƯỞNG</h2>
        <div style="text-align: center; font-size: 0.82rem; color: #786B61; margin-bottom: 14px;">Mã số: QC-REP-${Math.floor(1000 + Math.random() * 9000)} | Áp dụng tiêu chuẩn AQL 1.5 - Level II</div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 0.88rem;">
          <tr>
            <td style="padding: 8px; border: 1px solid #CBD5E1; width: 25%; font-weight: 700; background: #FAF8F5; color: #5B3924;">Tên sản phẩm:</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1; width: 25%;">Bàn ăn mở rộng Milano 6S</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1; width: 25%; font-weight: 700; background: #FAF8F5; color: #5B3924;">Số lượng lô:</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1; width: 25%;">500 PCS</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #CBD5E1; font-weight: 700; background: #FAF8F5; color: #5B3924;">Dòng hàng:</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1;">Châu Âu xuất khẩu</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1; font-weight: 700; background: #FAF8F5; color: #5B3924;">Cỡ mẫu kiểm:</td>
            <td style="padding: 8px; border: 1px solid #CBD5E1;">50 PCS</td>
          </tr>
        </table>

        <div style="background-color: #F0FDF4; border-left: 4px solid #22C55E; border-radius: 4px; padding: 10px 14px; margin: 12px 0; font-size: 0.88rem;">
          <strong style="color: #166534;">KẾT LUẬN KIỂM TRA:</strong> ĐẠT TIÊU CHUẨN XUẤT XƯỞNG (Pass AQL). Số lượng lỗi nhỏ: 01 (Cho phép tối đa 03).
        </div>
      `;
    }
    // Mẫu 3: Tiêu chuẩn kiểm soát chất lượng trọng yếu (CTQ Guide)
    else if (templateType === 'ctq') {
      tplHTML = `
        <h2 style="color: #5B3924; border-bottom: 2px solid #5B3924; padding-bottom: 6px; font-size: 1.25rem;">HƯỚNG DẪN KIỂM SOÁT CHẤT LƯỢNG TRỌNG YẾU (CTQ)</h2>
        <p style="margin: 6px 0;"><strong>Áp dụng:</strong> Toàn bộ các chuyền Mộc, Sơn, Lắp ráp | <strong>Thời điểm áp dụng:</strong> Đầu mỗi ca sản xuất</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1.5px solid #CBD5E1; font-size: 0.86rem;">
          <thead>
            <tr style="background-color: #FAF8F5; color: #5B3924;">
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Công đoạn</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Hạng mục kiểm soát (CTQ)</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Tiêu chuẩn kỹ thuật</th>
              <th style="padding: 8px 10px; border: 1px solid #CBD5E1; text-align: left;">Dụng cụ đo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-weight: 700;">Chuyền Mộc</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Độ ẩm phôi gỗ tự nhiên</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">10% - 12%</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Máy đo điện cực</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-weight: 700;">Chuyền Mộc</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Độ hở mộng ghép khung</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">&le; 0.2 mm</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Thước lá đo khe hở</td>
            </tr>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-weight: 700;">Chuyền Sơn</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Độ bóng bề mặt sơn hoàn thiện</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">30% &plusmn; 5%</td>
              <td style="padding: 8px 10px; border: 1px solid #E2E8F0;">Máy đo độ bóng 60°</td>
            </tr>
          </tbody>
        </table>
      `;
    }
    // Mẫu 4: Biên bản xử lý sự cố vi phạm chất lượng chuyền
    else if (templateType === 'violation') {
      tplHTML = `
        <h2 style="color: #B94A3D; border-bottom: 2px solid #B94A3D; padding-bottom: 6px; font-size: 1.25rem;">BIÊN BẢN XỬ LÝ SỰ CỐ VI PHẠM KỸ THUẬT & CHẤT LƯỢNG</h2>
        <p style="margin: 6px 0;"><strong>Địa điểm:</strong> Chuyền Ghép Mộng Xưởng 2 | <strong>Thời gian:</strong> ${new Date().toLocaleDateString('vi-VN')} - ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
        
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px; padding: 10px 14px; margin: 12px 0; font-size: 0.88rem;">
          <strong style="color: #991B1B;">Nội dung vi phạm:</strong> Công nhân không kiểm tra cữ dao trước khi gia công hàng loạt dẫn đến 30 sản phẩm sai lệch kích thước &plusmn;2mm.
        </div>

        <h3 style="color: #5B3924; font-size: 1.02rem; margin-top: 14px;">Biện pháp xử lý ngay:</h3>
        <p style="margin: 4px 0; font-size: 0.88rem;">1. Tạm dừng chuyền để căn chỉnh lại cữ máy.<br/>2. Toàn bộ 30 sản phẩm lỗi chuyển về khu vực sửa chữa (Rework).<br/>3. Ký biên bản nhắc nhở tổ trưởng ca trực.</p>
      `;
    }

    if (editorRef.current && tplHTML) {
      editorRef.current.innerHTML = tplHTML;
      updateCounts();
    }
  };

  // Lưu nội dung và tiêu đề
  const handleSave = () => {
    const finalTitle = tempTitle.trim() || '6. Khu vực mở rộng';
    const finalContent = editorRef.current ? editorRef.current.innerHTML : tempContent;

    setSectionTitle(finalTitle);
    setSectionContent(finalContent);

    localStorage.setItem('smartflow_section6_title', finalTitle);
    localStorage.setItem('smartflow_section6_content', finalContent);

    setIsModalOpen(false);
  };

  // Phím tắt (Ctrl+S, Escape)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsModalOpen(false);
    }
  };

  // Bảng màu Theme chuẩn Microsoft Word
  const WORD_THEME_COLORS = [
    ['#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF'],
    ['#5B3924', '#70452D', '#8C5332', '#C58A4B', '#EADCC9', '#3F7D58', '#B94A3D', '#2563EB', '#7C3AED', '#DB2777'],
    ['#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC'],
    ['#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD'],
    ['#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0'],
    ['#A61C1C', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79'],
    ['#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1155CC', '#0B5394', '#351C75', '#4C1130']
  ];

  const HIGHLIGHT_COLORS = [
    '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF', '#FF0000',
    '#000080', '#008080', '#008000', '#800080', '#800000', '#808000',
    '#808080', '#C0C0C0', '#000000', 'transparent'
  ];

  const SPECIAL_SYMBOLS = ['✓', '✗', '⚠️', '📌', '🎯', '📊', '🏭', '🔍', '⚙️', '⭐', '→', '▲', '▼', '🏷️', '⏱️', '📋'];

  return (
    <div className="qd-section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', position: 'relative' }}>
      {/* 1. Header có Tiêu đề tùy chỉnh */}
      <div className="qd-section-header">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sectionTitle}
        </span>
      </div>

      {/* 2. Nội dung hiển thị của Mục 6 trên Dashboard */}
      <div 
        onClick={() => setIsModalOpen(true)}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 14px',
          background: '#FFFFFF',
          fontSize: '0.8rem',
          color: '#302820',
          lineHeight: 1.6,
          cursor: 'pointer'
        }}
        title="Nhấn vào để chỉnh sửa nội dung"
      >
        {sectionContent && sectionContent.trim() && sectionContent !== '<p><br></p>' ? (
          <div 
            className="section6-rendered-content"
            dangerouslySetInnerHTML={{ __html: sectionContent }}
            style={{ wordBreak: 'break-word' }}
          />
        ) : (
          <div 
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#786B61',
              cursor: 'pointer',
              textAlign: 'center',
              padding: '16px',
              borderRadius: '6px',
              border: '1.5px dashed #E4DDD5',
              background: '#FAF8F5',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5B3924'; e.currentTarget.style.background = '#F7F4F0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E4DDD5'; e.currentTarget.style.background = '#FAF8F5'; }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#EADCC9',
              color: '#5B3924',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '6px'
            }}>
              <Edit3 size={16} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#5B3924', fontWeight: '700' }}>
              Nhấn vào đây để soạn thảo ghi chú
            </div>
          </div>
        )}
      </div>

      {/* 3. MODAL SOẠN THẢO VĂN BẢN ĐỒNG BỘ THEME NÂU GỖ (#5B3924) */}
      {isModalOpen && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(48, 40, 32, 0.72)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isFullscreen ? '0' : '16px',
            transition: 'all 0.2s ease'
          }}
          onKeyDown={handleKeyDown}
          onClick={() => {
            setShowColorPalette(false);
            setShowHighlightPalette(false);
            setShowTablePicker(false);
            setShowCalloutMenu(false);
            setShowSymbolMenu(false);
          }}
        >
          <div 
            style={{
              width: isFullscreen ? '100vw' : '95vw',
              maxWidth: isFullscreen ? '100vw' : '1380px',
              height: isFullscreen ? '100vh' : '92vh',
              maxHeight: isFullscreen ? '100vh' : '920px',
              background: '#F7F4F0',
              borderRadius: isFullscreen ? '0' : '8px',
              border: '1.5px solid #5B3924',
              boxShadow: '0 25px 65px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 3.1 TOP BAR: Thanh tiêu đề màu Nâu gỗ (#5B3924) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '9px 18px',
              background: '#5B3924', // Nâu gỗ chuẩn hệ thống ERP G7
              color: '#FFFDFC',
              borderBottom: '1px solid #4A2E1B',
              userSelect: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '800', fontSize: '0.94rem', letterSpacing: '0.2px' }}>
                  Soạn thảo văn bản & Chỉ thị chất lượng
                </span>
              </div>

              {/* Nút phóng to toàn màn hình & Đóng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                  style={{
                    background: 'rgba(255, 253, 252, 0.15)',
                    border: 'none',
                    color: '#FFFDFC',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 253, 252, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 253, 252, 0.15)'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  title="Đóng bảng soạn thảo"
                  style={{
                    background: 'rgba(255, 253, 252, 0.15)',
                    border: 'none',
                    color: '#FFFDFC',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#B94A3D'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 253, 252, 0.15)'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 3.2 HÀNG SỬA TIÊU ĐỀ MỤC 6 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 18px',
              background: '#FAF8F5',
              borderBottom: '1px solid #E4DDD5'
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#5B3924', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} color="#5B3924" />
                <span>Tiêu đề hiển thị Mục 6:</span>
              </label>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                placeholder="Ví dụ: 6. Kế hoạch hành động QLCL & Ghi chú kiểm định..."
                style={{
                  flex: 1,
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '4px',
                  border: '1.5px solid #E4DDD5',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  color: '#302820',
                  outline: 'none',
                  backgroundColor: '#FFFFFF'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B3924'}
                onBlur={(e) => e.target.style.borderColor = '#E4DDD5'}
              />
            </div>

            {/* 3.3 TABS THỰC ĐƠN RIBBON */}
            <div style={{
              display: 'flex',
              gap: '2px',
              padding: '0 16px',
              background: '#FAF8F5',
              borderBottom: '1px solid #E4DDD5'
            }}>
              {[
                { id: 'home', label: 'Trang đầu' },
                { id: 'insert', label: 'Chèn' },
                { id: 'templates', label: 'Mẫu báo cáo hệ thống' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '7px 18px',
                    fontSize: '0.8rem',
                    fontWeight: activeTab === tab.id ? '800' : '600',
                    color: activeTab === tab.id ? '#5B3924' : '#786B61',
                    border: 'none',
                    background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                    borderTop: activeTab === tab.id ? '2.5px solid #5B3924' : '2.5px solid transparent',
                    borderLeft: activeTab === tab.id ? '1px solid #E4DDD5' : '1px solid transparent',
                    borderRight: activeTab === tab.id ? '1px solid #E4DDD5' : '1px solid transparent',
                    cursor: 'pointer',
                    marginTop: '2px',
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3.4 THANH CÔNG CỤ RIBBON CHI TIẾT */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 18px',
              background: '#FFFFFF',
              borderBottom: '1.5px solid #E4DDD5',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative',
              zIndex: 20
            }}>
              {activeTab === 'home' && (
                <>
                  {/* Hoàn tác */}
                  <div style={{ display: 'inline-flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => execCmd('undo')}
                      title="Hoàn tác"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Undo size={14} color="#5B3924" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('redo')}
                      title="Làm lại"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Redo size={14} color="#5B3924" />
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '22px', background: '#E4DDD5', margin: '0 3px' }} />

                  {/* Phông chữ & Cỡ chữ */}
                  <select
                    value={selectedFont}
                    onChange={(e) => handleFontChange(e.target.value)}
                    style={{
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid #E4DDD5',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#302820',
                      background: '#FFFFFF',
                      padding: '0 6px',
                      cursor: 'pointer',
                      width: '130px'
                    }}
                  >
                    <option value="Segoe UI">Segoe UI</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Calibri">Calibri</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                  </select>

                  <select
                    value={selectedFontSize}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    style={{
                      height: '28px',
                      borderRadius: '4px',
                      border: '1px solid #E4DDD5',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#302820',
                      background: '#FFFFFF',
                      padding: '0 4px',
                      cursor: 'pointer',
                      width: '65px'
                    }}
                  >
                    <option value="1">10 pt</option>
                    <option value="2">12 pt</option>
                    <option value="3">14 pt</option>
                    <option value="4">16 pt</option>
                    <option value="5">18 pt</option>
                    <option value="6">24 pt</option>
                    <option value="7">36 pt</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => stepFontSize(1)}
                    title="Tăng cỡ chữ"
                    style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', color: '#5B3924' }}
                  >
                    A⁺
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFontSize(-1)}
                    title="Giảm cỡ chữ"
                    style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '10px', color: '#5B3924' }}
                  >
                    A⁻
                  </button>

                  <div style={{ width: '1px', height: '22px', background: '#E4DDD5', margin: '0 3px' }} />

                  {/* Định dạng chữ */}
                  <div style={{ display: 'inline-flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => execCmd('bold')}
                      title="In đậm"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Bold size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('italic')}
                      title="In nghiêng"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Italic size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('underline')}
                      title="Gạch chân"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Underline size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('strikeThrough')}
                      title="Gạch ngang chữ"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Strikethrough size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('subscript')}
                      title="Chỉ số dưới"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Subscript size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('superscript')}
                      title="Chỉ số trên"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Superscript size={14} color="#302820" />
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '22px', background: '#E4DDD5', margin: '0 3px' }} />

                  {/* Màu chữ & Highlight */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorPalette(!showColorPalette);
                        setShowHighlightPalette(false);
                      }}
                      title="Màu chữ"
                      style={{
                        height: '28px',
                        padding: '0 6px',
                        background: '#FAF8F5',
                        border: '1px solid #E4DDD5',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '700'
                      }}
                    >
                      <span style={{ fontWeight: '900', color: '#5B3924', borderBottom: '3px solid #5B3924', paddingBottom: '0px' }}>A</span>
                      <span style={{ fontSize: '9px', color: '#786B61' }}>▾</span>
                    </button>

                    {showColorPalette && (
                      <div style={{
                        position: 'absolute',
                        top: '32px',
                        left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        border: '1px solid #E4DDD5',
                        borderRadius: '6px',
                        padding: '10px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                        width: '220px'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5B3924', marginBottom: '6px' }}>
                          Bảng màu chủ đề:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '3px', marginBottom: '8px' }}>
                          {WORD_THEME_COLORS.flat().map((c, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                execCmd('foreColor', c);
                                setShowColorPalette(false);
                              }}
                              style={{
                                width: '17px',
                                height: '17px',
                                backgroundColor: c,
                                border: '1px solid #E4DDD5',
                                borderRadius: '2px',
                                cursor: 'pointer'
                              }}
                              title={c}
                            />
                          ))}
                        </div>
                        <div style={{ borderTop: '1px solid #E4DDD5', paddingTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#302820' }}>Màu tự chọn:</span>
                          <input
                            type="color"
                            onChange={(e) => {
                              execCmd('foreColor', e.target.value);
                              setShowColorPalette(false);
                            }}
                            style={{ width: '28px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHighlightPalette(!showHighlightPalette);
                        setShowColorPalette(false);
                      }}
                      title="Màu dạ quang"
                      style={{
                        height: '28px',
                        padding: '0 6px',
                        background: '#FAF8F5',
                        border: '1px solid #E4DDD5',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Highlighter size={14} color="#C58A4B" />
                      <span style={{ fontSize: '9px', color: '#786B61' }}>▾</span>
                    </button>

                    {showHighlightPalette && (
                      <div style={{
                        position: 'absolute',
                        top: '32px',
                        left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        border: '1px solid #E4DDD5',
                        borderRadius: '6px',
                        padding: '8px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                        width: '180px'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5B3924', marginBottom: '6px' }}>
                          Màu dạ quang:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                          {HIGHLIGHT_COLORS.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                execCmd('hiliteColor', c);
                                setShowHighlightPalette(false);
                              }}
                              style={{
                                height: '24px',
                                backgroundColor: c === 'transparent' ? '#FFFFFF' : c,
                                border: '1px solid #E4DDD5',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: '#000000'
                              }}
                              title={c}
                            >
                              {c === 'transparent' ? '✕' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ width: '1px', height: '22px', background: '#E4DDD5', margin: '0 3px' }} />

                  {/* Căn lề */}
                  <div style={{ display: 'inline-flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyLeft')}
                      title="Căn trái"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <AlignLeft size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyCenter')}
                      title="Căn giữa"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <AlignCenter size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyRight')}
                      title="Căn phải"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <AlignRight size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('justifyFull')}
                      title="Căn đều 2 bên"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <AlignJustify size={14} color="#302820" />
                    </button>
                  </div>

                  <div style={{ width: '1px', height: '22px', background: '#E4DDD5', margin: '0 3px' }} />

                  {/* Danh sách & Thụt lề */}
                  <div style={{ display: 'inline-flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => execCmd('insertUnorderedList')}
                      title="Danh sách gạch đầu dòng"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <List size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('insertOrderedList')}
                      title="Danh sách đánh số"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <ListOrdered size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={insertChecklist}
                      title="Danh sách kiểm tra (Checklist)"
                      style={{ width: '28px', height: '28px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <CheckSquare size={14} color="#5B3924" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('outdent')}
                      title="Giảm thụt lề"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Outdent size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('indent')}
                      title="Tăng thụt lề"
                      style={{ width: '28px', height: '28px', background: '#FAF8F5', border: '1px solid #E4DDD5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Indent size={14} color="#302820" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execCmd('removeFormat')}
                      title="Xóa định dạng"
                      style={{ width: '28px', height: '28px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Eraser size={14} color="#B94A3D" />
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'insert' && (
                <>
                  {/* Chèn Bảng */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTablePicker(!showTablePicker);
                        setShowCalloutMenu(false);
                        setShowSymbolMenu(false);
                      }}
                      style={{
                        height: '30px',
                        padding: '0 10px',
                        background: '#FAF6F0',
                        border: '1px solid #EADCC9',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: '#5B3924'
                      }}
                    >
                      <TableIcon size={14} />
                      <span>Chèn Bảng</span>
                      <span style={{ fontSize: '9px' }}>▾</span>
                    </button>

                    {showTablePicker && (
                      <div style={{
                        position: 'absolute',
                        top: '34px',
                        left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        border: '1px solid #E4DDD5',
                        borderRadius: '6px',
                        padding: '12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                        width: '210px'
                      }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#5B3924', marginBottom: '8px' }}>
                          Lưới bảng: {hoverGrid.r} x {hoverGrid.c}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '10px' }}>
                          {[1,2,3,4,5,6].map(r => (
                            [1,2,3,4,5,6].map(c => (
                              <div
                                key={`${r}-${c}`}
                                onMouseEnter={() => setHoverGrid({ r, c })}
                                onClick={() => insertCustomTable(r, c)}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  border: '1px solid #E4DDD5',
                                  backgroundColor: (r <= hoverGrid.r && c <= hoverGrid.c) ? '#EADCC9' : '#FAF8F5',
                                  borderRadius: '2px',
                                  cursor: 'pointer'
                                }}
                              />
                            ))
                          ))}
                        </div>
                        <div style={{ borderTop: '1px solid #E4DDD5', paddingTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => insertCustomTable(4, 4)}
                            style={{ width: '100%', textAlign: 'left', padding: '5px', fontSize: '0.75rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#5B3924', fontWeight: '700' }}
                          >
                            + Bảng mẫu 4 hàng x 4 cột
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hộp ghi chú nổi bật */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCalloutMenu(!showCalloutMenu);
                        setShowTablePicker(false);
                        setShowSymbolMenu(false);
                      }}
                      style={{
                        height: '30px',
                        padding: '0 10px',
                        background: '#FAF6F0',
                        border: '1px solid #EADCC9',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: '#5B3924'
                      }}
                    >
                      <Info size={14} />
                      <span>Hộp ghi chú</span>
                      <span style={{ fontSize: '9px' }}>▾</span>
                    </button>

                    {showCalloutMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '34px',
                        left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        border: '1px solid #E4DDD5',
                        borderRadius: '6px',
                        padding: '8px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                        width: '210px'
                      }}>
                        <button
                          type="button"
                          onClick={() => insertCallout('info')}
                          style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.76rem', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#FAF6F0'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>📌</span> <span>Ghi chú thông tin</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertCallout('warning')}
                          style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.76rem', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#FEFCE8'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>⚠️</span> <span>Cảnh báo sự cố</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertCallout('success')}
                          style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.76rem', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F0FDF4'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>✅</span> <span>Kế hoạch đã duyệt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertCallout('danger')}
                          style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '0.76rem', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>⛔</span> <span>Lỗi nghiêm trọng</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ký tự đặc biệt */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSymbolMenu(!showSymbolMenu);
                        setShowTablePicker(false);
                        setShowCalloutMenu(false);
                      }}
                      style={{
                        height: '30px',
                        padding: '0 8px',
                        background: '#FAF8F5',
                        border: '1px solid #E4DDD5',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: '#5B3924'
                      }}
                    >
                      <span>Ký tự</span>
                      <span style={{ fontSize: '9px' }}>▾</span>
                    </button>

                    {showSymbolMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '34px',
                        left: 0,
                        zIndex: 9999,
                        background: '#FFFFFF',
                        border: '1px solid #E4DDD5',
                        borderRadius: '6px',
                        padding: '8px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                        width: '180px'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                          {SPECIAL_SYMBOLS.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => insertSymbol(s)}
                              style={{ height: '28px', fontSize: '14px', border: '1px solid #E4DDD5', background: '#FAF8F5', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={insertTimestamp}
                    title="Chèn ngày giờ"
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      background: '#FAF8F5',
                      border: '1px solid #E4DDD5',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#5B3924'
                    }}
                  >
                    <Clock size={13} />
                    <span>Ngày/Giờ</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertSignatureBlock}
                    title="Chèn khối chữ ký"
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      background: '#FAF8F5',
                      border: '1px solid #E4DDD5',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#5B3924'
                    }}
                  >
                    <Award size={13} />
                    <span>Khối Chữ ký</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertLink}
                    title="Chèn liên kết"
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      background: '#FAF8F5',
                      border: '1px solid #E4DDD5',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#302820'
                    }}
                  >
                    <LinkIcon size={13} />
                    <span>Liên kết</span>
                  </button>

                  <button
                    type="button"
                    onClick={insertDivider}
                    title="Chèn đường kẻ ngang"
                    style={{
                      height: '30px',
                      padding: '0 8px',
                      background: '#FAF8F5',
                      border: '1px solid #E4DDD5',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: '#302820'
                    }}
                  >
                    <Minus size={13} />
                    <span>Đường kẻ ngang</span>
                  </button>
                </>
              )}

              {activeTab === 'templates' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#5B3924' }}>Mẫu có sẵn:</span>
                  
                  <button
                    type="button"
                    onClick={() => loadTemplate('capa')}
                    style={{
                      padding: '5px 12px',
                      background: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#5B3924'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#EADCC9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FAF6F0'}
                  >
                    Kế hoạch CAPA (5W2H)
                  </button>

                  <button
                    type="button"
                    onClick={() => loadTemplate('inspection')}
                    style={{
                      padding: '5px 12px',
                      background: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#5B3924'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#EADCC9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FAF6F0'}
                  >
                    Biên bản kiểm tra xuất xưởng (AQL)
                  </button>

                  <button
                    type="button"
                    onClick={() => loadTemplate('ctq')}
                    style={{
                      padding: '5px 12px',
                      background: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#5B3924'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#EADCC9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FAF6F0'}
                  >
                    Tiêu chuẩn kiểm soát CTQ
                  </button>

                  <button
                    type="button"
                    onClick={() => loadTemplate('violation')}
                    style={{
                      padding: '5px 12px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#B94A3D'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}
                  >
                    Biên bản xử lý sự cố chuyền
                  </button>
                </div>
              )}
            </div>

            {/* 3.5 VÙNG THƯỚC KẺ CANH LỀ */}
            <div style={{
              height: '18px',
              background: '#FAF8F5',
              borderBottom: '1px solid #E4DDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(900 * zoomLevel) / 100}px`,
                maxWidth: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 40px',
                fontSize: '9px',
                color: '#786B61',
                fontWeight: '600',
                borderLeft: '1px solid #E4DDD5',
                borderRight: '1px solid #E4DDD5',
                background: '#FFFFFF'
              }}>
                <span>| 0</span>
                <span>• 2</span>
                <span>• 4</span>
                <span>• 6</span>
                <span>• 8</span>
                <span>• 10</span>
                <span>• 12</span>
                <span>• 14</span>
                <span>16 |</span>
              </div>
            </div>

            {/* 3.6 VÙNG TRANG GIẤY SOẠN THẢO (Paper Canvas) */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              background: '#EAE5DF', // Nền bàn làm việc ấm
              padding: '28px 20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <div
                ref={editorRef}
                contentEditable
                onInput={updateCounts}
                style={{
                  width: `${(920 * zoomLevel) / 100}px`,
                  maxWidth: '100%',
                  minHeight: '620px',
                  background: '#FFFFFF',
                  padding: '48px 56px',
                  borderRadius: '2px',
                  boxShadow: '0 8px 30px rgba(91, 57, 36, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  outline: 'none',
                  fontSize: '0.94rem',
                  lineHeight: 1.7,
                  color: '#302820',
                  fontFamily: selectedFont,
                  boxSizing: 'border-box',
                  transition: 'width 0.15s ease'
                }}
                placeholder="Bắt đầu gõ văn bản, chèn bảng biểu hoặc nạp mẫu báo cáo..."
              />
            </div>

            {/* 3.7 THANH TRẠNG THÁI & NÚT LƯU NÂU GỖ (#5B3924) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 18px',
              background: '#FAF8F5',
              borderTop: '1px solid #E4DDD5',
              userSelect: 'none'
            }}>
              {/* Thống kê từ & Zoom Control */}
              <div style={{ fontSize: '0.76rem', color: '#786B61', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: '600' }}>
                <span>Trang 1 / 1</span>
                <span>Số từ: <strong style={{ color: '#5B3924' }}>{wordCount}</strong></span>
                <span>Số ký tự: <strong style={{ color: '#5B3924' }}>{charCount}</strong></span>
                <span style={{ color: '#E4DDD5' }}>|</span>
                <span>Tiếng Việt</span>
                
                {/* Bộ điều khiển thu phóng (Zoom) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(75, prev - 10))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={13} color="#786B61" />
                  </button>
                  <span style={{ fontSize: '0.72rem', width: '36px', textAlign: 'center', color: '#5B3924', fontWeight: '700' }}>{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Phóng to"
                  >
                    <ZoomIn size={13} color="#786B61" />
                  </button>
                </div>
              </div>

              {/* Nút Hủy & Lưu nội dung - Màu Nâu Gỗ (#5B3924) */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '7px 20px',
                    borderRadius: '4px',
                    border: '1.5px solid #E4DDD5',
                    background: '#FFFFFF',
                    color: '#5B3924',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FAF8F5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 24px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#5B3924', // Màu nâu gỗ chuẩn ERP G7
                    color: '#FFFDFC',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(91, 57, 36, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4A2E1B'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#5B3924'}
                >
                  Lưu nội dung
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Section6TopLinesTable;
