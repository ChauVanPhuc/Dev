import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo, Redo, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, ChevronLeft, ChevronRight, Table as TableIcon,
  ZoomOut, ZoomIn, RotateCcw, BookOpen, Save, RefreshCw, X, FileText, Edit, Check,
  GitBranch, Plus, Trash2, Layout, Eye
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import '../../MasterRecord/isoMasterRecord.css';
import FlowchartTable from '../FlowchartTable';
import FlowchartCanvas from '../FlowchartCanvas';
import logoCty from '../utils/logoCty';

const ProcessContentTab = ({ editor }) => {
  const {
    cardStyle,
    formData,
    setFormData,
    handleSaveForm,
    handleAddStep,
    handleUpdateStep,
    handleRemoveStep,
    handlePositionsChange,
    handleAutoLayoutClassic,
    handleNodeSelect,
    selectedStepIdx,
    setSelectedStepIdx,
    flowchartCanvasRef,
    getStepDisplayLabels,
  } = editor;

  // Word Editor states matching ISODirectWordEditorModal from /admin/iso-records
  const [docHeadings, setDocHeadings] = useState([]);
  const [showNavPane, setShowNavPane] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isWordEditorDirty, setIsWordEditorDirty] = useState(false);
  const [savingWordDirect, setSavingWordDirect] = useState(false);
  const [wordEditorZoom, setWordEditorZoom] = useState(100);
  const [wordEditorFont, setWordEditorFont] = useState('Times New Roman');
  const [wordEditorFontSize, setWordEditorFontSize] = useState('3');
  const [wordEditorStyle, setWordEditorStyle] = useState('p');
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Flowchart Modal & Navigation states
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('canvas'); // 'canvas' | 'table' | 'preview'
  const wordEditorRef = useRef(null);
  const flowchartSectionRef = useRef(null);

  // Quét danh sách các tiêu đề (Heading) thực tế đang có trên trang soạn thảo (KHÔNG gán cứng thêm bất kỳ mục nào)
  // Quét danh sách các tiêu đề (Heading) thực tế đang có trên trang soạn thảo (KHÔNG gán cứng thêm bất kỳ mục nào)
  const updateDocHeadings = useCallback(() => {
    if (!wordEditorRef?.current) return;
    const headingEls = wordEditorRef.current.querySelectorAll('#iso-heading-cover-page, #heading-iso-rev-log, h1, h2, h3, h4, .iso-doc-heading');
    const list = [];
    headingEls.forEach((el, idx) => {
      if (el.id === 'iso-heading-cover-page') {
        list.push({ id: el.id, title: 'Trang bìa', level: 1, el });
        return;
      }
      if (el.id === 'heading-iso-rev-log' || (el.innerText && el.innerText.includes('THEO DÕI SỬA ĐỔI'))) {
        if (!el.id) el.id = 'heading-iso-rev-log';
        list.push({ id: el.id, title: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU', level: 1, el });
        return;
      }
      if (!el.id) {
        el.id = `editor-heading-${idx + 1}`;
      }
      const tag = el.tagName.toLowerCase();
      let level = 1;
      if (tag === 'h1') level = 1;
      else if (tag === 'h2') level = 2;
      else if (tag === 'h3') level = 3;
      else if (tag === 'h4') level = 4;

      const title = el.innerText?.trim();
      if (title && !list.some(item => item.id === el.id)) {
        list.push({ id: el.id, title, level, el });
      }
    });
    setDocHeadings(list);
  }, []);

  // Kiểm tra động: CHỈ NẾU TRONG NỘI DUNG FILE THỰC SỰ CÓ LƯU ĐỒ THÌ MỚI SỬ DỤNG VÀ CHO PHÉP EDIT LƯU ĐỒ
  const hasFlowchartInFile = useMemo(() => {
    // 1. Loại trừ nếu là tài liệu Chính sách (CS) hoặc Quy chế thuần văn bản
    const docCode = (formData.code || formData.new_code || '').toUpperCase();
    const docName = (formData.name || '').toLowerCase();
    const docTypeCode = (formData.doc_type_code || '').toUpperCase();
    if (docTypeCode.includes('CS') || docCode.includes('CS') || docName.startsWith('chính sách') || docName.includes('quy chế')) {
      return false;
    }

    // 2. Nếu formData trả về flag has_flowchart rõ ràng từ backend
    if (formData.has_flowchart !== undefined) {
      return Boolean(formData.has_flowchart);
    }

    // 3. Kiểm tra nếu trong các tiêu đề (Headings) thực tế của file có chữ "Lưu đồ" hoặc "Sơ đồ quy trình"
    const headingHasFlow = docHeadings.some(h => {
      const t = (h.title || '').toLowerCase();
      return t.includes('lưu đồ') || t.includes('sơ đồ quy trình') || t.includes('flowchart');
    });
    if (headingHasFlow) return true;

    // 4. Kiểm tra nếu trong các sections thực tế của file có mục "Lưu đồ"
    if (formData.sections) {
      const secHasFlow = Object.keys(formData.sections).some(k => {
        if (k.startsWith('__')) return false;
        const t = k.toLowerCase();
        return t.includes('lưu đồ') || t.includes('sơ đồ quy trình') || t.includes('flowchart');
      });
      if (secHasFlow) return true;
    }

    // 5. Kiểm tra cấu hình section_types loại flowchart
    if (formData.section_types && Object.values(formData.section_types).some(t => t === 'flowchart')) {
      return true;
    }

    // 6. Kiểm tra nếu trong bảng Word thực tế đang hiển thị có cột "Lưu đồ"
    if (wordEditorRef?.current) {
      const tables = wordEditorRef.current.querySelectorAll('table');
      for (const tbl of tables) {
        const firstRowText = (tbl.rows[0]?.innerText || '').toLowerCase();
        if (firstRowText.includes('lưu đồ') || (firstRowText.includes('bước') && firstRowText.includes('trách nhiệm'))) {
          return true;
        }
      }
    }

    // 7. Kiểm tra nếu có danh sách các bước THỰC SỰ (có tên rõ ràng, ít nhất 2 bước hợp lệ)
    const validSteps = (formData.steps || []).filter(s => s && s.name && s.name.trim().length > 1 && s.name.trim() !== ':');
    if (validSteps.length >= 2) {
      return true;
    }

    return false;
  }, [formData.has_flowchart, formData.code, formData.new_code, formData.name, formData.doc_type_code, docHeadings, formData.sections, formData.section_types, formData.steps]);

  // Danh sách các bước hợp lệ (lọc bỏ các bước rỗng rác)
  const validSteps = useMemo(() => {
    return (formData.steps || []).filter(s => s && s.name && s.name.trim().length > 1 && s.name.trim() !== ':');
  }, [formData.steps]);

  // Map step display labels (ví dụ: B1, B2, B2.1...)
  const stepDisplayLabels = useMemo(() => {
    if (typeof getStepDisplayLabels === 'function') {
      return getStepDisplayLabels() || {};
    }
    return {};
  }, [getStepDisplayLabels, formData.steps]);

  // Nhận diện kiểu đoạn văn (p, h1, h2, h3...) tại vị trí con trỏ chuột
  const detectCurrentBlockStyle = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !wordEditorRef?.current) return;
      let node = sel.anchorNode;
      while (node && node !== wordEditorRef.current) {
        const tag = node.nodeName?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'p'].includes(tag)) {
          setWordEditorStyle(tag);
          return;
        }
        node = node.parentNode;
      }
      setWordEditorStyle('p');
    } catch (_) {}
  }, []);

  const cleanTitle = (formData.name || formData.code || 'QUY TRÌNH ISO').trim().toUpperCase();
  const deptName = formData.department_name || 'Công ty CP VINA G7';

  // Helper tạo Bảng 5.1 Lưu đồ quy trình 4 cột chuẩn ISO (Thuần màu đen, gọn gàng, thanh lịch, có mũi tên quay lại)
  const buildFlowchartTableHtml = useCallback((steps) => {
    if (!steps || steps.length === 0) return '';
    const totalSteps = steps.length;

    // 1. Phân tích trước các nhánh rẽ loopback: bước nào quay lại bước nào
    const loopbackMap = {}; // fromStepNumber -> toStepNumber
    const incomingLoopMap = {}; // toStepNumber -> [fromStepNumber]

    steps.forEach((s, sIdx) => {
      const stepNum = s.step_number || (sIdx + 1);
      const stepName = s.name || `Bước ${stepNum}`;
      const isDecision = s.node_type === 'decision' || 
        /phê duyệt|quyết định|kiểm tra|thẩm định|đối chiếu|xét duyệt/i.test(stepName) ||
        (s.fail_path && s.fail_path.length > 0);

      if (isDecision) {
        let retStep = null;
        if (s.fail_path && s.fail_path.length > 0 && s.fail_path[0].return_to_step) {
          retStep = s.fail_path[0].return_to_step;
        } else {
          retStep = Math.max(1, stepNum - 1);
        }
        if (retStep && retStep < stepNum) {
          loopbackMap[stepNum] = retStep;
          if (!incomingLoopMap[retStep]) incomingLoopMap[retStep] = [];
          incomingLoopMap[retStep].push(stepNum);
        }
      }
    });

    const rows = steps.map((s, sIdx) => {
      const stepNum = s.step_number || (sIdx + 1);
      let stepRole = s.assignee_role || '';
      if (!stepRole || stepRole.trim() === 'Kho') {
        const dUpper = (deptName || '').toUpperCase();
        if (cleanTitle.includes('XÁC MINH ĐỘ TUỔI') || cleanTitle.includes('LAO ĐỘNG') || dUpper.includes('NHÂN SỰ') || dUpper.includes('HCNS')) {
          const hrRoles = [
            'Bộ phận Hành chính / Nhân sự',
            'Bộ phận Nhân sự',
            'Trưởng phòng Nhân sự / Ban BSCI',
            'Ban Giám đốc',
            'Bộ phận Hành chính / Nhân sự',
            'Bộ phận Nhân sự / Ban Giám đốc'
          ];
          stepRole = hrRoles[sIdx] || 'Bộ phận Nhân sự';
        } else if (cleanTitle.includes('BÁN HÀNG') || dUpper.includes('KINH DOANH')) {
          stepRole = 'Phòng Kinh doanh / Bán hàng';
        } else if (cleanTitle.includes('LPA') || dUpper.includes('QLCL')) {
          stepRole = 'Ban Quản trị Chất lượng (QLCL)';
        } else {
          stepRole = 'Bộ phận Ban Giám đốc';
        }
      }
      const stepTpl = s.template_files || '';
      const stepName = s.name || `Bước ${stepNum}`;
      const isFirst = sIdx === 0;
      const isLast = sIdx === totalSteps - 1;
      const isDecision = Boolean(loopbackMap[stepNum]);
      const retStep = loopbackMap[stepNum];
      const borderRadius = (isFirst || isLast) ? '18px' : '2px';

      const isApproval = /phê duyệt|quyết định/i.test(stepName);
      const passLabel = isApproval ? 'Đồng ý' : 'Đạt';
      const failLabel = isApproval ? 'Không đồng ý' : 'K.Đạt';

      return `
        <tr style="height: auto; min-height: 52px;">
          <td style="border: 1px solid #000000; padding: 10px 6px; text-align: center; font-weight: bold; width: 12%; vertical-align: middle; font-size: 10pt; color: #000000;">
            Bước ${stepNum}
          </td>
          <td style="border: 1px solid #000000; padding: 10px 10px; width: 22%; text-align: center; vertical-align: middle; font-size: 9.5pt; color: #000000;">
            ${stepRole}
          </td>
          <td style="border: 1px solid #000000; padding: 14px 10px; width: 42%; text-align: center; vertical-align: middle; position: relative;">
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="position: relative; display: inline-block;">
                <div style="
                  width: 175px;
                  min-height: 38px;
                  border: 1.5px solid #000000;
                  border-radius: ${borderRadius};
                  background-color: #FFFFFF;
                  color: #000000;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 6px 8px;
                  font-size: 9pt;
                  font-weight: bold;
                  line-height: 1.3;
                  box-sizing: border-box;
                  text-align: center;
                ">
                  <div>${stepName}</div>
                </div>

                ${!isLast ? (
                  isDecision ? `
                    <div style="width: 175px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 3px; margin-bottom: -3px;">
                      <span style="font-size: 7pt; font-weight: bold; color: #000000; border: 1px solid #000000; padding: 0 4px; border-radius: 2px; background: #FFFFFF; line-height: 1.2;">
                        ${passLabel}
                      </span>
                      <span style="font-size: 13px; font-weight: bold; color: #000000; margin-top: 1px; line-height: 1; user-select: none;">
                        ↓
                      </span>
                    </div>
                  ` : `
                    <div style="width: 175px; text-align: center; color: #000000; font-size: 13px; line-height: 1; margin: 3px 0 -3px 0; font-weight: bold; user-select: none;">
                      ↓
                    </div>
                  `
                ) : ''}

                ${isDecision && retStep ? `
                  <svg width="270" height="52" style="position: absolute; left: 0; top: 0; pointer-events: none;">
                    <path d="M 175 19 L 205 19 L 205 6" stroke="#000000" stroke-width="1.2" fill="none" />
                    <polygon points="205,1 201.5,7 208.5,7" fill="#000000" />
                  </svg>
                  <div style="position: absolute; left: 212px; top: 19px; transform: translateY(-50%); display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; white-space: nowrap;">
                    <span style="font-size: 6.8pt; font-weight: bold; border: 1px solid #000000; padding: 1px 4px; border-radius: 2px; background: #FFFFFF; color: #000000;">
                      ${failLabel}
                    </span>
                    <span style="font-size: 7.5pt; font-weight: bold; color: #000000; margin-top: 3px;">
                      Quay lại B${retStep}
                    </span>
                  </div>
                ` : ''}

              </div>
            </div>
          </td>
          <td style="border: 1px solid #000000; padding: 10px 10px; width: 24%; text-align: center; vertical-align: middle; font-size: 9.5pt; color: #000000;">
            ${stepTpl && stepTpl !== '---' ? stepTpl : '<span style="color: #888888;">---</span>'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin: 18px 0;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 12px 0 8px 0; color: #000000;">
          5.1. Sơ đồ lưu trình kiểm soát công tác ${cleanTitle.toLowerCase()}
        </h3>
        <div class="iso-doc-table-wrapper" style="width:100%; overflow-x:auto; margin:10px 0;">
          <table class="iso-doc-table" style="width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000; background-color:#FFFFFF;">
            <colgroup>
              <col style="width:12%;" />
              <col style="width:22%;" />
              <col style="width:42%;" />
              <col style="width:24%;" />
            </colgroup>
            <thead>
              <tr style="background-color: #FAFAFA; font-weight: bold; text-align: center; height: 38px;">
                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; color: #000000; font-size: 10pt;">Bước</th>
                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; color: #000000; font-size: 10pt;">Trách nhiệm</th>
                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; color: #000000; font-size: 10pt;">Lưu đồ quy trình</th>
                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; color: #000000; font-size: 10pt;">Hồ sơ / Biểu mẫu</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }, [cleanTitle, deptName]);

  // Helper tạo Mục 5.2 Diễn giải chi tiết các bước thực hiện chuẩn ISO
  const buildDetailedStepsHtml = useCallback((steps) => {
    if (!steps || steps.length === 0) return '';
    const stepsHtml = steps.map((s, sIdx) => {
      const stepNum = s.step_number || (sIdx + 1);
      let stepRole = s.assignee_role || '';
      if (!stepRole || stepRole.trim() === 'Kho') {
        const dUpper = (deptName || '').toUpperCase();
        if (cleanTitle.includes('XÁC MINH ĐỘ TUỔI') || cleanTitle.includes('LAO ĐỘNG') || dUpper.includes('NHÂN SỰ') || dUpper.includes('HCNS')) {
          const hrRoles = [
            'Bộ phận Hành chính / Nhân sự',
            'Bộ phận Nhân sự',
            'Trưởng phòng Nhân sự / Ban BSCI',
            'Ban Giám đốc',
            'Bộ phận Hành chính / Nhân sự',
            'Bộ phận Nhân sự / Ban Giám đốc'
          ];
          stepRole = hrRoles[sIdx] || 'Bộ phận Nhân sự';
        } else if (cleanTitle.includes('BÁN HÀNG') || dUpper.includes('KINH DOANH')) {
          stepRole = 'Phòng Kinh doanh / Bán hàng';
        } else if (cleanTitle.includes('LPA') || dUpper.includes('QLCL')) {
          stepRole = 'Ban Quản trị Chất lượng (QLCL)';
        } else {
          stepRole = 'Bộ phận Ban Giám đốc';
        }
      }
      const stepTpl = s.template_files || '---';
      const stepName = s.name || `Bước ${stepNum}`;
      
      let instHtml = s.instructions || '';
      if (!instHtml || instHtml === '<p></p>') {
        instHtml = `
          <p style="margin: 3px 0;">• <strong>Trách nhiệm thực hiện:</strong> ${stepRole}</p>
          <p style="margin: 3px 0;">• <strong>Nội dung công việc:</strong> ${stepRole} chủ trì phối hợp với các phòng ban tiến hành ${stepName.toLowerCase()} theo đúng tiêu chuẩn kỹ thuật, hệ thống quản lý chất lượng ISO 9001:2015 và trách nhiệm xã hội Amfori BSCI.</p>
          <p style="margin: 3px 0;">• <strong>Hồ sơ / Biểu mẫu kiểm soát áp dụng:</strong> ${stepTpl}</p>
        `;
      } else if (!instHtml.trim().startsWith('<')) {
        const lines = instHtml.split('\n').filter(l => l.trim().length > 0);
        instHtml = lines.map(line => {
          const trimmed = line.trim();
          return `<p style="margin: 3px 0;">${trimmed}</p>`;
        }).join('');
      }

      return `
        <div style="margin-bottom: 16px;">
          <p style="font-weight: bold; margin-bottom: 4px; color: #0D0D0D; font-size: 11pt;">
            Bước ${stepNum}: ${stepName}
          </p>
          ${instHtml}
        </div>
      `;
    }).join('');

    return `
      <div style="margin: 18px 0;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 14px 0 8px 0; color: #0D0D0D;">
          5.2. Diễn giải chi tiết các bước thực hiện
        </h3>
        ${stepsHtml}
      </div>
    `;
  }, [cleanTitle, deptName]);

  // Helper tạo Bảng Theo dõi sửa đổi nội dung tài liệu chuẩn 22 dòng
  const buildRevisionLogsTableHtml = useCallback((logs) => {
    const revLogs = (logs && logs.length > 0)
      ? logs
      : [{ seq_no: 1, rev_date: formData.issue_date || '18/06/2026', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }];

    const totalRowsCount = 22;
    const emptyRowsCount = Math.max(0, totalRowsCount - revLogs.length);
    const emptyRowsHtml = Array.from({ length: emptyRowsCount }).map(() => `
      <tr style="height:28px;">
        <td style="border:1px solid #000000; padding:4px 6px; text-align: center;">&nbsp;</td>
        <td style="border:1px solid #000000; padding:4px 6px; text-align: center;">&nbsp;</td>
        <td style="border:1px solid #000000; padding:4px 8px;">&nbsp;</td>
        <td style="border:1px solid #000000; padding:4px 6px; text-align: center;">&nbsp;</td>
      </tr>
    `).join('');

    return `
      <div id="heading-iso-rev-log-wrapper" style="margin-bottom: 24px;">
        <h1 id="heading-iso-rev-log" class="iso-doc-heading level-1" style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 24px 0 12px 0; color: #0D0D0D; text-align: left;">
          THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
        </h1>
        <div class="iso-doc-table-wrapper" data-t-idx="1" style="width:100%; max-width:100%; overflow-x:auto; margin:12px 0;">
        <table class="iso-doc-table" data-t-idx="1" style="width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000;">
          <colgroup>
            <col style="width:12.5%;" />
            <col style="width:14.3%;" />
            <col style="width:50.3%;" />
            <col style="width:22.9%;" />
          </colgroup>
          <thead>
            <tr style="background-color: #F8FAFC; font-weight: bold; text-align: center; height:34px;">
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Số TT</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Ngày Sửa</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Nội Dung Sửa Đổi</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:10pt; color:#0D0D0D;">Trang Số</th>
            </tr>
          </thead>
          <tbody>
            ${revLogs.map(l => `
              <tr style="height:28px;">
                <td style="padding: 4px 6px; border: 1px solid #000000; text-align: center; font-size:9.5pt; color:#0D0D0D;">${String(l.seq_no || 1).padStart(2, '0')}</td>
                <td style="padding: 4px 6px; border: 1px solid #000000; text-align: center; font-size:9.5pt; color:#0D0D0D;">${l.rev_date || '---'}</td>
                <td style="padding: 4px 8px; border: 1px solid #000000; font-size:9.5pt; color:#0D0D0D;">${l.content || 'Ban hành lần đầu'}</td>
                <td style="padding: 4px 6px; border: 1px solid #000000; text-align: center; font-size:9.5pt; color:#0D0D0D;">${l.page_no || 'Toàn bộ'}</td>
              </tr>
            `).join('')}
            ${emptyRowsHtml}
          </tbody>
        </table></div>
        <div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>
      </div>
    `;
  }, [formData.issue_date]);

  // Xử lý Lưu & Cập nhật từ Flowchart Modal đồng bộ thẳng vào văn bản Word A4
  const handleSaveFlowchartModal = async () => {
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const editorName = formData.editor || formData.owner || 'Người biên soạn';
      const currentLogs = [...(formData.revision_logs || [])];
      const stepCount = (formData.steps || []).length;
      const noteContent = `Cập nhật lưu đồ và các bước quy trình (${stepCount} bước)`;

      let updatedLogs = currentLogs;
      const lastLog = currentLogs.length > 0 ? currentLogs[currentLogs.length - 1] : null;
      const isDup = lastLog && lastLog.rev_date === todayStr && lastLog.content === noteContent;
      if (!isDup) {
        updatedLogs = [
          ...currentLogs,
          {
            seq_no: currentLogs.length + 1,
            rev_date: todayStr,
            content: noteContent,
            page_no: 'Mục 5 / Toàn bộ',
            modifier: editorName
          }
        ];
        if (setFormData) {
          setFormData(prev => ({ ...prev, revision_logs: updatedLogs }));
        }
      }

      // Lưu CSDL mà không thoát màn hình
      if (handleSaveForm) {
        await handleSaveForm({ stayOnPage: true });
      }

      // Cập nhật văn bản hiển thị tức thì
      if (formData.steps && formData.steps.length > 0 && wordEditorRef.current) {
        const newTableHtml = buildFlowchartTableHtml(formData.steps);
        const newDetailedStepsHtml = buildDetailedStepsHtml(formData.steps);
        const newRevLogsHtml = buildRevisionLogsTableHtml(updatedLogs);
        let curHtml = wordEditorRef.current.innerHTML;

        if (/5\.1\.\s*Sơ đồ lưu trình/i.test(curHtml)) {
          const replacedTable = curHtml.replace(
            /<div[^>]*>\s*<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>\s*<\/div>\s*<\/div>/i,
            newTableHtml
          );
          if (replacedTable !== curHtml) {
            curHtml = replacedTable;
          } else {
            curHtml = curHtml.replace(
              /<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>/i,
              newTableHtml
            );
          }
        }

        if (/5\.2\.\s*Diễn giải chi tiết/i.test(curHtml)) {
          const replacedDetails = curHtml.replace(
            /<div[^>]*>\s*<h3[^>]*>\s*5\.2\.\s*Diễn giải chi tiết[\s\S]*?<\/div>\s*(?=<div id="iso-section-|\s*$)/i,
            newDetailedStepsHtml
          );
          if (replacedDetails !== curHtml) {
            curHtml = replacedDetails;
          }
        }

        if (/heading-iso-rev-log/i.test(curHtml)) {
          const replacedRev = curHtml.replace(
            /<div id="heading-iso-rev-log-wrapper"[\s\S]*?<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---<\/span><\/div>\s*<\/div>/i,
            newRevLogsHtml
          );
          if (replacedRev !== curHtml) {
            curHtml = replacedRev;
          }
        }

        wordEditorRef.current.innerHTML = curHtml;
        setIsWordEditorDirty(true);
      }

      setShowFlowchartModal(false);
    } catch (err) {
      console.error('Lỗi khi lưu lưu đồ:', err);
      alert('Lỗi: ' + (err?.message || 'Không thể lưu'));
    }
  };

  // Nạp nội dung tài liệu từ tệp Word hoặc từ sections trong formData (Dựng chuẩn 3 phần theo Mẫu quy trình.docx)
  const loadDocumentContent = useCallback(async () => {
    setLoadingDoc(true);
    try {
      const targetPath = formData.file_path || formData.docx_path || formData.document_path || '';
      const cleanTitle = (formData.name || formData.code || 'QUY TRÌNH ISO').trim().toUpperCase();
      const docCode = formData.code || formData.new_code || '---';
      const version = formData.version || '01';
      const issueDate = formData.issue_date || '18/06/2026';
      const deptName = formData.department_name || 'Công ty CP VINA G7';
      const issuer = formData.editor || formData.owner || 'Người biên soạn';
      const approver = formData.approver || 'Người phê duyệt';

      // Hàm tự động điền và bóc tách thông minh các trường placeholder
      const sanitizePlaceholders = (rawHtml) => {
        if (!rawHtml) return rawHtml;
        let out = rawHtml;
        const firstLog = (formData.revision_logs && formData.revision_logs.length > 0) ? formData.revision_logs[0] : {};
        const logSeq = (firstLog.seq_no || version || '01').toString().padStart(2, '0');
        const logDate = firstLog.rev_date || issueDate;
        const logContent = firstLog.content || 'Ban hành lần đầu';
        const logPage = firstLog.page_no || 'Toàn bộ';

        out = out.replaceAll('[sinh khi có điều chỉnh]', logSeq);
        out = out.replaceAll('[ngày thực hiện đièu chỉnh]', logDate);
        out = out.replaceAll('[ngày thực hiện điều chỉnh]', logDate);
        out = out.replaceAll('[đề mục điều chỉnh]', logContent);
        out = out.replaceAll('[trang của đề mục]', logPage);

        // Bóc tách tên & chức vụ người biên soạn
        let issName = issuer;
        let issRole = 'Biên soạn';
        const mIss = issuer.match(/^(.*?)\s*[\(\:]\s*(.*?)\)?$/);
        if (mIss && mIss[2]?.trim()) {
          issRole = mIss[1].trim() || 'Biên soạn';
          issName = mIss[2].trim().replace(/\)$/, '');
        }
        out = out.replaceAll('[Họ tên người biên soạn]', issName || '&nbsp;');
        out = out.replaceAll('[CV NBS]', issRole);

        // Bóc tách tên & chức vụ người phê duyệt
        let appName = approver;
        let appRole = 'Phê duyệt';
        const mApp = approver.match(/^(.*?)\s*[\(\:]\s*(.*?)\)?$/);
        if (mApp && mApp[2]?.trim()) {
          appRole = mApp[1].trim();
          appName = mApp[2].trim().replace(/\)$/, '');
        } else if (/giám đốc|phó tổng|tổng giám|trưởng phòng|bgd|tgđ/i.test(approver)) {
          appRole = approver;
          appName = '';
        }
        out = out.replaceAll('[Họ tên người phê duyệt]', appName || '&nbsp;');
        out = out.replaceAll('[CV NPD]', appRole);

        // Xử lý tự động trường hợp trong bảng đã có sẵn text cũ cần chuẩn hoá
        out = out.replace(/(<td[^>]*>)\s*Biên soạn\s*\(([^)]+)\)\s*(<\/td>)/gi, (m, p1, p2, p3) => `${p1}${p2.trim()}${p3}`);
        out = out.replace(/(<td[^>]*>)\s*Người biên soạn\s*(<\/td>)/gi, (m, p1, p2) => `${p1}Biên soạn${p2}`);
        out = out.replace(/(<td[^>]*>)\s*(Phó Tổng Giám Đốc|Tổng Giám Đốc|Giám Đốc|Trưởng Phòng)\s*(<\/td>)\s*(<td[^>]*>)\s*Người phê duyệt\s*(<\/td>)/gi, (m, td1, role, td2, td3, td4) => `${td1}&nbsp;${td2}${td3}${role}${td4}`);

        out = out.replaceAll('[Tên quy trình]', cleanTitle);

        // Xóa sạch các text cũ trong hộp decision cũ và nhãn thừa cũ
        out = out.replace(/\s*\(Đồng ý\s*──►\s*B\d+\s*\/\s*Không đồng ý\s*──►\s*B\d+\)/gi, '');
        out = out.replace(/<div style="font-size: 8pt; color: #444444;[^"]*">\s*Đạt: Tiếp tục.*?<\/div>/gi, '');
        out = out.replace(/\(từ B\d+\)/gi, '');
        out = out.replace(/▲\s*Về\s*B\d+/gi, '');

        // Chuẩn hoá màu sắc lưu đồ cũ sang màu đen đơn sắc thanh lịch
        out = out.replaceAll('#0284c7', '#000000');
        out = out.replaceAll('#0284C7', '#000000');
        out = out.replaceAll('#b45309', '#000000');
        out = out.replaceAll('#B45309', '#000000');
        out = out.replaceAll('#f0f9ff', '#ffffff');
        out = out.replaceAll('#F0F9FF', '#FFFFFF');
        out = out.replaceAll('#fef3c7', '#ffffff');
        out = out.replaceAll('#FEF3C7', '#FFFFFF');

        // Chuẩn hoá nếu vô tình bị gán 'Kho' ở các quy trình phi kho bãi
        if (!cleanTitle.includes('KHO') && !(deptName || '').toUpperCase().includes('KHO')) {
          if (cleanTitle.includes('XÁC MINH ĐỘ TUỔI') || cleanTitle.includes('LAO ĐỘNG') || (deptName || '').toUpperCase().includes('NHÂN SỰ')) {
            const hrRoles = [
              'Bộ phận Hành chính / Nhân sự',
              'Bộ phận Nhân sự',
              'Trưởng phòng Nhân sự / Ban BSCI',
              'Ban Giám đốc',
              'Bộ phận Hành chính / Nhân sự',
              'Bộ phận Nhân sự / Ban Giám đốc'
            ];
            let rIdx = 0;
            out = out.replace(/(<td[^>]*>)\s*Kho\s*(<\/td>)/gi, (m, tdOpen, tdClose) => {
              const role = hrRoles[rIdx] || 'Bộ phận Nhân sự';
              rIdx++;
              return `${tdOpen}${role}${tdClose}`;
            });
            out = out.replace(/<strong>Trách nhiệm thực hiện:<\/strong>\s*Kho/gi, '<strong>Trách nhiệm thực hiện:</strong> Bộ phận Hành chính / Nhân sự');
          }
        }

        return out;
      };

      // 0. Nếu đã có bản HTML lưu trực tiếp trước đó
      if (formData.sections && formData.sections.__full_html__) {
        if (wordEditorRef.current) {
          let savedHtml = formData.sections.__full_html__;
          if (savedHtml.includes('/vina_g7_logo.png')) {
            savedHtml = savedHtml.replaceAll('/vina_g7_logo.png', logoCty);
          }

          // Tự động nâng cấp bảng lưu đồ cũ sang bảng lưu đồ mới có mũi tên quay lại chuẩn ISO
          if (formData.steps && formData.steps.length > 0 && /5\.1\.\s*Sơ đồ lưu trình/i.test(savedHtml)) {
            if (!savedHtml.includes('Quay lại B') || savedHtml.includes('(từ B') || savedHtml.includes('Về B') || savedHtml.includes('width="40"') || />\s*Kho\s*</i.test(savedHtml)) {
              const newTableHtml = buildFlowchartTableHtml(formData.steps);
              const replaced = savedHtml.replace(
                /<div[^>]*>\s*<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>\s*<\/div>\s*<\/div>/i,
                newTableHtml
              );
              if (replaced !== savedHtml) {
                savedHtml = replaced;
              } else {
                savedHtml = savedHtml.replace(
                  /<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>/i,
                  newTableHtml
                );
              }
            }
          }

          savedHtml = sanitizePlaceholders(savedHtml);
          wordEditorRef.current.innerHTML = savedHtml;
          setIsWordEditorDirty(false);
          setTimeout(updateDocHeadings, 150);
        }
        setLoadingDoc(false);
        return;
      }

      // 1. Nếu có tệp Word thực tế: ưu tiên nạp nguyên bản tệp Word đầy đủ (Trang bìa, Theo dõi sửa đổi, Lưu đồ 4 cột & Nội dung)
      if (targetPath) {
        try {
          const res = await api.get('/iso-master-records/file-preview/docx', {
            params: { path: targetPath }
          });
          const data = res?.data || res;
          if (data && data.success && data.html_content) {
            if (wordEditorRef.current) {
              let processedHtml = data.html_content;
              if (processedHtml.includes('/vina_g7_logo.png')) {
                processedHtml = processedHtml.replaceAll('/vina_g7_logo.png', logoCty);
              }

              // Tự động nâng cấp bảng lưu đồ 5.1 sang bảng lưu đồ mới có mũi tên quay lại
              if (formData.steps && formData.steps.length > 0 && /5\.1\.\s*Sơ đồ lưu trình/i.test(processedHtml)) {
                if (!processedHtml.includes('Quay lại B') || processedHtml.includes('(từ B') || processedHtml.includes('Về B') || processedHtml.includes('width="40"') || />\s*Kho\s*</i.test(processedHtml)) {
                  const newTableHtml = buildFlowchartTableHtml(formData.steps);
                  const replaced = processedHtml.replace(
                    /<div[^>]*>\s*<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>\s*<\/div>\s*<\/div>/i,
                    newTableHtml
                  );
                  if (replaced !== processedHtml) {
                    processedHtml = replaced;
                  } else {
                    processedHtml = processedHtml.replace(
                      /<h3[^>]*>\s*5\.1\.\s*Sơ đồ lưu trình[\s\S]*?<\/table>/i,
                      newTableHtml
                    );
                  }
                }
              }

              processedHtml = sanitizePlaceholders(processedHtml);
              wordEditorRef.current.innerHTML = processedHtml;
              setIsWordEditorDirty(false);
              setTimeout(updateDocHeadings, 150);
            }
            setLoadingDoc(false);
            return;
          }
        } catch (_) {
          // File không tồn tại hoặc lỗi, tự động dựng 3 phần chuẩn từ database
        }
      }




    // Lấy 2 trang gốc (Trang bìa & Theo dõi sửa đổi) trực tiếp từ API template cắt từ Mẩu quy trình.docx
    let originalCoverAndRevHtml = '';
    try {
      const tplRes = await api.get('/iso-master-records/template-original-2-pages', {
        params: {
          doc_title: cleanTitle,
          issuer: issuer,
          approver: approver,
          doc_code: docCode,
          issue_date: issueDate,
          version: version,
          revision_logs: JSON.stringify(formData.revision_logs || [])
        }
      });
      const tplData = tplRes?.data || tplRes;
      if (tplData && tplData.success && tplData.full_2_pages_html) {
        let tplHtml = tplData.full_2_pages_html;
        if (tplHtml.includes('/vina_g7_logo.png')) {
          tplHtml = tplHtml.replaceAll('/vina_g7_logo.png', logoCty);
        }
        originalCoverAndRevHtml = sanitizePlaceholders(tplHtml);
      }
    } catch (eTpl) {
      console.warn('Lỗi gọi API template 2 trang gốc, chuyển sang dùng HTML gốc dự phòng:', eTpl);
    }

    if (!originalCoverAndRevHtml) {
      // Dựng HTML 100% nguyên bản cắt từ Mẩu quy trình.docx (5 cột và 23 hàng)
      const revLogs = (formData.revision_logs && formData.revision_logs.length > 0)
        ? formData.revision_logs
        : [{ seq_no: 1, rev_date: issueDate || '18/06/2026', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }];

      const totalRowsCount = 22;
      const emptyRowsCount = Math.max(0, totalRowsCount - revLogs.length);
      const emptyRowsHtml = Array.from({ length: emptyRowsCount }).map(() => `
        <tr>
          <td style="border:1px solid #000000; padding:6px 8px; text-align: center;">&nbsp;</td>
          <td style="border:1px solid #000000; padding:6px 8px; text-align: center;">&nbsp;</td>
          <td style="border:1px solid #000000; padding:6px 8px;">&nbsp;</td>
          <td style="border:1px solid #000000; padding:6px 8px; text-align: center;">&nbsp;</td>
        </tr>
      `).join('');

      originalCoverAndRevHtml = `
        <div id="iso-heading-cover-page" class="iso-doc-cover-section" style="margin-bottom: 24px;">
          <div class="iso-doc-table-wrapper" data-t-idx="0" style="width:100%; max-width:100%; overflow-x:auto; margin:12px 0;">
          <table class="iso-doc-table" data-t-idx="0" style="width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000;">
            <colgroup>
              <col style="width:21.9%;" />
              <col style="width:5%;" />
              <col style="width:29.0%;" />
              <col style="width:16.9%;" />
              <col style="width:29.8%;" />
            </colgroup>
            <tr style="height:126px; min-height:126px;">
              <th data-r="0" data-c="0" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; word-break:break-word; text-align: center;"><p class="iso-cell-paragraph"><img src="${logoCty}" style="max-height:85px; max-width:100%; display:block; margin:0 auto; object-fit:contain;" alt="Logo VINA G7" /></p></th>
              <th data-r="0" data-c="1" colspan="4" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; word-break:break-word;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 18pt; text-transform: uppercase; color: #0D0D0D;">CÔNG TY CỔ PHẦN VINA G7</strong></p></th>
            </tr>
            <tr style="height:260px; min-height:260px;">
              <td data-r="1" data-c="0" colspan="5" style="border:1px solid #000000; padding:40px 16px; vertical-align: middle; text-align: center; word-break:break-word;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 24pt; text-transform: uppercase; color: #0D0D0D; line-height: 1.4;">${cleanTitle}</strong></p></td>
            </tr>
            <tr style="height:52px; min-height:52px;">
              <td data-r="2" data-c="0" colspan="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt; text-transform: uppercase;">TRÁCH NHIỆM</strong></p></td>
              <td data-r="2" data-c="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt; text-transform: uppercase;">HỌ TÊN</strong></p></td>
              <td data-r="2" data-c="3" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt; text-transform: uppercase;">CHỨC VỤ</strong></p></td>
              <td data-r="2" data-c="4" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt; text-transform: uppercase;">KÝ TÊN</strong></p></td>
            </tr>
            <tr style="height:86px; min-height:86px;">
              <td data-r="3" data-c="0" colspan="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt;">Biên soạn</strong></p></td>
              <td data-r="3" data-c="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong>${issuer}</strong></p></td>
              <td data-r="3" data-c="3" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong>Người soạn</strong></p></td>
              <td data-r="3" data-c="4" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;">&nbsp;</td>
            </tr>
            <tr style="height:86px; min-height:86px;">
              <td data-r="4" data-c="0" colspan="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong style="font-size: 11pt;">Phê duyệt</strong></p></td>
              <td data-r="4" data-c="2" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong>${approver}</strong></p></td>
              <td data-r="4" data-c="3" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;"><p class="iso-cell-paragraph" style="text-align: center;"><strong>Người duyệt</strong></p></td>
              <td data-r="4" data-c="4" style="border:1px solid #000000; padding:6px 8px; vertical-align: middle; text-align: center;">&nbsp;</td>
            </tr>
          </table></div>
          <div class="iso-doc-page-break-divider"><span>--- Ngắt trang (Trang bìa) ---</span></div>
        </div>

        <div id="heading-iso-rev-log-wrapper" style="margin-bottom: 24px;">
          <h1 id="heading-iso-rev-log" class="iso-doc-heading level-1" style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 24px 0 12px 0; color: #0D0D0D; text-align: left;">
            THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
          </h1>
          <div class="iso-doc-table-wrapper" data-t-idx="1" style="width:100%; max-width:100%; overflow-x:auto; margin:12px 0;">
          <table class="iso-doc-table" data-t-idx="1" style="width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000;">
            <colgroup>
              <col style="width:12.5%;" />
              <col style="width:14.3%;" />
              <col style="width:50.3%;" />
              <col style="width:22.9%;" />
            </colgroup>
            <thead>
              <tr style="background-color: #F8FAFC; font-weight: bold; text-align: center;">
                <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">Số TT</th>
                <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">Ngày Sửa</th>
                <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">Nội Dung Sửa Đổi</th>
                <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">Trang Số</th>
              </tr>
            </thead>
            <tbody>
              ${revLogs.map(l => `
                <tr>
                  <td style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">${String(l.seq_no || 1).padStart(2, '0')}</td>
                  <td style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">${l.rev_date || '---'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #000000;">${l.content || 'Ban hành lần đầu'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #000000; text-align: center;">${l.page_no || 'Toàn bộ'}</td>
                </tr>
              `).join('')}
              ${emptyRowsHtml}
            </tbody>
          </table></div>
          <div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>
        </div>
      `;
    }

    originalCoverAndRevHtml = sanitizePlaceholders(originalCoverAndRevHtml);
    let combinedHtml = originalCoverAndRevHtml;

    // PHẦN 3: NỘI DUNG TRONG FILE
    if (formData.sections && Object.keys(formData.sections).length > 0) {
      Object.entries(formData.sections).forEach(([secTitle, secContent], idx) => {
        if (secTitle.startsWith('__')) return;
        
        let processedContent = secContent || '';
        // Nếu là Mục 5 (Nội dung) và chưa có bảng lưu đồ -> tự động dựng Bảng 5.1 và Diễn giải 5.2 từ formData.steps
        if (/5\.\s*nội dung|nội dung/i.test(secTitle) && !processedContent.includes('<table')) {
          const tableHtml = buildFlowchartTableHtml(formData.steps || []);
          const detailedHtml = buildDetailedStepsHtml(formData.steps || []);
          processedContent = `${tableHtml}${detailedHtml}${processedContent}`;
        }

        combinedHtml += `
          <h2 id="heading-sec-${idx + 1}" class="iso-doc-heading level-1" style="margin: 24px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px;">
            ${secTitle}
          </h2>
          <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px;">
            ${processedContent || '<p>(Chưa có nội dung)</p>'}
          </div>
        `;
      });
    } else {
      const standardSecs = [
        '1. Mục đích.',
        '2. Phạm vi áp dụng.',
        '3. Tài liệu viện dẫn',
        '4. Định nghĩa và Từ viết tắt',
        '5. Nội dung',
        '6. Biểu mẫu'
      ];
      standardSecs.forEach((sName, idx) => {
        let secBody = `<p>[Nhập nội dung cho ${sName}]</p>`;
        if (/5\.\s*nội dung/i.test(sName)) {
          secBody = `${buildFlowchartTableHtml(formData.steps || [])}${buildDetailedStepsHtml(formData.steps || [])}`;
        }

        combinedHtml += `
          <h2 id="heading-sec-${idx + 1}" class="iso-doc-heading level-1" style="margin: 24px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px;">
            ${sName}
          </h2>
          <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px;">
            ${secBody}
          </div>
        `;
      });
    }

    if (wordEditorRef.current) {
      wordEditorRef.current.innerHTML = combinedHtml;
      setIsWordEditorDirty(false);
      setTimeout(updateDocHeadings, 150);
    }
  } catch (fatalErr) {
    console.error('Lỗi khi nạp tài liệu Word:', fatalErr);
  } finally {
    setLoadingDoc(false);
  }
}, [
  formData.file_path, formData.docx_path, formData.document_path,
  formData.name, formData.code, formData.new_code, formData.version,
  formData.issue_date, formData.department_name, formData.editor,
  formData.owner, formData.approver, formData.revision_logs,
  formData.sections, updateDocHeadings
]);

  useEffect(() => {
    loadDocumentContent();
  }, [loadDocumentContent]);

  // Thực thi các lệnh định dạng văn bản
  const handleExecWordCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    setIsWordEditorDirty(true);
    if (wordEditorRef.current) {
      wordEditorRef.current.focus();
    }
  };

  // Chèn bảng
  const handleInsertWordTable = () => {
    const rows = window.prompt('Nhập số dòng bảng:', '3');
    if (!rows) return;
    const cols = window.prompt('Nhập số cột bảng:', '3');
    if (!cols) return;
    const r = parseInt(rows, 10);
    const c = parseInt(cols, 10);
    if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) return;

    let tableHtml = '<table class="iso-word-table" style="width:100%; border-collapse:collapse; margin:14px 0;"><tbody>';
    for (let i = 0; i < r; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < c; j++) {
        tableHtml += '<td style="border:1px solid #333; padding:6px 10px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, tableHtml);
    setIsWordEditorDirty(true);
    updateDocHeadings();
  };

  // Lưu nội dung Word trực tiếp
  const handleSaveDirectWordContent = async () => {
    if (!wordEditorRef.current) return;
    const editedHtml = wordEditorRef.current.innerHTML;
    const targetPath = formData.file_path;

    setSavingWordDirect(true);
    try {
      if (targetPath) {
        await api.post('/iso-master-records/save-direct-word-content', {
          draft_path: targetPath,
          html_content: editedHtml
        });
      }

      // Cập nhật vào state form cha
      if (setFormData) {
        setFormData(prev => ({
          ...prev,
          sections: {
            ...(prev.sections || {}),
            '__full_html__': editedHtml
          }
        }));
      }

      setIsWordEditorDirty(false);
      alert('Đã lưu nội dung tài liệu Word thành công!');
    } catch (err) {
      console.error('Lỗi khi lưu tài liệu:', err);
      alert('Lỗi khi lưu tài liệu: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSavingWordDirect(false);
    }
  };

  return (
    <div style={{
      ...cardStyle,
      height: '84vh',
      minHeight: '700px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(45, 26, 18, 0.05)',
      marginBottom: '16px'
    }}>
      {/* 1. WORD RIBBON TOOLBAR (CHUẨN MICROSOFT WORD) */}
      <div className="iso-word-ribbon" style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        {/* Nhóm Nút Lưu tài liệu */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={handleSaveDirectWordContent}
            disabled={savingWordDirect}
            title="Lưu tài liệu Word"
            style={{
              backgroundColor: '#FAF6F0',
              color: '#7B5233',
              border: '1px solid #7B5233',
              fontWeight: 'bold',
              padding: '0 10px',
              gap: '5px'
            }}
          >
            {savingWordDirect ? (
              <>
                <RefreshCw className="iso-spinner" size={13} />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Lưu tài liệu</span>
              </>
            )}
          </button>
        </div>

        {/* Nhóm Nút Chỉnh sửa Lưu đồ: CHỈ HIỂN THỊ KHI TRONG FILE THỰC SỰ CÓ LƯU ĐỒ */}
        {hasFlowchartInFile && (
          <div className="iso-ribbon-group">
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setShowFlowchartModal(true)}
              title="Mở bảng vẽ và chỉnh sửa Lưu đồ Quy trình (Flowchart Canvas)"
              style={{
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                border: '1px solid #7B5233',
                fontWeight: 'bold',
                padding: '0 10px',
                gap: '6px'
              }}
            >
              <GitBranch size={13} />
              <span>Chỉnh sửa Lưu đồ ({validSteps.length})</span>
            </button>
          </div>
        )}

        {/* Nhóm 1: Undo / Redo */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('undo')}
            title="Hoàn tác (Ctrl+Z)"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('redo')}
            title="Làm lại (Ctrl+Y)"
          >
            <Redo size={14} />
          </button>
        </div>

        {/* Nhóm 2: Font & Cỡ chữ */}
        <div className="iso-ribbon-group">
          <select
            className="iso-ribbon-select font-family"
            value={wordEditorFont}
            onChange={(e) => {
              setWordEditorFont(e.target.value);
              handleExecWordCmd('fontName', e.target.value);
            }}
            title="Phông chữ"
          >
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Calibri">Calibri</option>
            <option value="Roboto">Roboto</option>
            <option value="Segoe UI">Segoe UI</option>
          </select>

          <select
            className="iso-ribbon-select font-size"
            value={wordEditorFontSize}
            onChange={(e) => {
              setWordEditorFontSize(e.target.value);
              handleExecWordCmd('fontSize', e.target.value);
            }}
            title="Cỡ chữ"
          >
            <option value="1">10 pt</option>
            <option value="2">11 pt</option>
            <option value="3">12 pt (Chuẩn)</option>
            <option value="4">14 pt</option>
            <option value="5">18 pt</option>
            <option value="6">24 pt</option>
            <option value="7">36 pt</option>
          </select>
        </div>

        {/* Nhóm 3: Định dạng chữ (Bold, Italic, Underline, Strikethrough) */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('bold')}
            title="In đậm (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('italic')}
            title="In nghiêng (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('underline')}
            title="Gạch chân (Ctrl+U)"
          >
            <Underline size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('strikeThrough')}
            title="Gạch ngang chữ"
          >
            <Strikethrough size={14} />
          </button>
        </div>

        {/* Nhóm 4: Heading styles */}
        <div className="iso-ribbon-group">
          <select
            className="iso-ribbon-select heading-style"
            value={wordEditorStyle}
            onChange={(e) => {
              setWordEditorStyle(e.target.value);
              handleExecWordCmd('formatBlock', `<${e.target.value}>`);
              setTimeout(updateDocHeadings, 100);
            }}
            title="Định dạng đoạn / Tiêu đề"
          >
            <option value="p">Đoạn văn (Normal)</option>
            <option value="h1">Heading 1 (Mục lớn)</option>
            <option value="h2">Heading 2 (Mục con)</option>
            <option value="h3">Heading 3 (Tiểu mục)</option>
            <option value="h4">Heading 4</option>
          </select>
        </div>

        {/* Nhóm Điều hướng Mục lục */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className={`iso-ribbon-btn ${showNavPane ? 'active' : ''}`}
            onClick={() => setShowNavPane(prev => !prev)}
            title="Hiện / Ẩn thanh mục lục (Navigation Pane)"
            style={showNavPane ? { backgroundColor: '#e2e8f0', color: '#1e293b' } : {}}
          >
            <BookOpen size={14} />
            <span style={{ fontSize: '0.74rem', marginLeft: '4px' }}>Mục lục</span>
          </button>
        </div>

        {/* Nhóm 5: Căn lề */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('justifyLeft')}
            title="Căn trái"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('justifyCenter')}
            title="Căn giữa"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('justifyRight')}
            title="Căn phải"
          >
            <AlignRight size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('justifyFull')}
            title="Căn đều 2 bên"
          >
            <AlignJustify size={14} />
          </button>
        </div>

        {/* Nhóm 6: Danh sách & Thụt lề */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('insertUnorderedList')}
            title="Danh sách gạch đầu dòng (Bullets)"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('insertOrderedList')}
            title="Danh sách số (Numbering)"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('outdent')}
            title="Giảm thụt lề (Outdent)"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleExecWordCmd('indent')}
            title="Tăng thụt lề (Indent)"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Nhóm 7: Chèn Bảng */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={handleInsertWordTable}
            title="Chèn bảng biểu"
          >
            <TableIcon size={14} />
            <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>Bảng</span>
          </button>
        </div>

        {/* Nhóm 8: Thu phóng & Nút Chỉnh sửa */}
        <div className="iso-ribbon-group zoom-group" style={{ marginLeft: 'auto', borderRight: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(prev => Math.max(50, prev - 10))}
              title="Thu nhỏ"
            >
              <ZoomOut size={13} />
            </button>
            <span className="iso-ribbon-zoom-text">{wordEditorZoom}%</span>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(prev => Math.min(200, prev + 10))}
              title="Phóng to"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              className="iso-ribbon-btn"
              onClick={() => setWordEditorZoom(100)}
              title="Kích thước chuẩn (100%)"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1', margin: '0 4px' }} />

          {/* NÚT CHỈNH SỬA (EDIT) */}
          <button
            type="button"
            className="iso-viewer-header-edit-btn"
            onClick={() => {
              setIsEditing(prev => !prev);
              if (!isEditing && wordEditorRef.current) {
                setTimeout(() => wordEditorRef.current.focus(), 100);
              }
            }}
            title={isEditing ? 'Chuyển sang chế độ xem tài liệu' : 'Bật chế độ chỉnh sửa tài liệu Word'}
            style={{
              height: '28px',
              padding: '0 12px',
              borderRadius: '4px',
              border: '1.5px solid #7B5233',
              backgroundColor: isEditing ? '#FAF6F0' : '#7B5233',
              color: isEditing ? '#7B5233' : '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            {isEditing ? <Check size={14} color="#7B5233" /> : <Edit size={14} color="#FFFFFF" />}
            <span>{isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa'}</span>
          </button>
        </div>
      </div>

      {/* 2. BODY: MỤC LỤC BÊN TRÁI & KHỔ GIẤY A4 SOẠN THẢO TRỰC TIẾP */}
      <div className="iso-word-editor-body" style={{ flex: 1, minHeight: 0 }}>
        {/* Navigation Pane: Mục lục Headings thực tế của file */}
        {showNavPane && (
          <div className="iso-word-nav-pane">
            <div className="iso-word-nav-header">
              <span>MỤC LỤC TÀI LIỆU ({docHeadings.length})</span>
            </div>
            <div className="iso-word-nav-list">
              {docHeadings.length === 0 ? (
                <div style={{ padding: '24px 12px', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center', fontStyle: 'italic' }}>
                  Chưa có tiêu đề Heading nào trong tài liệu
                </div>
              ) : (
                docHeadings.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className={`iso-word-nav-item level-${h.level}`}
                    onClick={() => {
                      if (h.el) {
                        const ws = h.el.closest('.iso-word-workspace');
                        if (ws) {
                          const wsRect = ws.getBoundingClientRect();
                          const elRect = h.el.getBoundingClientRect();
                          const offset = elRect.top - wsRect.top + ws.scrollTop - 24;
                          ws.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                        } else {
                          h.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }
                    }}
                    title={h.title}
                  >
                    {h.title}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Khổ giấy A4 Soạn thảo trực tiếp (Word Canvas & Khối Lưu đồ nếu file có lưu đồ) */}
        <div className="iso-word-workspace">
          {loadingDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7B5233' }}>
              <RefreshCw className="iso-spinner" size={32} />
              <span style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>Đang nạp tài liệu Word...</span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '32px',
              width: '100%',
              paddingBottom: '48px'
            }}>
              {/* TRANG A4 SOẠN THẢO VĂN BẢN QUY TRÌNH (WORD A4) */}
              <div
                className="iso-word-a4-page"
                ref={wordEditorRef}
                contentEditable={isEditing ? "true" : "false"}
                suppressContentEditableWarning={true}
                onKeyUp={detectCurrentBlockStyle}
                onMouseUp={detectCurrentBlockStyle}
                onInput={() => {
                  setIsWordEditorDirty(true);
                  updateDocHeadings();
                }}
                style={{
                  fontFamily: wordEditorFont,
                  transform: `scale(${wordEditorZoom / 100})`,
                  transformOrigin: 'top center',
                  cursor: isEditing ? 'text' : 'default'
                }}
              />

            </div>
          )}
        </div>
      </div>

      {/* 3. STATUS BAR CHÂN TRANG */}
      <div className="iso-word-statusbar inline-statusbar">
        <div className="iso-word-status-left">
          <span>{isEditing ? (isWordEditorDirty ? '● Đang chỉnh sửa (Chưa lưu thay đổi)' : '● Chế độ chỉnh sửa') : '✓ Chế độ xem tài liệu'}</span>
          <span className="iso-word-status-sep">|</span>
          <span>Khổ A4 (210 x 297 mm)</span>
          {validSteps.length > 0 && (
            <>
              <span className="iso-word-status-sep">|</span>
              <span>Lưu đồ: <strong>{validSteps.length} bước</strong></span>
            </>
          )}
        </div>
        <div className="iso-word-status-right">
          <span>Thu phóng: {wordEditorZoom}%</span>
          <span className="iso-word-status-sep">|</span>
          <span>Soạn thảo trực tiếp trên SmartFlow</span>
        </div>
      </div>

      {/* 4. MODAL THIẾT KẾ & CHỈNH SỬA LƯU ĐỒ */}
      {showFlowchartModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '96vw',
            maxWidth: '1500px',
            height: '92vh',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #EADCC9'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GitBranch size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#1E293B' }}>
                    Thiết kế & Chỉnh sửa Lưu đồ: {formData.name || formData.code || 'Quy trình ISO'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Kéo thả các hình khối, nối đường luân chuyển hoặc cấu hình trực tiếp dạng bảng
                  </div>
                </div>
              </div>

              {/* View mode switcher */}
              <div style={{ display: 'flex', backgroundColor: '#E2E8F0', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('canvas')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeModalTab === 'canvas' ? '#FFFFFF' : 'transparent',
                    color: activeModalTab === 'canvas' ? '#7B5233' : '#475569',
                    boxShadow: activeModalTab === 'canvas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Layout size={14} />
                  <span>Canvas Vẽ Kéo Thả</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('table')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeModalTab === 'table' ? '#FFFFFF' : 'transparent',
                    color: activeModalTab === 'table' ? '#7B5233' : '#475569',
                    boxShadow: activeModalTab === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <TableIcon size={14} />
                  <span>Bảng Chi Tiết Bước</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('preview')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeModalTab === 'preview' ? '#FFFFFF' : 'transparent',
                    color: activeModalTab === 'preview' ? '#7B5233' : '#475569',
                    boxShadow: activeModalTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={14} />
                  <span>Xem Trước Bản In A4</span>
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (flowchartCanvasRef.current?.triggerAutoLayout) {
                      flowchartCanvasRef.current.triggerAutoLayout();
                    } else if (handleAutoLayoutClassic) {
                      handleAutoLayoutClassic();
                    }
                  }}
                  title="Tự động sắp xếp lại vị trí các khối trên Canvas"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <span>⚡ Tự động căn chỉnh</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (handleAddStep) {
                      handleAddStep();
                    }
                  }}
                  title="Thêm bước mới vào quy trình"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1px solid #7B5233',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>Thêm bước</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveFlowchartModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  <Save size={14} />
                  <span>Lưu & Cập nhật</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFlowchartModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  title="Đóng modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', backgroundColor: '#F8FAFC', position: 'relative' }}>
              {activeModalTab === 'canvas' && (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <FlowchartCanvas
                    steps={formData.steps || []}
                    onPositionsChange={handlePositionsChange}
                    onAddStep={handleAddStep}
                    onUpdateStep={handleUpdateStep}
                    onDeleteStep={handleRemoveStep}
                    onNodeSelect={handleNodeSelect}
                    selectedStepIdx={selectedStepIdx}
                    ref={flowchartCanvasRef}
                    height="100%"
                    style={{ height: '100%', border: 'none' }}
                  />
                </div>
              )}

              {activeModalTab === 'table' && (
                <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9', color: '#7B5233' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>STT</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', width: '150px' }}>Loại hình khối</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tên bước thực hiện</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', width: '160px' }}>Bộ phận / Trách nhiệm</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', width: '160px' }}>Biểu mẫu / Phụ lục</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Bước kế</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!formData.steps || formData.steps.length === 0) ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                              Chưa có bước nào trong quy trình. Nhấp "Thêm bước mới" bên dưới để bắt đầu.
                            </td>
                          </tr>
                        ) : (
                          formData.steps.map((step, idx) => (
                            <tr key={step.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#64748B' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <select
                                  value={step.node_type || 'task'}
                                  onChange={(e) => handleUpdateStep(idx, 'node_type', e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                                >
                                  <option value="task">▭ Bước Xử Lý</option>
                                  <option value="decision">◇ Quyết Định (Yes/No)</option>
                                  <option value="terminal">⬭ Bắt đầu / Kết thúc</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input
                                  type="text"
                                  value={step.name || ''}
                                  onChange={(e) => handleUpdateStep(idx, 'name', e.target.value)}
                                  placeholder="Nhập tên bước..."
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input
                                  type="text"
                                  value={step.assignee_role || ''}
                                  onChange={(e) => handleUpdateStep(idx, 'assignee_role', e.target.value)}
                                  placeholder="Ví dụ: QC, Tổ trưởng"
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input
                                  type="text"
                                  value={step.template_files || ''}
                                  onChange={(e) => handleUpdateStep(idx, 'template_files', e.target.value)}
                                  placeholder="BM-01, BM-02..."
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  value={step.transition?.next_step || ''}
                                  onChange={(e) => handleUpdateStep(idx, 'transition', {
                                    ...(step.transition || {}),
                                    next_step: e.target.value ? parseInt(e.target.value, 10) : null
                                  })}
                                  placeholder="STT"
                                  style={{ width: '60px', padding: '6px 4px', textAlign: 'center', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStep(idx)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#DC2626' }}
                                  title="Xóa bước này"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-start' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (handleAddStep) {
                            handleAddStep();
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: '#FAF6F0',
                          color: '#7B5233',
                          border: '1px dashed #7B5233',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={15} />
                        <span>Thêm bước mới</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'preview' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px', minHeight: '100%' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '40px 48px',
                    borderRadius: '4px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    width: '816px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
                      <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        LƯU ĐỒ QUY TRÌNH ISO
                      </h2>
                      <div style={{ fontSize: '11pt', marginTop: '4px' }}>
                        {formData.name || formData.code || 'Quy trình'}
                      </div>
                    </div>

                    {(!formData.steps || formData.steps.length === 0) ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                        Chưa có bước lưu đồ nào để hiển thị bản in.
                      </div>
                    ) : (
                      <FlowchartTable steps={formData.steps} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 20px',
              backgroundColor: '#FAF6F0',
              borderTop: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Tổng số bước: <strong>{validSteps.length}</strong> | Dữ liệu tự động đồng bộ sang văn bản A4
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowFlowchartModal(false)}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveFlowchartModal}
                  style={{
                    padding: '6px 20px',
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Lưu & Cập nhật vào văn bản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessContentTab;
