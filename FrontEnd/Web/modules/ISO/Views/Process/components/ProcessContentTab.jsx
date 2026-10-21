import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo, Redo, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, ChevronLeft, ChevronRight, Table as TableIcon,
  ZoomOut, ZoomIn, RotateCcw, BookOpen, Save, RefreshCw, X, FileText, Edit, Check,
  GitBranch, Plus, Trash2, Layout, Eye, Scissors, Search
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import '../../MasterRecord/isoMasterRecord.css';
import FlowchartTable, { generateFlowchartSvgHtml } from '../FlowchartTable';
import FlowchartCanvas from '../FlowchartCanvas';
import logoCty from '../utils/logoCty';
import CanvasISOEditor from './CanvasISOEditor';

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
    showFeedback,
    departmentsList = [],
    systemTemplates = []
  } = editor;

  // State cho Bảng Chi Tiết Bước (Step Details) & Danh mục Biểu mẫu / Phòng ban
  const [editorEngine, setEditorEngine] = useState('canvas'); // 'canvas' | 'classic'
  const [showStepDetails, setShowStepDetails] = useState(false);
  const [dbTemplates, setDbTemplates] = useState([]);
  const [formPickerStepIdx, setFormPickerStepIdx] = useState(null);
  const [formPickerSearch, setFormPickerSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    api.get('/iso-documents/form-templates')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted) setDbTemplates(list);
      })
      .catch(err => {
        console.warn("Could not load db templates:", err);
      });
    return () => { isMounted = false; };
  }, []);

  const availableRoles = useMemo(() => {
    const defaultRoles = [
      'QC', 'QLCL', 'Ban Quản trị Chất lượng (QLCL)', 'Bộ phận Kiểm tra CL',
      'Sản xuất', 'Tổ trưởng Sản xuất', 'Quản đốc Phân xưởng',
      'Kỹ thuật', 'Phòng Kỹ thuật',
      'Kinh doanh', 'Phòng Kinh doanh / Bán hàng',
      'Hành chính Nhân sự', 'Bộ phận Nhân sự', 'Ban BSCI',
      'Mua hàng', 'Phòng Cung ứng / Vật tư',
      'Kho', 'Thủ kho',
      'Ban Giám Đốc', 'Giám đốc Nhà máy'
    ];
    const deptNames = (departmentsList || []).map(d => typeof d === 'object' ? d.name : d).filter(Boolean);
    return Array.from(new Set([...defaultRoles, ...deptNames]));
  }, [departmentsList]);

  const formatTemplateDisplay = useCallback((f) => {
    if (!f) return '';
    const title = (f.title || f.name || '').trim();
    const code = (f.code || '').trim();
    if (title && code) {
      if (title.toLowerCase().includes(code.toLowerCase())) {
        return title;
      }
      return `${title} (${code})`;
    }
    return title || code;
  }, []);

  const checkIsFormSelected = useCallback((f, rawVal = '') => {
    if (!rawVal || !f) return false;
    const currentItems = rawVal.split(/[,;\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    const code = (f.code || '').trim().toLowerCase();
    const name = (f.name || f.title || '').trim().toLowerCase();
    const formatted = formatTemplateDisplay(f).toLowerCase();
    return currentItems.some(item => {
      return item === formatted || (code && item.includes(code)) || (name && item === name);
    });
  }, [formatTemplateDisplay]);

  const availableForms = useMemo(() => {
    const list = [];
    (formData.related_templates || []).forEach(t => {
      const code = (t.code || '').trim();
      const title = (t.title || t.name || '').trim();
      if (code || title) {
        list.push({
          code,
          name: title || code,
          title: title || code,
          source: 'current',
          file_name: t.file_name,
          file_path: t.file_path,
          storage_location: t.storage_location,
          retention_period: t.retention_period,
          id: t.id
        });
      }
    });
    return list;
  }, [formData.related_templates]);

  const filteredPickerForms = useMemo(() => {
    if (!formPickerSearch.trim()) return availableForms;
    const q = formPickerSearch.toLowerCase().trim();
    return availableForms.filter(f =>
      (f.code && f.code.toLowerCase().includes(q)) ||
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.file_name && f.file_name.toLowerCase().includes(q))
    );
  }, [availableForms, formPickerSearch]);

  const handleToggleFormForStep = (stepIdx, f) => {
    if (stepIdx === null || !formData.steps || !formData.steps[stepIdx]) return;
    const rawVal = formData.steps[stepIdx].template_files || '';
    const currentItems = rawVal.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const formatted = formatTemplateDisplay(f);
    const code = (f.code || '').trim().toLowerCase();

    let updated;
    const isSelected = checkIsFormSelected(f, rawVal);
    if (isSelected) {
      updated = currentItems.filter(item => {
        const itemLower = item.toLowerCase();
        if (itemLower === formatted.toLowerCase()) return false;
        if (code && itemLower.includes(code)) return false;
        return true;
      }).join(', ');
    } else {
      updated = [...currentItems, formatted].join(', ');
    }
    handleUpdateStep(stepIdx, 'template_files', updated);
  };

  const handleMoveStep = useCallback((fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= (formData.steps || []).length) return;
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const [moved] = nextSteps.splice(fromIdx, 1);
      nextSteps.splice(toIdx, 0, moved);
      const reindexed = nextSteps.map((s, i) => ({
        ...s,
        step_number: i + 1,
        flow_node_id: `node_${i + 1}`
      }));
      return { ...prev, steps: reindexed };
    });
  }, [formData.steps, setFormData]);

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
  const [totalSheetsCount, setTotalSheetsCount] = useState(3);
  const [wordUploading, setWordUploading] = useState(false);

  // Flowchart Modal & Navigation states
  const [showFlowchartModal, setShowFlowchartModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('canvas'); // 'canvas' | 'table' | 'preview'
  const wordEditorRef = useRef(null);
  const flowchartSectionRef = useRef(null);
  const targetSectionRef = useRef(null);
  const wordUploadInputRef = useRef(null);
  const hasLoadedDocRef = useRef(false);
  const loadedDocKeyRef = useRef('');

  const updateHeadingsTimerRef = useRef(null);

  // Helper tạo một tờ A4 chuẩn kích thước 794px x 1123px kèm Header & Footer
  const createNewA4Sheet = useCallback((pageNum, contentHtml = '<p><br></p>') => {
    const docCode = formData.code || formData.new_code || '';
    const issueDate = formData.issue_date || '';
    const version = formData.version || '';

    const sheet = document.createElement('div');
    sheet.className = 'iso-a4-sheet';
    sheet.setAttribute('data-page', String(pageNum));
    sheet.id = `iso-content-page-${pageNum}`;
    sheet.style.cssText = 'background:#FFFFFF; width:794px; height:1123px; max-height:1123px; padding:44px 50px 24px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; font-family:"Times New Roman", Times, serif;';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'iso-a4-sheet-content';
    contentDiv.style.cssText = 'flex: 1 1 auto; width: 100%; height: 1015px; max-height: 1015px; overflow: hidden; box-sizing: border-box; font-family:"Times New Roman", Times, serif;';
    contentDiv.innerHTML = contentHtml;

    const footerDiv = document.createElement('div');
    footerDiv.className = 'iso-a4-sheet-footer';
    footerDiv.style.cssText = 'height: 32px; min-height: 32px; border-top: 1px solid #000000; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-family: "Times New Roman", serif; font-size: 10pt; font-style: italic; color: #0D0D0D; user-select: none; box-sizing: border-box;';
    footerDiv.innerHTML = `
      <span>Mã hiệu: ${docCode}</span>
      <span>Ngày ban hành: ${issueDate}</span>
      <span>Lần ban hành: ${version}</span>
      <span class="iso-sheet-page-num">Trang ${pageNum}</span>
    `;

    sheet.appendChild(contentDiv);
    sheet.appendChild(footerDiv);
    return sheet;
  }, [formData.new_code, formData.code, formData.issue_date, formData.version]);

  // Đánh lại số trang và đồng bộ mã hiệu cho tất cả các tờ A4 trong tài liệu
  const reindexAllSheetFooters = useCallback(() => {
    if (!wordEditorRef.current) return;

    // 1. Kiểm tra và bọc bất kỳ khối nào nằm trực tiếp ngoài tờ A4 (như khối lưu đồ bị lạc)
    const directChildren = Array.from(wordEditorRef.current.children);
    directChildren.forEach((child) => {
      if (!child.classList?.contains('iso-a4-sheet')) {
        if (
          child.classList?.contains('iso-flowchart-block-container') ||
          child.id === 'iso-flowchart-block-container' ||
          child.querySelector?.('svg, table')
        ) {
          const wrapperSheet = createNewA4Sheet(3, '');
          const wrapperContent = wrapperSheet.querySelector('.iso-a4-sheet-content');
          child.replaceWith(wrapperSheet);
          wrapperContent.appendChild(child);
        }
      }
    });

    // 2. Tự động dọn dẹp các trang trắng không có nội dung ở giữa tài liệu (từ trang 3 trở đi)
    const allSheets = Array.from(wordEditorRef.current.querySelectorAll('.iso-a4-sheet'));
    if (allSheets.length > 3) {
      allSheets.forEach((sheet, idx) => {
        if (idx >= 2) {
          const content = sheet.querySelector('.iso-a4-sheet-content');
          if (content) {
            const text = (content.innerText || '').replace(/[\s\u00a0]+/g, ' ').trim();
            const hasMedia = content.querySelector('table, img, svg, canvas, iframe');
            if (text.length === 0 && !hasMedia) {
              sheet.remove();
            }
          }
        }
      });
    }

    const sheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
    setTotalSheetsCount(sheets.length || 3);
    const docCode = formData.code || formData.new_code || '';
    const issueDate = formData.issue_date || '';
    const version = formData.version || '';

    sheets.forEach((sheet, idx) => {
      const pageNum = idx + 1;
      sheet.setAttribute('data-page', String(pageNum));
      if (!sheet.id || sheet.id.startsWith('iso-content-page-')) {
        sheet.id = `iso-content-page-${pageNum}`;
      }
      sheet.style.minHeight = '1123px';
      sheet.style.backgroundColor = '#FFFFFF';
      sheet.style.boxShadow = '0 4px 20px rgba(0,0,0,0.22)';
      sheet.style.display = 'flex';
      sheet.style.flexDirection = 'column';
      sheet.style.justifyContent = 'space-between';
      sheet.style.boxSizing = 'border-box';

      let footer = sheet.querySelector('.iso-a4-sheet-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'iso-a4-sheet-footer';
        footer.style.cssText = 'height: 32px; min-height: 32px; border-top: 1px solid #000000; padding-top: 6px; margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-family: "Times New Roman", serif; font-size: 10pt; font-style: italic; color: #0D0D0D; user-select: none; box-sizing: border-box;';
        sheet.appendChild(footer);
      } else if (footer.parentElement !== sheet) {
        sheet.appendChild(footer);
      }
      footer.innerHTML = `
        <span>Mã hiệu: ${docCode}</span>
        <span>Ngày ban hành: ${issueDate}</span>
        <span>Lần ban hành: ${version}</span>
        <span class="iso-sheet-page-num">Trang ${pageNum}</span>
      `;
    });
  }, [formData.code, formData.new_code, formData.issue_date, formData.version, createNewA4Sheet]);

  // Helper chia nhỏ phần nội dung chính (bodyHtml) thành các trang A4 độc lập chuẩn 1123px
  const buildSheetsFromBodyHtml = useCallback((bodyHtml, startPageNum = 3) => {
    const docCode = formData.code || formData.new_code || '';
    const issueDate = formData.issue_date || '';
    const version = formData.version || '';

    if (!bodyHtml || !bodyHtml.trim()) {
      return `
        <div class="iso-a4-sheet" data-page="${startPageNum}" id="iso-content-page-${startPageNum}" style="background:#FFFFFF; width:794px; min-height:1123px; height:auto; padding:44px 50px 24px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative; font-family:'Times New Roman', Times, serif;">
          <div class="iso-a4-sheet-content" style="flex:1 1 auto; width:100%; min-height:1015px; height:auto; box-sizing:border-box; font-family:'Times New Roman', Times, serif;">
            <p><br></p>
          </div>
          <div class="iso-a4-sheet-footer" style="height:32px; min-height:32px; border-top:1px solid #000000; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-family:'Times New Roman', serif; font-size:10pt; font-style:italic; color:#0D0D0D; user-select:none; box-sizing:border-box;">
            <span>Mã hiệu: ${docCode}</span>
            <span>Ngày ban hành: ${issueDate}</span>
            <span>Lần ban hành: ${version}</span>
            <span class="iso-sheet-page-num">Trang ${startPageNum}</span>
          </div>
        </div>
      `;
    }

    // Nếu đã là các tờ A4 độc lập, kiểm tra và bảo đảm toàn vẹn cấu trúc tờ A4 và footer
    if (bodyHtml.includes('iso-a4-sheet')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body><div id="__body_sheets_wrapper">${bodyHtml}</div></body>`, 'text/html');
        const wrapper = doc.getElementById('__body_sheets_wrapper');
        if (wrapper) {
          // 1. Bọc bất kỳ khối lưu đồ nào nằm ngoài .iso-a4-sheet
          const orphanFcs = Array.from(wrapper.children).filter(el =>
            !el.classList?.contains('iso-a4-sheet') &&
            (el.classList?.contains('iso-flowchart-block-container') || el.id === 'iso-flowchart-block-container' || el.querySelector?.('svg, table'))
          );
          orphanFcs.forEach((fc, oIdx) => {
            const pageNum = startPageNum + oIdx;
            const newSheetHtml = `
              <div class="iso-a4-sheet" data-page="${pageNum}" id="iso-content-page-${pageNum}" style="background:#FFFFFF; width:794px; min-height:1123px; height:auto; padding:44px 50px 24px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative; font-family:'Times New Roman', Times, serif;">
                <div class="iso-a4-sheet-content" style="flex:1 1 auto; width:100%; min-height:1015px; height:auto; box-sizing:border-box; font-family:'Times New Roman', Times, serif;">
                  ${fc.outerHTML}
                </div>
                <div class="iso-a4-sheet-footer" style="height:32px; min-height:32px; border-top:1px solid #000000; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-family:'Times New Roman', serif; font-size:10pt; font-style:italic; color:#0D0D0D; user-select:none; box-sizing:border-box;">
                  <span>Mã hiệu: ${docCode}</span>
                  <span>Ngày ban hành: ${issueDate}</span>
                  <span>Lần ban hành: ${version}</span>
                  <span class="iso-sheet-page-num">Trang ${pageNum}</span>
                </div>
              </div>
            `;
            fc.outerHTML = newSheetHtml;
          });

          // 1b. NẾU LƯU ĐỒ NGẮN (<= 6 BƯỚC): HỢP NHẤT MỤC 5.2 LÊN CÙNG SHEET VỚI LƯU ĐỒ NẾU ĐANG BỊ TÁCH SANG SHEET SAU (NHƯ ẢNH 2)
          const allSheetsList = Array.from(wrapper.querySelectorAll('.iso-a4-sheet'));
          const fcSheet = allSheetsList.find(s => s.querySelector('.iso-flowchart-block-container, #iso-flowchart-block-container'));
          const stepCount = (formData.steps && formData.steps.length) || 5;
          if (fcSheet && stepCount <= 6) {
            const nextSheet = fcSheet.nextElementSibling;
            if (nextSheet && nextSheet.classList?.contains('iso-a4-sheet')) {
              const sec52El = nextSheet.querySelector('#iso-detailed-steps-block-container, .iso-detailed-steps-block-container');
              if (sec52El) {
                const fcEl = fcSheet.querySelector('.iso-flowchart-block-container, #iso-flowchart-block-container');
                if (fcEl) {
                  fcEl.insertAdjacentElement('afterend', sec52El);
                  const nextContent = nextSheet.querySelector('.iso-a4-sheet-content');
                  const remainingText = (nextContent?.innerText || '').replace(/[\s\u00a0]+/g, ' ').trim();
                  const hasMedia = nextContent?.querySelector('table, svg, img');
                  if (remainingText.length < 50 && !hasMedia) {
                    nextSheet.remove();
                  }
                }
              }
            }
          }

          // 2. Bảo đảm mọi .iso-a4-sheet có footer và min-height 1123px
          const sheets = wrapper.querySelectorAll('.iso-a4-sheet');
          sheets.forEach((sheet, sIdx) => {
            sheet.style.minHeight = '1123px';
            sheet.style.backgroundColor = '#FFFFFF';
            sheet.style.boxShadow = '0 4px 20px rgba(0,0,0,0.22)';
            sheet.style.display = 'flex';
            sheet.style.flexDirection = 'column';
            sheet.style.justifyContent = 'space-between';
            sheet.style.boxSizing = 'border-box';
            const pageNum = startPageNum + sIdx;
            sheet.setAttribute('data-page', String(pageNum));
            sheet.id = `iso-content-page-${pageNum}`;
            let footer = sheet.querySelector('.iso-a4-sheet-footer');
            if (!footer) {
              const footerEl = doc.createElement('div');
              footerEl.className = 'iso-a4-sheet-footer';
              footerEl.style.cssText = 'height:32px; min-height:32px; border-top:1px solid #000000; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-family:"Times New Roman", serif; font-size:10pt; font-style:italic; color:#0D0D0D; user-select:none; box-sizing:border-box;';
              footerEl.innerHTML = `
                <span>Mã hiệu: ${docCode}</span>
                <span>Ngày ban hành: ${issueDate}</span>
                <span>Lần ban hành: ${version}</span>
                <span class="iso-sheet-page-num">Trang ${pageNum}</span>
              `;
              sheet.appendChild(footerEl);
            } else if (footer.parentElement !== sheet) {
              sheet.appendChild(footer);
            }
          });

          return wrapper.innerHTML;
        }
      } catch (_) {}
      return bodyHtml;
    }

    const isChunkNotEmpty = (c) => {
      if (!c) return false;
      const stripped = c.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim();
      return stripped.length > 0 || c.includes('<table') || c.includes('<img') || c.includes('<svg') || c.includes('<canvas');
    };

    const sanitizeAndBalanceChunk = (htmlStr) => {
      if (!htmlStr || !htmlStr.trim()) return '<p><br></p>';
      const clean = htmlStr.replace(/^(?:\s*<\/div>\s*)+/i, '').trim();
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body><div id="__a4_content_wrapper">${clean}</div></body>`, 'text/html');
        const wrapper = doc.getElementById('__a4_content_wrapper');
        if (wrapper && wrapper.innerHTML.trim().length > 0) {
          return wrapper.innerHTML;
        }
        return doc.body.innerHTML || clean;
      } catch (_) {
        return clean;
      }
    };

    // 0. Phân trang đặc biệt cho quy trình chuẩn ISO có Bảng lưu đồ dài và Diễn giải chi tiết (như QT16 / QT15 / QT12):
    //    Khớp 100% với tài liệu gốc (Ảnh 1):
    //    - Trang 3: Mục 1 -> 4 + Tiêu đề Mục 5.1 + Hàng 1, 2 của Bảng lưu đồ
    //    - Trang 4: Hàng 3..hết của Bảng lưu đồ + Tiêu đề 5.2 + Diễn giải Bước 1, 2, 3
    //    - Trang 5: Diễn giải Bước 4, 5, 6, 7 + Mục 6 Danh mục biểu mẫu & Bảng biểu mẫu
    const tableMatch = bodyHtml.match(/(<table[\s\S]*?<\/table>)/i);
    const isFcTable = tableMatch && /(?:lưu\s*đồ|sơ\s*đồ|quy\s*trình|trách\s*nhiệm)/i.test(tableMatch[1]);
    const hasLongFcTable = isFcTable && (tableMatch[1].match(/<tr/gi) || []).length >= 7;
    const hasDetailedSteps = /Bước\s*4\s*[\:\.\-]/i.test(bodyHtml);

    if (hasLongFcTable && hasDetailedSteps) {
      const tableFull = tableMatch[1];
      const beforeTable = bodyHtml.substring(0, tableMatch.index);
      const afterTable = bodyHtml.substring(tableMatch.index + tableFull.length);

      const rows = tableFull.match(/<tr[\s\S]*?<\/tr>/gi) || [];
      if (rows.length >= 7) {
        const headerRow = rows[0];
        const editButtonHtml = `
          <div style="display:inline-block; margin-left:12px;">
            <button
              type="button"
              onclick="window.__openIsoFlowchartModal && window.__openIsoFlowchartModal()"
              style="background:#FAF6F0; color:#7B5233; border:1px solid #7B5233; border-radius:4px; padding:2px 8px; font-size:8.5pt; font-weight:bold; cursor:pointer;"
            >
              ✏️ Chỉnh sửa lưu đồ (${rows.length - 1} bước)
            </button>
          </div>
        `;
        let p3Head = beforeTable;
        if (!p3Head.includes('✏️ Chỉnh sửa lưu đồ')) {
          p3Head = p3Head.replace(/(5\.1[^\n<]*<\/h[1-4]>|5\.1[^\n<]*<\/p>)/i, `$1${editButtonHtml}`);
        }

        const tableP3 = `<table class="iso-flowchart-table" style="width:100%; border-collapse:collapse; margin-top:8px; border:1px solid #000000; font-family:'Times New Roman', serif;"><tbody>${headerRow}${rows[1]}${rows[2]}</tbody></table>`;
        const tableP4 = `<table class="iso-flowchart-table" style="width:100%; border-collapse:collapse; margin-bottom:12px; border:1px solid #000000; font-family:'Times New Roman', serif;"><tbody>${headerRow}${rows.slice(3).join('')}</tbody></table>`;

        const mB4 = afterTable.match(/(<(?:h[1-6]|p|div)[^>]*>\s*(?:<[^>]+>\s*)*Bước\s*4\s*[\:\.\-][\s\S]*)$/i);
        let sec52P4 = afterTable;
        let sec52P5 = '';
        if (mB4) {
          sec52P4 = afterTable.substring(0, mB4.index);
          sec52P5 = mB4[1];
        }

        const page3 = (p3Head + tableP3).trim();
        const page4 = (tableP4 + sec52P4).trim();
        const page5 = sec52P5.trim();
        const chunks = [page3, page4, page5].filter(isChunkNotEmpty);
        if (chunks.length >= 2) {
          return chunks.map((chunkHtml, idx) => {
            const pNum = startPageNum + idx;
            const safeContent = sanitizeAndBalanceChunk(chunkHtml);
            return `
              <div class="iso-a4-sheet" data-page="${pNum}" id="iso-content-page-${pNum}" style="background:#FFFFFF; width:794px; min-height:1123px; height:auto; padding:44px 50px 24px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative; font-family:'Times New Roman', Times, serif;">
                <div class="iso-a4-sheet-content" style="flex:1 1 auto; width:100%; min-height:1015px; height:auto; box-sizing:border-box; font-family:'Times New Roman', Times, serif;">
                  ${safeContent}
                </div>
                <div class="iso-a4-sheet-footer" style="height:32px; min-height:32px; border-top:1px solid #000000; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-family:'Times New Roman', serif; font-size:10pt; font-style:italic; color:#0D0D0D; user-select:none; box-sizing:border-box;">
                  <span>Mã hiệu: ${docCode}</span>
                  <span>Ngày ban hành: ${issueDate}</span>
                  <span>Lần ban hành: ${version}</span>
                  <span class="iso-sheet-page-num">Trang ${pNum}</span>
                </div>
              </div>
            `;
          }).join('\n');
        }
      }
    }

    // 1. Phân tách theo ngắt trang vật lý nếu có
    const rawPages = bodyHtml.split(/<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>|<hr class="page-break"[^>]*>/i);
    let pageChunks = rawPages.filter(isChunkNotEmpty);
    if (pageChunks.length === 0) {
      pageChunks = [bodyHtml];
    }

    // Hợp nhất nếu trang Lưu đồ ngắn (<= 6 bước) bị ngắt trang vật lý tách rời khỏi Mục 5.2 (như Ảnh 2)
    const mergedRawPages = [];
    let pIdx = 0;
    while (pIdx < pageChunks.length) {
      const curP = pageChunks[pIdx];
      if (pIdx + 1 < pageChunks.length) {
        const nextP = pageChunks[pIdx + 1];
        const isCurFc = curP.includes('iso-flowchart-block-container') || (/5[\.\s]*1/i.test(curP) && (curP.includes('<table') || curP.includes('<svg')));
        const isNext52 = /5[\.\s]*2|diễn giải chi tiết/i.test(nextP);
        const stepMatch = curP.match(/data-step-count="(\d+)"/);
        const stepCount = stepMatch ? parseInt(stepMatch[1], 10) : (formData.steps?.length || 5);
        const curPText = curP.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim();
        if (isCurFc && isNext52 && stepCount <= 6 && curPText.length < 2500) {
          mergedRawPages.push(curP + '\n' + nextP);
          pIdx += 2;
          continue;
        }
      }
      mergedRawPages.push(curP);
      pIdx++;
    }
    pageChunks = mergedRawPages;

    // 2. Tách các phân hệ/mục lớn của quy trình ISO ra các trang độc lập:
    //    - Mục 5. Nội dung quy trình (bao gồm cả Lưu đồ 5.1 và Diễn giải chi tiết 5.2)
    //    - LƯU Ý QUAN TRỌNG: KHÔNG tách rời Mục 5.2 sang trang riêng nếu Lưu đồ ngắn (<= 6 bước như ở Ảnh 2),
    //      Mục 5.2 sẽ tiếp tục đi liền ngay dưới Lưu đồ trên cùng 1 trang A4.
    //    - Mục 6 Biểu mẫu và hồ sơ lưu trữ bắt đầu ở trang mới
    //    - Mục 7 Phụ lục bắt đầu ở trang mới
    const secSplitRegex = /(?=<div class="iso-flowchart-block-container"|<h[1-4][^>]*>\s*(?:5\s*\.(?!\d)|5\s+Nội dung)|<div class="iso-doc-forms-container"|<h[1-4][^>]*>\s*(?:6\s*\.(?!\d)|6\s+|Danh mục biểu mẫu|Biểu mẫu và hồ sơ)|<p[^>]*>\s*(?:<[^>]+>\s*)*(?:6\s*\.(?!\d)|6\s+|Danh mục biểu mẫu|Biểu mẫu và hồ sơ)|<h[1-4][^>]*>\s*(?:7\s*\.(?!\d)|7\s+|Phụ lục)|<p[^>]*>\s*(?:<[^>]+>\s*)*(?:7\s*\.(?!\d)|7\s+|Phụ lục))/i;

    const structuredChunks = [];
    pageChunks.forEach(chunk => {
      const subParts = chunk.split(secSplitRegex).filter(isChunkNotEmpty);
      if (subParts.length <= 1) {
        structuredChunks.push(chunk);
        return;
      }

      // Hợp nhất tiêu đề "5. Nội dung quy trình" đứng trước khối Lưu đồ 5.1 lên cùng trang Lưu đồ
      let i = 0;
      while (i < subParts.length) {
        const cur = subParts[i];
        const curText = cur.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim().toLowerCase();

        // 1. Hợp nhất tiêu đề "5. Nội dung quy trình" đứng trước khối Lưu đồ 5.1 lên cùng trang Lưu đồ
        if (i + 1 < subParts.length && curText.length < 160) {
          const nextPart = subParts[i + 1];
          if ((curText.startsWith('5.') || curText.includes('nội dung quy trình')) && (nextPart.includes('iso-flowchart-block-container') || /5[\.\s]*1/i.test(nextPart))) {
            structuredChunks.push(cur + '\n' + nextPart);
            i += 2;
            continue;
          }
        }

        // 2. Hợp nhất thẻ mở container nếu bị tách khỏi nội dung bên trong
        if (i + 1 < subParts.length) {
          const nextPart = subParts[i + 1];
          if (
            (cur.includes('class="iso-detailed-steps-block-container"') && !cur.includes('</div>')) ||
            (cur.includes('class="iso-doc-forms-container"') && !cur.includes('</div>')) ||
            (cur.includes('class="iso-flowchart-block-container"') && !cur.includes('</div>'))
          ) {
            structuredChunks.push(cur + '\n' + nextPart);
            i += 2;
            continue;
          }
        }

        structuredChunks.push(cur);
        i++;
      }
    });

    // 3. Với các đoạn quá dài (như Mục 5.2 Diễn giải chi tiết nhiều bước), chỉ ngắt trang tối đa 2 phần ở Bước 4 nếu độ dài > 3500
    const finalChunks = [];
    structuredChunks.forEach(p => {
      const isShortFcMerged = p.includes('iso-flowchart-block-container') && (formData.steps?.length || 5) <= 6;
      if (!isShortFcMerged && p.length > 3500 && (p.includes('iso-detailed-steps') || /Bước\s*[12]:/i.test(p))) {
        const stepSplitRegex = /(?=<p[^>]*>\s*(?:<[^>]+>\s*)*Bước\s*4\s*:|<div[^>]*>\s*<p[^>]*>\s*Bước\s*4\s*:)/i;
        const stepParts = p.split(stepSplitRegex).filter(isChunkNotEmpty);
        if (stepParts.length > 1) {
          finalChunks.push(...stepParts);
          return;
        }
      }
      finalChunks.push(p);
    });

    pageChunks = finalChunks.filter(isChunkNotEmpty);
    if (pageChunks.length === 0) {
      pageChunks = ['<p><br></p>'];
    }

    return pageChunks.map((chunkHtml, idx) => {
      const pNum = startPageNum + idx;
      const safeContent = sanitizeAndBalanceChunk(chunkHtml);
      return `
        <div class="iso-a4-sheet" data-page="${pNum}" id="iso-content-page-${pNum}" style="background:#FFFFFF; width:794px; min-height:1123px; height:auto; padding:44px 50px 24px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative; font-family:'Times New Roman', Times, serif;">
          <div class="iso-a4-sheet-content" style="flex:1 1 auto; width:100%; min-height:1015px; height:auto; box-sizing:border-box; font-family:'Times New Roman', Times, serif;">
            ${safeContent}
          </div>
          <div class="iso-a4-sheet-footer" style="height:32px; min-height:32px; border-top:1px solid #000000; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; font-family:'Times New Roman', serif; font-size:10pt; font-style:italic; color:#0D0D0D; user-select:none; box-sizing:border-box;">
            <span>Mã hiệu: ${docCode}</span>
            <span>Ngày ban hành: ${issueDate}</span>
            <span>Lần ban hành: ${version}</span>
            <span class="iso-sheet-page-num">Trang ${pNum}</span>
          </div>
        </div>
      `;
    }).join('\n');
  }, [formData.new_code, formData.code, formData.issue_date, formData.version, formData.steps]);

  const setCursorToNodeStart = (el) => {
    if (!el) return;
    try {
      el.focus();
      const firstTarget = el.firstElementChild || el;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(firstTarget);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  };

  const setCursorToEnd = (el) => {
    if (!el) return;
    try {
      el.focus();
      const lastTarget = el.lastElementChild || el;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(lastTarget);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  };

  // Ngắt trang tại vị trí con trỏ (Ctrl + Enter)
  const handleInsertPageBreak = () => {
    if (!wordEditorRef.current) return;
    const sel = window.getSelection();
    let currentSheet = null;

    if (sel && sel.rangeCount) {
      const node = sel.getRangeAt(0).startContainer;
      currentSheet = node?.nodeType === Node.ELEMENT_NODE ? node.closest('.iso-a4-sheet') : node?.parentElement?.closest('.iso-a4-sheet');
    }

    if (!currentSheet) {
      const allSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
      currentSheet = allSheets[allSheets.length - 1];
    }

    if (currentSheet) {
      const allSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
      let afterContentHtml = '<p><br></p>';

      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const contentEl = currentSheet.querySelector('.iso-a4-sheet-content');
        if (contentEl && contentEl.contains(range.startContainer)) {
          try {
            const endRange = document.createRange();
            endRange.setStart(range.startContainer, range.startOffset);
            endRange.setEnd(contentEl, contentEl.childNodes.length);
            const frag = endRange.extractContents();
            const divTemp = document.createElement('div');
            divTemp.appendChild(frag);
            if (divTemp.innerHTML.trim()) {
              afterContentHtml = divTemp.innerHTML;
            }
          } catch (_) {}
        }
      }

      const nextPg = allSheets.length + 1;
      const newSheet = createNewA4Sheet(nextPg, afterContentHtml);
      currentSheet.after(newSheet);
      reindexAllSheetFooters();

      const newContent = newSheet.querySelector('.iso-a4-sheet-content');
      if (newContent) {
        setCursorToNodeStart(newContent);
        newSheet.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setIsWordEditorDirty(true);
      setTimeout(updateDocHeadings, 150);
    }
  };

  // Thêm một trang A4 trắng mới vào cuối tài liệu
  const handleAppendNewA4Page = () => {
    if (!wordEditorRef.current) return;
    const allSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
    const nextPg = allSheets.length + 1;
    const newSheet = createNewA4Sheet(nextPg, '<p><br></p>');
    wordEditorRef.current.appendChild(newSheet);
    reindexAllSheetFooters();

    const nextContent = newSheet.querySelector('.iso-a4-sheet-content');
    if (nextContent) {
      setCursorToNodeStart(nextContent);
      newSheet.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setIsWordEditorDirty(true);
    setTimeout(updateDocHeadings, 150);
  };

  // Xử lý nạp nội dung từ file Word: Giữ nguyên 2 trang đầu + gán toàn bộ nội dung file Word vào từ trang 3
  const handleWordUploadLocal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      if (showFeedback) showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      else alert('Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      if (e.target) e.target.value = '';
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      if (showFeedback) showFeedback('error', 'Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      else alert('Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      if (e.target) e.target.value = '';
      return;
    }

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    setWordUploading(true);
    if (showFeedback) showFeedback('info', 'Đang đọc và phân tích nội dung từ file Word...');

    try {
      const parsedData = await api.post('/iso-documents/upload', formDataPay, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 1. Giữ nguyên 2 trang đầu hiện tại (Trang bìa & Bảng theo dõi sửa đổi)
      let page1And2Html = '';
      if (wordEditorRef.current) {
        const currentSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
        if (currentSheets.length >= 2) {
          page1And2Html = currentSheets[0].outerHTML + '\n' + currentSheets[1].outerHTML;
        }
      }
      if (!page1And2Html) {
        page1And2Html = await fetchOriginal2Pages();
      }

      // 2. Lấy nội dung từ file Word được chọn (parsedData.html_content)
      let bodyHtml = parsedData?.html_content || '';

      // Tách bỏ trang bìa và bảng theo dõi sửa đổi của file Word để giữ nguyên 2 trang đầu chuẩn
      const heading1Pos = bodyHtml.search(/(?:<h[1-4][^>]*>|<p[^>]*>\s*(?:<[^>]+>\s*)*)\s*(?:1\s*[\.\:\-]|Mục đích)/i);
      if (heading1Pos > 0) {
        bodyHtml = bodyHtml.substring(heading1Pos);
      } else if (bodyHtml.includes('iso-heading-cover-page') || bodyHtml.includes('iso-doc-cover-section') || /THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU/i.test(bodyHtml)) {
        const afterRevMatch = bodyHtml.match(/THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU[\s\S]*?<\/table>[\s\S]*?(?:<\/div>)*\s*(?:<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>)?([\s\S]*)$/i);
        if (afterRevMatch && afterRevMatch[1] && afterRevMatch[1].replace(/<[^>]*>/g, '').trim().length > 10) {
          bodyHtml = afterRevMatch[1];
        }
      }
      // Dọn sạch mọi thẻ đóng thừa </div> và ngắt trang thừa ở đầu bodyHtml tránh làm vỡ cấu trúc DOM
      bodyHtml = bodyHtml.replace(/^(?:\s*<\/div>\s*)+/i, '').replace(/^(?:\s*<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>\s*)+/i, '').trim();

      // Fallback nếu không có html_content: bóc tách từ sections
      if (!bodyHtml.trim() && parsedData?.sections) {
        const secEntries = Object.entries(parsedData.sections).filter(([k, v]) => !k.startsWith('__') && v);
        if (secEntries.length > 0) {
          bodyHtml = secEntries.map(([k, v], idx) => `
            <h2 id="heading-sec-${idx + 1}" class="iso-doc-heading level-1" style="margin: 24px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px;">
              ${k}
            </h2>
            <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px;">
              ${v}
            </div>
          `).join('\n');
        }
      }

      // 3. Bóc tách và chuẩn hóa danh sách các bước quy trình từ file Word
      const stepsMapped = (parsedData?.steps || []).map(step => ({
        ...step,
        node_type: step.transition?.node_type || step.node_type || 'task',
        has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
        fail_path: step.transition?.fail_path || step.fail_path || [],
        image_url: step.transition?.image_url || ''
      }));

      // Tự động nâng cấp bảng lưu đồ 5.1 từ file Word sang chuẩn SVG Flowchart 4 cột có nút Chỉnh sửa
      if (stepsMapped.length > 0) {
        bodyHtml = replaceFlowchartInHtml(bodyHtml, stepsMapped);
      }
      bodyHtml = replaceRelatedFormsInHtml(bodyHtml);

      // 4. Phân trang nội dung file chọn vào các trang A4 từ trang 3 trở đi
      const bodySheets = buildSheetsFromBodyHtml(bodyHtml, 3);
      const combinedHtml = `${page1And2Html}\n${bodySheets}`;

      // 5. Gán trực tiếp vào bộ soạn thảo
      if (wordEditorRef.current) {
        wordEditorRef.current.innerHTML = combinedHtml;
        reindexAllSheetFooters();
        setIsWordEditorDirty(true);
        hasLoadedDocRef.current = true;
        loadedDocKeyRef.current = `${formData.id || ''}_${parsedData.file_path || formData.file_path || ''}_${formData.docx_path || ''}_${formData.code || ''}`;
        setTimeout(updateDocHeadings, 150);
      }

      // 6. Cập nhật vào state form cha
      if (setFormData) {
        setFormData(prev => ({
          ...prev,
          file_path: parsedData.file_path || prev.file_path,
          name: (parsedData.name && !parsedData.name.includes('[Tên quy trình]') && parsedData.name.trim() !== 'Tên quy trình') ? parsedData.name : prev.name,
          steps: stepsMapped.length > 0 ? stepsMapped : prev.steps,
          sections: {
            ...(prev.sections || {}),
            ...(parsedData.sections || {}),
            '__full_html__': combinedHtml
          }
        }));
      }

      if (showFeedback) {
        showFeedback('success', 'Đã cập nhật nội dung từ file Word thành công! 2 trang đầu (Trang bìa & Theo dõi sửa đổi) được giữ nguyên, toàn bộ nội dung từ file Word đã được gán vào từ trang 3.');
      } else {
        alert('Đã cập nhật nội dung từ file Word thành công! 2 trang đầu (Trang bìa & Theo dõi sửa đổi) được giữ nguyên, toàn bộ nội dung từ file Word đã được gán vào từ trang 3.');
      }
    } catch (err) {
      console.error('Lỗi khi nạp file Word:', err);
      const errMsg = err?.response?.data?.detail || err.message || 'Lỗi khi upload tệp Word';
      if (showFeedback) showFeedback('error', 'Không thể cập nhật từ file Word: ' + errMsg);
      else alert('Không thể cập nhật từ file Word: ' + errMsg);
    } finally {
      setWordUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Xử lý sự kiện bàn phím khi soạn thảo: Enter tự động qua trang, Ctrl+Enter ngắt trang, Backspace xóa trang
  const handleEditorKeyDown = (e) => {
    // 1. Phím tắt Ctrl + Enter (hoặc Cmd + Enter): NGẮT TRANG (PAGE BREAK)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleInsertPageBreak();
      return;
    }

    // 2. Phím Enter thông thường
    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const targetNode = range.startContainer;
      const currentSheet = targetNode?.nodeType === Node.ELEMENT_NODE 
        ? targetNode.closest('.iso-a4-sheet') 
        : targetNode?.parentElement?.closest('.iso-a4-sheet');

      if (currentSheet) {
        const contentEl = currentSheet.querySelector('.iso-a4-sheet-content');
        if (contentEl) {
          let isAtBottom = false;
          try {
            const rect = range.getBoundingClientRect();
            const contentRect = contentEl.getBoundingClientRect();
            if ((rect.bottom > 0 && contentRect.bottom > 0 && (contentRect.bottom - rect.bottom) < 55) || contentEl.scrollHeight >= 980) {
              isAtBottom = true;
            }
          } catch (_) {
            if (contentEl.scrollHeight >= 980) isAtBottom = true;
          }

          if (isAtBottom) {
            e.preventDefault();
            let nextSheet = currentSheet.nextElementSibling;
            while (nextSheet && !nextSheet.classList.contains('iso-a4-sheet')) {
              nextSheet = nextSheet.nextElementSibling;
            }

            if (!nextSheet) {
              const allSheets = wordEditorRef.current?.querySelectorAll('.iso-a4-sheet') || [];
              const nextPg = allSheets.length + 1;
              nextSheet = createNewA4Sheet(nextPg, '<p><br></p>');
              currentSheet.after(nextSheet);
              reindexAllSheetFooters();
            }

            const nextContent = nextSheet.querySelector('.iso-a4-sheet-content');
            if (nextContent) {
              setCursorToNodeStart(nextContent);
              nextSheet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            setIsWordEditorDirty(true);
            setTimeout(updateDocHeadings, 150);
            return;
          }
        }
      }
    }

    // 3. Phím Backspace: Khi ở đầu trang trống (Page > 2) -> Xóa trang hiện tại và quay về trang trước
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (range.startOffset === 0) {
        const targetNode = range.startContainer;
        const currentSheet = targetNode?.nodeType === Node.ELEMENT_NODE 
          ? targetNode.closest('.iso-a4-sheet') 
          : targetNode?.parentElement?.closest('.iso-a4-sheet');

        if (currentSheet) {
          const pageNum = parseInt(currentSheet.getAttribute('data-page') || '0', 10);
          if (pageNum > 2) {
            const contentEl = currentSheet.querySelector('.iso-a4-sheet-content');
            const textContent = contentEl?.innerText?.trim() || '';
            if (textContent === '' || textContent === '\n') {
              let prevSheet = currentSheet.previousElementSibling;
              while (prevSheet && !prevSheet.classList.contains('iso-a4-sheet')) {
                prevSheet = prevSheet.previousElementSibling;
              }
              if (prevSheet) {
                e.preventDefault();
                currentSheet.remove();
                reindexAllSheetFooters();
                const prevContent = prevSheet.querySelector('.iso-a4-sheet-content');
                if (prevContent) {
                  setCursorToEnd(prevContent);
                  prevSheet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                setIsWordEditorDirty(true);
                setTimeout(updateDocHeadings, 150);
                return;
              }
            }
          }
        }
      }
    }
  };

  // Quét danh sách các tiêu đề (Heading) và các mục thực tế đang có trên trang soạn thảo (đồng bộ tự động thời gian thực)
  const updateDocHeadings = useCallback(() => {
    if (!wordEditorRef?.current) return;

    const list = [];
    const seenEls = new Set();

    // 1. Luôn thêm Trang bìa nếu có
    const coverEl = wordEditorRef.current.querySelector('#iso-heading-cover-page');
    if (coverEl) {
      list.push({ id: 'iso-heading-cover-page', title: 'Trang bìa', level: 1, el: coverEl });
      seenEls.add(coverEl);
    }

    // 2. Luôn thêm Theo dõi sửa đổi nếu có
    let revEl = wordEditorRef.current.querySelector('#heading-iso-rev-log');
    if (!revEl) {
      const allCandidateRev = wordEditorRef.current.querySelectorAll('h1, h2, h3, h4, p, div');
      for (const el of allCandidateRev) {
        if (el.innerText && el.innerText.includes('THEO DÕI SỬA ĐỔI')) {
          el.id = 'heading-iso-rev-log';
          revEl = el;
          break;
        }
      }
    }
    if (revEl) {
      list.push({ id: 'heading-iso-rev-log', title: 'THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU', level: 1, el: revEl });
      seenEls.add(revEl);
    }

    // 3. Quét các thẻ tiêu đề (h1, h2, h3, h4, .iso-doc-heading) và các đoạn văn bản bắt đầu bằng số thứ tự mục
    const candidateEls = wordEditorRef.current.querySelectorAll(
      'h1, h2, h3, h4, .iso-doc-heading, p, div'
    );

    const sectionPattern = /^\s*(([0-9]+(\.[0-9]+)*\.*|[I|V|X|A-Z]\.|\bMục\s+[0-9]+|\bPhần\s+[0-9IVX]+)\s*[:.-]?\s*(.+))$/i;

    let autoHeadingIdx = 1;
    candidateEls.forEach((el) => {
      if (seenEls.has(el)) return;
      if (el.closest('#iso-heading-cover-page') || el.closest('#heading-iso-rev-log-wrapper') || el.closest('.iso-doc-table')) return;

      const tag = el.tagName.toLowerCase();
      const rawText = el.innerText?.trim() || '';
      if (!rawText) return;

      const isHeadingTag = ['h1', 'h2', 'h3', 'h4'].includes(tag) || el.classList.contains('iso-doc-heading');
      const matchSection = rawText.match(sectionPattern);

      if (isHeadingTag || (matchSection && rawText.length <= 150)) {
        // Tránh trùng lặp với thẻ cha/con đã được thêm
        let parentOrChildSeen = false;
        for (const seen of seenEls) {
          if (seen.contains(el) || el.contains(seen)) {
            parentOrChildSeen = true;
            break;
          }
        }
        if (parentOrChildSeen) return;

        if (!el.id) {
          el.id = `editor-heading-${autoHeadingIdx++}`;
        }

        let level = 1;
        if (tag === 'h1') level = 1;
        else if (tag === 'h2') level = 2;
        else if (tag === 'h3') level = 3;
        else if (tag === 'h4') level = 4;
        else if (matchSection) {
          const prefix = matchSection[2] || '';
          const dotCount = (prefix.match(/\./g) || []).length;
          if (dotCount >= 2) level = 3;
          else if (dotCount === 1 && prefix.indexOf('.') < prefix.length - 1) level = 2;
          else level = 1;
        }

        let titleLine = rawText.split('\n')[0].trim();
        if (titleLine.length > 50) {
          titleLine = titleLine.substring(0, 48) + '...';
        }

        if (titleLine && !list.some(item => item.id === el.id)) {
          list.push({ id: el.id, title: titleLine, level, el });
          seenEls.add(el);
        }
      }
    });

    setDocHeadings(list);
    if (wordEditorRef.current) {
      const sheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
      setTotalSheetsCount(sheets.length || 3);
    }
  }, []);

  // Debounced updateDocHeadings khi người dùng đang nhập liệu
  const triggerDebouncedHeadingsUpdate = useCallback(() => {
    if (updateHeadingsTimerRef.current) {
      clearTimeout(updateHeadingsTimerRef.current);
    }
    updateHeadingsTimerRef.current = setTimeout(() => {
      updateDocHeadings();
    }, 150);
  }, [updateDocHeadings]);

  // Thêm mục (Heading) mới vào tài liệu
  const handleAddNewSection = () => {
    if (!wordEditorRef.current) return;
    setIsEditing(true);

    const sectionHeadings = docHeadings.filter(h => h.id !== 'iso-heading-cover-page' && h.id !== 'heading-iso-rev-log');
    const nextNum = sectionHeadings.length + 1;
    const newSecId = `heading-sec-${Date.now()}`;

    const newSectionHtml = `
      <div class="iso-doc-section-block" style="margin-top: 24px;">
        <h2 id="${newSecId}" class="iso-doc-heading level-1" style="margin: 20px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px;">
          ${nextNum}. Tiêu đề mục mới
        </h2>
        <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px;">
          <p>Nhập nội dung cho mục ${nextNum} tại đây...</p>
        </div>
      </div>
    `;

    const allSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
    const lastSheet = allSheets[allSheets.length - 1];
    if (lastSheet) {
      const sheetContent = lastSheet.querySelector('.iso-a4-sheet-content');
      if (sheetContent && sheetContent.scrollHeight < 750) {
        sheetContent.insertAdjacentHTML('beforeend', newSectionHtml);
      } else {
        const nextPg = allSheets.length + 1;
        const newSheet = createNewA4Sheet(nextPg, newSectionHtml);
        lastSheet.after(newSheet);
        reindexAllSheetFooters();
      }
    } else {
      const newSheet = createNewA4Sheet(3, newSectionHtml);
      wordEditorRef.current.appendChild(newSheet);
      reindexAllSheetFooters();
    }

    setIsWordEditorDirty(true);
    updateDocHeadings();

    setTimeout(() => {
      const newEl = wordEditorRef.current.querySelector(`#${newSecId}`);
      if (newEl) {
        newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

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
  const displayProcTitle = cleanTitle.replace(/^QUY\s+TRÌNH\s+/i, '');
  const deptName = formData.department_name || 'Công ty CP VINA G7';

  // Helper tạo Bảng 5.1 Lưu đồ quy trình 4 cột chuẩn ISO dạng SVG Vector đồng bộ 100% với bản in A4
  const buildFlowchartTableHtml = useCallback((steps) => {
    if (!steps || steps.length === 0) return '';
    const totalSteps = steps.length;
    const stepsSig = `${steps.length}_` + steps.map(s => `${s.step_number || ''}_${(s.name || '').slice(0, 15)}_${s.node_type || ''}`).join('~').replace(/["'<>]/g, '');
    const svgHtml = generateFlowchartSvgHtml(steps);

    return `
      <div class="iso-flowchart-block-container" id="iso-flowchart-block-container" data-flowchart-block="true" data-flowchart-v="9" data-steps-sig="${stepsSig}" data-step-count="${totalSteps}" style="margin: 6px 0 10px 0; position: relative;">
        <div class="iso-flowchart-header-actions" style="margin: 0 0 8px 0; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 11pt; font-weight: bold; margin: 0; color: #000000;">
            5.1. Sơ đồ lưu trình kiểm soát công tác ${displayProcTitle.toLowerCase()}
          </h3>
          <button
            type="button"
            class="iso-flowchart-edit-badge"
            onclick="window.__openIsoFlowchartModal && window.__openIsoFlowchartModal()"
            title="Chỉnh sửa các bước, hình khối và luồng luân chuyển của Lưu đồ này"
            style="background: #FAF6F0; color: #7B5233; border: 1.5px solid #7B5233; border-radius: 4px; padding: 4px 10px; font-size: 8.5pt; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);"
          >
            ✏️ Chỉnh sửa lưu đồ (${totalSteps} bước)
          </button>
        </div>
        <div class="iso-doc-table-wrapper" style="width:100%; margin:0; display:flex; justify-content:center;">
          ${svgHtml}
        </div>
      </div>
    `;
  }, [displayProcTitle]);

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
      <div class="iso-detailed-steps-block-container" id="iso-detailed-steps-block-container" style="margin: 18px 0;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 14px 0 8px 0; color: #0D0D0D;">
          5.2. Diễn giải chi tiết các bước thực hiện
        </h3>
        ${stepsHtml}
      </div>
    `;
  }, [cleanTitle, deptName]);

  // Helper tạo Bảng 6. Biểu mẫu đi kèm chuẩn ISO 5 cột theo quy chuẩn
  const buildRelatedFormsTableHtml = useCallback((existingContent = '') => {
    const leadIn = `<p style="margin: 6pt 0 10pt 0; font-size: 11pt; line-height: 1.5; color: #000000; font-family: 'Times New Roman', serif;">Toàn bộ các biểu mẫu phục vụ quy trình này phải được kiểm soát theo danh mục sau:</p>`;

    const isCorrupted = typeof existingContent === 'string' && (
      existingContent.includes('doc-paragraph') ||
      existingContent.includes('doc - paragraph') ||
      existingContent.includes('data-p-idx') ||
      existingContent.includes('data - p - idx')
    );

    if (!isCorrupted && existingContent && typeof existingContent === 'string' && existingContent.includes('<table') && existingContent.includes('Mã biểu mẫu')) {
      if (!existingContent.includes('Toàn bộ các biểu mẫu')) {
        return `${leadIn}\n${existingContent}`;
      }
      return existingContent;
    }

    const baseCode = (formData.code || formData.new_code || 'G7.HC.QT15').trim();
    const deptText = (formData.folder || formData.department_name || deptName || '').trim();
    const defaultDept = (deptText && deptText !== '---' && !/phòng\s*ban/i.test(deptText))
      ? deptText
      : 'Ban Quản trị Chất lượng & ISO (QLCL)';

    const items = [];

    // 1. Ưu tiên hàng đầu: Lấy từ mảng related_templates đã upload/cấu hình ở Tab Tài liệu liên quan
    if (formData.related_templates && formData.related_templates.length > 0) {
      formData.related_templates.forEach((t, tIdx) => {
        const code = (t.code || '').trim();
        const name = (t.title || t.name || '').trim();
        if (code || name) {
          items.push({
            code: code || `${baseCode} - BM0${tIdx + 1}`,
            name: name || `Biểu mẫu 0${tIdx + 1}`,
            storage: t.storage_location || defaultDept,
            retention: t.retention_period || '03 năm'
          });
        }
      });
    }

    if (items.length === 0 && existingContent && typeof existingContent === 'string') {
      const rawLines = [];

      // Nếu chứa bảng (kể cả bảng bị dính thuộc tính cũ), bóc tách text từng dòng
      if (existingContent.includes('<tr')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<div>${existingContent}</div>`, 'text/html');
          doc.querySelectorAll('tr').forEach(r => {
            const cells = Array.from(r.querySelectorAll('td'));
            if (cells.length >= 2) {
              const cellTexts = cells.map(c => c.textContent.trim()).filter(Boolean);
              if (cellTexts.length >= 2) {
                rawLines.push(cellTexts.join(' - '));
              }
            }
          });
        } catch (_) {}
      }

      // Tách các dòng văn bản thông thường
      const textLines = existingContent
        .replace(/<\/tr>|<\/p>|<\/li>|<br\s*\/?>/gi, '\n')
        .split('\n')
        .map(l => l.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ').trim())
        .filter(l => l.length > 0 && !/^(?:(?:6\.)?\s*(?:biểu\s*mẫu|hồ\s*sơ)(?:\s*đi\s*kèm)?\s*:?|toàn\s*bộ\s*các\s*biểu\s*mẫu.*|danh\s*mục\s*biểu\s*mẫu.*|stt\s+mã\s+biểu\s+mẫu.*)$/i.test(l));

      rawLines.push(...textLines);

      rawLines.forEach(line => {
        let clean = line.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ');
        // Xóa sạch mọi rác ký tự thuộc tính HTML cũ bị lẫn vào text
        clean = clean.replace(/^(?:(?:iso\s*[-_]\s*)?doc\s*[-_]\s*paragraph"?\s*(?:data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?)?>?|data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?>?)\s*[-–—:\s]*/i, '').trim();
        clean = clean.replace(/^[-*•\d\.\s]+/, '').trim();
        clean = clean.replace(/^(?:(?:iso\s*[-_]\s*)?doc\s*[-_]\s*paragraph"?\s*(?:data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?)?>?)\s*[-–—:\s]*/i, '').trim();
        clean = clean.replace(/^[-*•\d\.\s]+/, '').trim();
        if (!clean) return;

        let code = '';
        let name = '';
        const parts = clean.split(/\s*[-–—:]\s*/).filter(Boolean);
        if (parts.length >= 3 && /^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*/i.test(parts[1])) {
          code = `${parts[0]} - ${parts[1]}`;
          name = parts.slice(2).join(' - ');
        } else if (parts.length >= 2) {
          if (/^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*/i.test(parts[0])) {
            code = `${baseCode} - ${parts[0]}`;
            name = parts.slice(1).join(' - ');
          } else {
            code = parts[0];
            name = parts.slice(1).join(' - ');
          }
        } else {
          code = '';
          name = clean;
        }

        if (code || name) {
          if (/^(?:BM|HD|PL|SOP|WI|QD|QĐ)\d*/i.test(code)) {
            code = `${baseCode} - ${code}`;
          }
          items.push({ code, name });
        }
      });
    }

    if (items.length === 0 && formData.steps) {
      const seen = new Set();
      formData.steps.forEach(s => {
        if (s.template_files && s.template_files !== '---') {
          const tpls = s.template_files.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
          tpls.forEach(t => {
            if (!seen.has(t)) {
              seen.add(t);
              const fmtCode = /^(?:BM|HD|PL)\d*/i.test(t) ? `${baseCode} - ${t}` : t;
              items.push({ code: fmtCode, name: `Biểu mẫu kiểm soát ${s.name || ''}`.trim() });
            }
          });
        }
      });
    }

    if (items.length === 0) {
      const procName = formData.name || 'Quy trình đào tạo';
      items.push({ code: `${baseCode} - BM01`, name: `Biểu mẫu theo dõi ${procName}` });
      items.push({ code: `${baseCode} - BM02`, name: `Phiếu kiểm tra ${procName}` });
      items.push({ code: `${baseCode} - BM03`, name: 'Sổ tổng hợp và lưu trữ dữ liệu quy trình định kỳ' });
      items.push({ code: `${baseCode} - HD01`, name: `Hướng dẫn thực hiện ${procName}` });
    }

    const rowsHtml = items.map((item, idx) => {
      const seq = idx + 1;
      let code = item.code || `${baseCode} - BM0${seq}`;
      const name = item.name || `[Tên biểu mẫu 0${seq}]`;

      // Chuẩn hóa định dạng mã biểu mẫu: G7.HC.QT15 - BM01
      if (/^(?:BM|HD|PL)\d*/i.test(code)) {
        code = `${baseCode} - ${code}`;
      }

      let storage = item.storage || defaultDept;
      if (!item.storage && (idx === 1 || code.includes('BM02') || code.includes('ISO') || code.includes('QLCL'))) {
        storage = 'Ban ISO / QLCL';
      }

      const retention = item.retention || ((idx === 1 || idx === 3 || code.includes('BM02') || code.includes('HD') || code.includes('ISO')) ? '05 năm' : '03 năm');

      return `
        <tr style="height: 26pt; page-break-inside: avoid; background: #ffffff;">
          <td style="border: 1.0pt solid #000000; text-align: center; padding: 5pt 4pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; vertical-align: middle;">${seq}</td>
          <td style="border: 1.0pt solid #000000; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; font-weight: bold; color: #0369a1; vertical-align: middle;">${code}</td>
          <td style="border: 1.0pt solid #000000; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle;">${name}</td>
          <td style="border: 1.0pt solid #000000; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle;">${storage}</td>
          <td style="border: 1.0pt solid #000000; text-align: center; padding: 5pt 4pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; vertical-align: middle;">${retention}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="iso-doc-forms-container" style="margin: 12pt 0;">
        ${leadIn}
        <table class="iso-doc-forms-table" style="width: 100%; border-collapse: collapse; border: 1.5pt solid #000000; table-layout: fixed; margin-top: 6pt;">
          <thead>
            <tr style="background: #f1f5f9; font-weight: bold; text-align: center; height: 26pt;">
              <th style="border: 1.0pt solid #000000; width: 8%; padding: 5pt 4pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; text-align: center;">STT</th>
              <th style="border: 1.0pt solid #000000; width: 25%; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; text-align: center;">Mã biểu mẫu</th>
              <th style="border: 1.0pt solid #000000; width: 35%; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; text-align: center;">Tên biểu mẫu</th>
              <th style="border: 1.0pt solid #000000; width: 20%; padding: 5pt 8pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; text-align: center;">Nơi lưu trữ</th>
              <th style="border: 1.0pt solid #000000; width: 12%; padding: 5pt 4pt; font-size: 10.5pt; font-family: 'Times New Roman', serif; text-align: center;">Thời hạn lưu</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }, [formData.code, formData.new_code, formData.name, formData.folder, formData.department_name, formData.steps, formData.related_templates, deptName]);

  // Helper thay thế bảng lưu đồ Word thô hoặc bảng phiên bản cũ bằng SVG Flowchart 4 cột chuẩn ISO có nút Chỉnh sửa
  const replaceFlowchartInHtml = useCallback((htmlContent, steps) => {
    if (!htmlContent || !steps || steps.length === 0) return htmlContent;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
      const root = (doc.body.children.length === 1 && doc.body.firstElementChild) ? doc.body.firstElementChild : doc.body;
      if (!root) return htmlContent;

      const newFlowchartHtml = buildFlowchartTableHtml(steps);

      // 1. Kiểm tra nếu đã có khối iso-flowchart-block-container -> Luôn cập nhật lại theo danh sách steps mới nhất
      const curFc = root.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container');
      if (curFc) {
        curFc.outerHTML = newFlowchartHtml;
        return root.innerHTML;
      }

      // 2. Tìm khối tiêu đề 5.1 (Sơ đồ / Lưu đồ)
      const allCandidateNodes = root.querySelectorAll('h1, h2, h3, h4, h5, p, div');
      const sec51Node = Array.from(allCandidateNodes).find(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        return (
          /5[\.\s]*1[\.\s]/.test(txt) &&
          (/sơ đồ/i.test(txt) || /lưu đồ/i.test(txt) || /lưu trình/i.test(txt) || /flowchart/i.test(txt))
        );
      });

      if (sec51Node) {
        const headingEl = sec51Node.closest('h1, h2, h3, h4, h5, p') || sec51Node;
        const parentTable = headingEl.closest('table');
        if (parentTable) {
          const wrapper = parentTable.closest('.iso-doc-table-wrapper') || parentTable;
          wrapper.outerHTML = newFlowchartHtml;
          return root.innerHTML;
        }

        // Tìm table hoặc .iso-doc-table-wrapper sau tiêu đề 5.1
        let sib = headingEl.nextElementSibling;
        let targetTable = null;
        for (let i = 0; i < 5 && sib; i++) {
          if (sib.tagName === 'TABLE' || (sib.querySelector && sib.querySelector('table'))) {
            targetTable = sib;
            break;
          }
          sib = sib.nextElementSibling;
        }

        if (targetTable) {
          const wrapper = targetTable.closest('.iso-doc-table-wrapper') || targetTable;
          wrapper.outerHTML = newFlowchartHtml;
          headingEl.remove();
          return root.innerHTML;
        } else {
          headingEl.insertAdjacentHTML('afterend', newFlowchartHtml);
          headingEl.remove();
          return root.innerHTML;
        }
      }

      // 3. Fallback: Tìm bảng có tiêu đề 4 cột lưu đồ (Bước, Trách nhiệm, Lưu đồ, Biểu mẫu)
      const allTables = root.querySelectorAll('table');
      const flowTable = Array.from(allTables).find(tbl => {
        const firstRow = tbl.querySelector('tr');
        const txt = (firstRow?.textContent || '').toLowerCase();
        return (txt.includes('lưu đồ') || txt.includes('sơ đồ')) && txt.includes('trách nhiệm');
      });

      if (flowTable) {
        const wrapper = flowTable.closest('.iso-doc-table-wrapper') || flowTable;
        wrapper.outerHTML = newFlowchartHtml;
        return root.innerHTML;
      }

      return htmlContent;
    } catch (err) {
      console.error('Lỗi khi nâng cấp flowchart HTML:', err);
      return htmlContent;
    }
  }, [buildFlowchartTableHtml]);

  // Helper tự động nâng cấp Mục 6. Biểu mẫu đi kèm sang Bảng 5 cột chuẩn ISO
  const replaceRelatedFormsInHtml = useCallback((htmlContent) => {
    if (!htmlContent) return htmlContent;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
      const root = (doc.body.children.length === 1 && doc.body.firstElementChild) ? doc.body.firstElementChild : doc.body;
      if (!root) return htmlContent;

      const headings = root.querySelectorAll('h1, h2, h3, h4, h5, p, div');
      const sec6Heading = Array.from(headings).find(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (el.id === 'heading-sec-6' || el.id === 'heading-sec-forms') return true;
        return (
          (/(?:6\s*[\.\:\-]\s*(?:biểu\s*mẫu|danh\s*mục\s*biểu\s*mẫu|hồ\s*sơ|tài\s*liệu\s*biểu\s*mẫu)|^(?:danh\s*mục\s*)?biểu\s*mẫu)/i.test(txt) ||
          (/6\s*[\.\:\-]/i.test(txt) && /(?:biểu\s*mẫu|hồ\s*sơ)/i.test(txt))) &&
          txt.length <= 120
        );
      });

      if (sec6Heading) {
        let sib = sec6Heading.nextElementSibling;
        let contentHtml = '';
        const toRemove = [];
        let hasFormsTable = false;
        while (sib && !/^H[1-6]$/i.test(sib.tagName)) {
          const sibText = (sib.textContent || '').trim().toLowerCase();
          if (/^[1-9]\s*[\.\:\-]/.test(sibText) && !/biểu\s*mẫu/i.test(sibText)) {
            break;
          }
          if (sib.classList?.contains('iso-doc-forms-table') || (sib.querySelector && sib.querySelector('table.iso-doc-forms-table'))) {
            hasFormsTable = true;
          }
          contentHtml += sib.outerHTML;
          toRemove.push(sib);
          sib = sib.nextElementSibling;
        }

        if (!hasFormsTable) {
          toRemove.forEach(el => el.remove());
          const newFormsTableHtml = buildRelatedFormsTableHtml(contentHtml);
          sec6Heading.insertAdjacentHTML('afterend', newFormsTableHtml);
          return root.innerHTML;
        }
      }
      return htmlContent;
    } catch (err) {
      console.error('replaceRelatedFormsInHtml error:', err);
      return htmlContent;
    }
  }, [buildRelatedFormsTableHtml]);

  // Helper tạo Bảng Theo dõi sửa đổi nội dung tài liệu chuẩn 22 dòng theo Mẩu quy trình.docx
  const buildRevisionLogsTableHtml = useCallback((logs) => {
    const revLogs = (logs && logs.length > 0)
      ? logs
      : [{ seq_no: 1, rev_date: formData.issue_date || '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }];

    const totalRowsCount = 22;
    const emptyRowsCount = Math.max(0, totalRowsCount - revLogs.length);
    const emptyRowsHtml = Array.from({ length: emptyRowsCount }).map((_, idx) => {
      const isLast = idx === emptyRowsCount - 1;
      const bBorder = isLast ? '1.5px solid #000000' : '1px dotted #000000';
      return `
        <tr style="height:28px;">
          <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; padding:4px 6px; text-align: center;">&nbsp;</td>
          <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; padding:4px 6px; text-align: center;">&nbsp;</td>
          <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; padding:4px 8px;">&nbsp;</td>
          <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; padding:4px 6px; text-align: center;">&nbsp;</td>
        </tr>
      `;
    }).join('');

    return `
      <div id="heading-iso-rev-log-wrapper" style="margin-bottom: 24px;">
        <h1 id="heading-iso-rev-log" class="iso-doc-heading level-1" style="font-size: 18pt; font-weight: bold; font-family: 'Times New Roman', serif; text-transform: uppercase; margin: 24px 0 16px 0; color: #0D0D0D; text-align: center;">
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
            <tr style="background-color: #FFFFFF; font-weight: bold; text-align: center; height:36px;">
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:13pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Số TT</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:13pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Ngày Sửa</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:13pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Nội Dung Sửa Đổi</th>
              <th style="padding: 6px 8px; border: 1px solid #000000; text-align: center; font-size:13pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Trang Số</th>
            </tr>
          </thead>
          <tbody>
            ${revLogs.map((l, rIdx) => {
              const isLast = (rIdx === revLogs.length - 1) && (emptyRowsCount === 0);
              const bBorder = isLast ? '1.5px solid #000000' : '1px dotted #000000';
              return `
              <tr style="height:28px;">
                <td style="padding: 4px 6px; border-left: 1px solid #000000; border-right: 1px solid #000000; border-bottom: ${bBorder}; text-align: center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D;">${String(l.seq_no || 1).padStart(2, '0')}</td>
                <td style="padding: 4px 6px; border-left: 1px solid #000000; border-right: 1px solid #000000; border-bottom: ${bBorder}; text-align: center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D;">${l.rev_date || '---'}</td>
                <td style="padding: 4px 8px; border-left: 1px solid #000000; border-right: 1px solid #000000; border-bottom: ${bBorder}; text-align: left; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D;">${l.content || 'Ban hành lần đầu'}</td>
                <td style="padding: 4px 6px; border-left: 1px solid #000000; border-right: 1px solid #000000; border-bottom: ${bBorder}; text-align: center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D;">${l.page_no || 'Toàn bộ'}</td>
              </tr>
            `}).join('')}
            ${emptyRowsHtml}
          </tbody>
        </table></div>
        <div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>
      </div>
    `;
  }, [formData.issue_date]);

  // Mở Flowchart Modal thiết kế & chỉnh sửa lưu đồ (Hỗ trợ chỉ định mục đích / vị trí con trỏ chuột)
  const handleOpenFlowchartModal = useCallback((targetEl = null) => {
    if (targetEl) {
      targetSectionRef.current = targetEl;
    } else if (!targetSectionRef.current) {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node = sel.anchorNode;
          if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
          if (node && wordEditorRef.current?.contains(node)) {
            const secBlock = node.closest('.iso-doc-section-block, .iso-flowchart-block-container, [id^="heading-sec-"]') || node.closest('.iso-a4-sheet-content');
            if (secBlock) {
              targetSectionRef.current = secBlock;
            }
          }
        }
      } catch (_) {}
    }

    // Không gán cứng data mẫu - người dùng sẽ tạo lưu đồ từ đầu khi bấm Thêm lưu đồ
    if (!formData.steps) {
      if (setFormData) {
        setFormData(prev => ({
          ...prev,
          steps: [],
          has_flowchart: false
        }));
      }
    }

    setIsEditing(true);
    setActiveModalTab('canvas');
    setShowFlowchartModal(true);
  }, [formData.steps, setFormData]);

  // Expose global callback cho nút Chỉnh sửa trên Bảng HTML
  useEffect(() => {
    window.__openIsoFlowchartModal = (targetEl = null) => {
      handleOpenFlowchartModal(targetEl);
    };
    return () => {
      delete window.__openIsoFlowchartModal;
    };
  }, [handleOpenFlowchartModal]);

  // Tự động đồng bộ nâng cấp bảng lưu đồ trong DOM editor nếu còn ở định dạng bảng cũ hoặc phiên bản cũ
  // Bao gồm cả trường hợp upload file Word có bảng lưu đồ 5.1 kiểu HTML thô (không có class iso-flowchart-block-container)
  useEffect(() => {
    if (!wordEditorRef.current || !formData.steps || formData.steps.length === 0) return;

    const stepsSig = `${formData.steps.length}_` + formData.steps.map(s => `${s.step_number || ''}_${(s.name || '').slice(0, 15)}_${s.node_type || ''}`).join('~').replace(/["'<>]/g, '');

    // CASE 1: Đã có khối iso-flowchart-block-container -> Nâng cấp lên v9 và đồng bộ nếu nội dung/chiều cao cũ
    let curFc = wordEditorRef.current.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container');
    if (curFc) {
      const v = curFc.getAttribute('data-flowchart-v');
      const sig = curFc.getAttribute('data-steps-sig');
      const hasOldTable = Boolean(curFc.querySelector('table.iso-flowchart-table'));
      const hasOldText = curFc.innerHTML.includes('Quay lại B');
      const hasOldHeight = curFc.innerHTML.includes('height="890"') || curFc.innerHTML.includes('height="850"') || curFc.innerHTML.includes('height="840"');

      if (v !== '9' || sig !== stepsSig || hasOldTable || hasOldText || hasOldHeight) {
        curFc.outerHTML = buildFlowchartTableHtml(formData.steps);
        curFc = wordEditorRef.current.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container');
      }

      // Đảm bảo khối lưu đồ luôn nằm trong .iso-a4-sheet
      if (curFc && !curFc.closest('.iso-a4-sheet')) {
        reindexAllSheetFooters();
      }

      // HỢP NHẤT MỤC 5.2 VÀO CÙNG TRANG VỚI LƯU ĐỒ NẾU LƯU ĐỒ <= 6 BƯỚC (NHƯ ẢNH 2)
      if (curFc && formData.steps.length <= 6) {
        const fcSheet = curFc.closest('.iso-a4-sheet');
        if (fcSheet) {
          const fcContent = fcSheet.querySelector('.iso-a4-sheet-content');
          const has52OnSameSheet = fcSheet.querySelector('#iso-detailed-steps-block-container, .iso-detailed-steps-block-container') ||
            /5[\.\s]*2|diễn giải chi tiết/i.test(fcContent?.innerText || '');

          if (!has52OnSameSheet) {
            const all52 = wordEditorRef.current.querySelectorAll('#iso-detailed-steps-block-container, .iso-detailed-steps-block-container');
            let sec52El = Array.from(all52).find(el => el.closest('.iso-a4-sheet') !== fcSheet);
            if (sec52El) {
              const oldSheet = sec52El.closest('.iso-a4-sheet');
              curFc.insertAdjacentElement('afterend', sec52El);
              if (oldSheet) {
                const oldContent = oldSheet.querySelector('.iso-a4-sheet-content');
                const remainingText = (oldContent?.innerText || '').replace(/[\s\u00a0]+/g, ' ').trim();
                const hasMedia = oldContent?.querySelector('table, svg, img');
                if (remainingText.length < 50 && !hasMedia) {
                  oldSheet.remove();
                }
              }
              reindexAllSheetFooters();
            }
          }
        }
      }

      setTimeout(updateDocHeadings, 100);
      return;
    }

    // CASE 2: Chưa có khối iso-flowchart-block-container (bảng lưu đồ thô từ Word)
    const currentHtml = wordEditorRef.current.innerHTML;
    const upgradedHtml = replaceFlowchartInHtml(currentHtml, formData.steps);
    if (upgradedHtml && upgradedHtml !== currentHtml) {
      wordEditorRef.current.innerHTML = upgradedHtml;
      reindexAllSheetFooters();
      setTimeout(updateDocHeadings, 100);
    }
  }, [formData.steps, buildFlowchartTableHtml, replaceFlowchartInHtml, updateDocHeadings, reindexAllSheetFooters]);

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
      }

      // 1. CẬP NHẬT VĂN BẢN VÀ THÊM TRANG A4 VÀO DOM TRƯỚC TIÊN
      if (formData.steps && formData.steps.length > 0) {
        // NẾU ĐANG Ở CHẾ ĐỘ CANVAS EDITOR -> ĐỒNG BỘ TRỰC TIẾP QUA BRIDGE
        if (editorEngine === 'canvas' && typeof window.__insertFlowchartIntoCanvasEditor__ === 'function') {
          window.__insertFlowchartIntoCanvasEditor__(formData.steps);
        }

        if (wordEditorRef.current) {
          const newTableHtml = buildFlowchartTableHtml(formData.steps);
          const newDetailedStepsHtml = buildDetailedStepsHtml(formData.steps);
          const newRevLogsHtml = buildRevisionLogsTableHtml(updatedLogs);

          // A. Cập nhật hoặc chèn Bảng lưu đồ 5.1
          let existingFlowchartEl = wordEditorRef.current.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container');
          if (existingFlowchartEl) {
            existingFlowchartEl.outerHTML = newTableHtml;
          } else {
            // Kiểm tra xem có bảng table lưu đồ cũ nào (như bảng Word thô ở Ảnh 1) không
            const allTables = wordEditorRef.current.querySelectorAll('table');
            const oldRawTable = Array.from(allTables).find(tbl => {
              const txt = (tbl.innerText || tbl.textContent || '').toLowerCase();
              return txt.includes('bước 1') && (txt.includes('bước 2') || txt.includes('trách nhiệm') || txt.includes('lưu đồ') || txt.includes('phụ lục'));
            });
            if (oldRawTable) {
              const wrapper = oldRawTable.closest('.iso-doc-table-wrapper') || oldRawTable;
              wrapper.outerHTML = newTableHtml;
            } else {
              // Tìm Mục 5.1 hoặc Mục 5 để chèn bảng
              const sec5El = Array.from(wordEditorRef.current.querySelectorAll('h1, h2, h3, p, .iso-doc-heading')).find(el =>
                /5\.1\s*Lưu đồ|5\.\s*Nội dung/i.test(el.innerText || '')
              );
              if (sec5El) {
                sec5El.insertAdjacentHTML('afterend', newTableHtml);
              } else {
                const allSheets = wordEditorRef.current.querySelectorAll('.iso-a4-sheet');
                const targetSheet = allSheets[2] || allSheets[allSheets.length - 1];
                const contentEl = targetSheet?.querySelector('.iso-a4-sheet-content');
                if (contentEl) {
                  contentEl.insertAdjacentHTML('beforeend', newTableHtml);
                }
              }
            }
          }

        // B. Lấy lại phần tử flowchart vừa cập nhật để xác định chính xác sheet chứa flowchart
        const currentFlowchartEl = wordEditorRef.current.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container');
        const sheetOfFlowchart = currentFlowchartEl?.closest('.iso-a4-sheet');

        // C. Xóa TẤT CẢ các khối 5.2 cũ trong toàn bộ DOM để không bao giờ bị trùng lặp
        const oldDetailsEls = wordEditorRef.current.querySelectorAll('#iso-detailed-steps-block-container, .iso-detailed-steps-block-container');
        oldDetailsEls.forEach(el => el.remove());

        // D. ĐƯA MỤC 5.2:
        // - NẾU <= 6 BƯỚC (NHƯ ẢNH 2): ĐI LIỀN NGAY SAU LƯU ĐỒ TRÊN CÙNG TRANG!
        // - NẾU >= 7 BƯỚC (DÀI): ĐƯA SANG TRANG RIÊNG NGAY SAU TRANG CHỨA LƯU ĐỒ ĐỂ TRÁNH TRÀN KHỔ A4
        if (formData.steps.length <= 6) {
          if (currentFlowchartEl) {
            currentFlowchartEl.insertAdjacentHTML('afterend', newDetailedStepsHtml);
          }
        } else if (sheetOfFlowchart) {
          let nextSheet = sheetOfFlowchart.nextElementSibling;
          // Nếu trang tiếp theo chưa có hoặc không phải là sheet A4
          if (!nextSheet || !nextSheet.classList?.contains('iso-a4-sheet')) {
            const curPageNum = parseInt(sheetOfFlowchart.getAttribute('data-page') || '3', 10);
            const nextPg = curPageNum + 1;
            const newSheet = createNewA4Sheet(nextPg, newDetailedStepsHtml);
            sheetOfFlowchart.after(newSheet);
          } else {
            // Nếu trang tiếp theo đã tồn tại -> chèn 5.2 vào đầu content của trang đó
            const nextContent = nextSheet.querySelector('.iso-a4-sheet-content');
            if (nextContent) {
              nextContent.insertAdjacentHTML('afterbegin', newDetailedStepsHtml);
            }
          }
        }

        // E. Đánh lại số trang cho toàn bộ các tờ A4
        reindexAllSheetFooters();

        // B. Cập nhật bảng theo dõi sửa đổi nếu có
        let finalHtml = wordEditorRef.current.innerHTML;
        if (/heading-iso-rev-log/i.test(finalHtml)) {
          const replacedRev = finalHtml.replace(
            /<div id="heading-iso-rev-log-wrapper"[\s\S]*?<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---<\/span><\/div>\s*<\/div>/i,
            newRevLogsHtml
          );
          if (replacedRev !== finalHtml) {
            finalHtml = replacedRev;
            wordEditorRef.current.innerHTML = replacedRev;
          }
        }

        reindexAllSheetFooters();
        setTimeout(updateDocHeadings, 150);
        setIsWordEditorDirty(true);

        // C. CẬP NHẬT FORM DATA STATE VỚI HTML MỚI NHẤT
        if (setFormData) {
          setFormData(prev => ({
            ...prev,
            has_flowchart: true,
            steps: formData.steps,
            revision_logs: updatedLogs,
            sections: {
              ...(prev.sections || {}),
              '__full_html__': finalHtml,
              '5. Nội dung quy trình': combinedFlowchartBlockHtml
            }
          }));
        }

        // D. LƯU TRỰC TIẾP TỆP DRAFT WORD NẾU CÓ FILE_PATH
        if (formData.file_path) {
          try {
            await api.post('/iso-master-records/save-direct-word-content', {
              draft_path: formData.file_path,
              html_content: finalHtml
            });
          } catch (eSave) {
            console.warn('Lỗi khi lưu direct word content:', eSave);
          }
        }
      } // Kết thúc khối if (wordEditorRef.current)

      if (editorEngine === 'canvas' && setFormData) {
        setFormData(prev => ({
          ...prev,
          has_flowchart: true,
          steps: formData.steps,
          revision_logs: updatedLogs
        }));
      }

      // E. LƯU CSDL FORM CHA MÀ KHÔNG THOÁT MÀN HÌNH
      if (handleSaveForm) {
        await handleSaveForm({
          stayOnPage: true,
          skipModal: true,
          revisionNote: noteContent,
          revisionPageNo: 'Mục 5 / Toàn bộ'
        });
      }

        setTimeout(() => {
          const fcEl = wordEditorRef.current?.querySelector('#iso-flowchart-block-container, .iso-flowchart-block-container, #heading-sec-5');
          if (fcEl) {
            fcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      }

      setShowFlowchartModal(false);
    } catch (err) {
      console.error('Lỗi khi lưu lưu đồ:', err);
      alert('Lỗi: ' + (err?.message || 'Không thể lưu'));
    }
  };

  // Nạp nội dung tài liệu từ tệp Word hoặc từ sections trong formData (Dựng chuẩn 3 phần theo Mẫu quy trình.docx)
  const loadDocumentContent = useCallback(async (forceReload = false) => {
    const currentDocKey = `${formData.id || ''}_${formData.file_path || ''}_${formData.docx_path || ''}_${formData.code || ''}`;
    // Nếu đã nạp tài liệu một lần rồi, và không phải đổi file/id hoặc forceReload, KHÔNG ĐƯỢC GHI ĐÈ DOM!
    if (!forceReload && hasLoadedDocRef.current && loadedDocKeyRef.current === currentDocKey && wordEditorRef.current && wordEditorRef.current.children.length > 0) {
      return;
    }

    setLoadingDoc(true);
    try {
      const targetPath = formData.file_path || formData.docx_path || formData.document_path || '';
      const cleanTitle = (formData.name || formData.code || 'QUY TRÌNH ISO').trim().toUpperCase();
      const docCode = formData.code || formData.new_code || '---';
      const version = formData.version || '';
      const issueDate = formData.issue_date || '';
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

        out = out.replaceAll('[mã hiệu]', docCode);
        out = out.replaceAll('[lần ban hành]', version);
        out = out.replaceAll('[ngày ban hành]', issueDate);
        out = out.replaceAll('[phòng ban/ bộ phận]', deptName);
        out = out.replaceAll('[phòng ban / bộ phận]', deptName);

        // Bóc tách tên & chức vụ người biên soạn
        let issName = issuer;
        let issRole = 'Biên soạn';
        const mIss = issuer.match(/^(.*?)\s*[\(\:]\s*(.*?)\)?$/);
        if (mIss && mIss[2]?.trim()) {
          issName = mIss[1].trim();
          issRole = mIss[2].trim().replace(/\)$/, '') || 'Biên soạn';
        } else if (/nhân viên|chuyên viên|kỹ sư|quản lý|trưởng nhóm/i.test(issuer)) {
          issRole = issuer;
          issName = '';
        }
        out = out.replaceAll('[Họ tên người biên soạn]', issName || '&nbsp;');
        out = out.replaceAll('[CV NBS]', issRole || 'Biên soạn');

        // Bóc tách tên & chức vụ người phê duyệt
        let appName = approver;
        let appRole = '';
        const mApp = approver.match(/^(.*?)\s*[\(\:]\s*(.*?)\)?$/);
        if (mApp && mApp[2]?.trim()) {
          appName = mApp[1].trim();
          appRole = mApp[2].trim().replace(/\)$/, '');
        } else if (/giám đốc|phó tổng|tổng giám|trưởng phòng|bgd|tgđ/i.test(approver)) {
          appRole = approver;
          appName = '';
        }
        if (!appRole) {
          if (formData.role) {
            appRole = formData.role;
          } else if (appName.toLowerCase().includes('tuấn')) {
            appRole = 'Trưởng Phòng';
          } else {
            appRole = 'Phê duyệt';
          }
        }
        out = out.replaceAll('[Họ tên người phê duyệt]', appName || '&nbsp;');
        out = out.replaceAll('[CV NPD]', appRole || 'Phê duyệt');

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

      // Dựng HTML dự phòng 100% nguyên bản cắt từ Mẩu quy trình.docx (2 tờ A4 độc lập)
      const buildFallback2Pages = () => {
        const revLogs = (formData.revision_logs && formData.revision_logs.length > 0)
          ? formData.revision_logs
          : [{ seq_no: 1, rev_date: issueDate || '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }];

        const totalRowsCount = 22;
        const tbodyRows = [];
        for (let rIdx = 0; rIdx < totalRowsCount; rIdx++) {
          const isLast = (rIdx === totalRowsCount - 1);
          const bBorder = isLast ? '1.5px solid #000000' : '1px dotted #000000';
          if (rIdx < revLogs.length) {
            const item = revLogs[rIdx];
            const seqVal = String(item.seq_no || (rIdx + 1)).padStart(2, '0');
            const dateVal = item.rev_date || issueDate;
            const contentVal = item.content || 'Ban hành lần đầu';
            const pageVal = item.page_no || 'Toàn bộ';
            tbodyRows.push(`
              <tr style="height:32px; background:#FFFFFF;">
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${seqVal}</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${dateVal}</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 8px; text-align:left; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${contentVal}</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${pageVal}</td>
              </tr>
            `);
          } else {
            tbodyRows.push(`
              <tr style="height:32px; background:#FFFFFF;">
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 8px; background:#FFFFFF;">&nbsp;</td>
                <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
              </tr>
            `);
          }
        }

        const coverPage = `
          <div class="iso-a4-sheet" data-page="1" id="iso-heading-cover-page" style="background:#FFFFFF; width:794px; min-height:1123px; padding:48px 50px 32px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative;">
            <div class="iso-a4-sheet-content">
              <table class="iso-cover-table" style="width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000; background:#FFFFFF;">
                <colgroup>
                  <col style="width:22%;" />
                  <col style="width:28%;" />
                  <col style="width:25%;" />
                  <col style="width:25%;" />
                </colgroup>
                <tbody>
                  <tr style="height:120px; background:#FFFFFF;">
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;">
                      <img src="${logoCty}" style="max-height:85px; max-width:100%; display:block; margin:0 auto; object-fit:contain;" alt="Logo VINA G7" />
                    </td>
                    <td colspan="3" style="border:1px solid #000000; padding:6px 12px; vertical-align:middle; text-align:center; background:#FFFFFF;">
                      <p style="margin:0; text-align:center;"><strong style="font-size:20pt; font-family:'Times New Roman', serif; text-transform:uppercase; color:#0D0D0D; letter-spacing:0.5px;">CÔNG TY CỔ PHẦN VINA G7</strong></p>
                    </td>
                  </tr>
                  <tr style="height:620px; background:#FFFFFF;">
                    <td colspan="4" style="border:1px solid #000000; padding:36px 16px 20px 16px; vertical-align:middle; text-align:center; background:#FFFFFF;">
                      <div style="margin-top:20px; margin-bottom:30px;">
                        <h1 style="font-size:26pt; font-family:'Times New Roman', serif; font-weight:bold; text-transform:uppercase; color:#0D0D0D; line-height:1.4; margin:0; letter-spacing:0.5px;">${cleanTitle}</h1>
                      </div>
                      <table class="iso-meta-table" style="margin:36px auto 16px auto; border-collapse:collapse; width:350px; font-family:'Times New Roman', serif; border:1px dotted #94a3b8; background-color:#FFFFFF;">
                        <tbody>
                          <tr style="height:28px;">
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-weight:bold; font-size:11pt; color:#0D0D0D; width:140px; text-align:left; background-color:#FFFFFF;">Mã hiệu:</td>
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-size:11pt; color:#0D0D0D; text-align:center; background-color:#FFFFFF;">${docCode}</td>
                          </tr>
                          <tr style="height:28px;">
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-weight:bold; font-size:11pt; color:#0D0D0D; width:140px; text-align:left; background-color:#FFFFFF;">Lần ban hành :</td>
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-size:11pt; color:#0D0D0D; text-align:center; background-color:#FFFFFF;">${version}</td>
                          </tr>
                          <tr style="height:28px;">
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-weight:bold; font-size:11pt; color:#0D0D0D; width:140px; text-align:left; background-color:#FFFFFF;">Ngày ban hành :</td>
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-size:11pt; color:#0D0D0D; text-align:center; background-color:#FFFFFF;">${issueDate}</td>
                          </tr>
                          <tr style="height:28px;">
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-weight:bold; font-size:11pt; color:#0D0D0D; width:140px; text-align:left; background-color:#FFFFFF;">Bộ phận thực hiện:</td>
                            <td style="padding:4px 8px; border:1px dotted #94a3b8; font-size:11pt; color:#0D0D0D; text-align:center; background-color:#FFFFFF;">${deptName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr style="height:48px; background:#FFFFFF;">
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:13pt; font-family:'Times New Roman', serif; text-transform:uppercase; color:#0D0D0D;">TRÁCH NHIỆM</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:13pt; font-family:'Times New Roman', serif; text-transform:uppercase; color:#0D0D0D;">HỌ TÊN</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:13pt; font-family:'Times New Roman', serif; text-transform:uppercase; color:#0D0D0D;">CHỨC VỤ</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:13pt; font-family:'Times New Roman', serif; text-transform:uppercase; color:#0D0D0D;">KÝ TÊN</strong></td>
                  </tr>
                  <tr style="height:80px; background:#FFFFFF;">
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Biên soạn</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">[Họ tên người biên soạn]</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">[CV NBS]</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;">&nbsp;</td>
                  </tr>
                  <tr style="height:80px; background:#FFFFFF;">
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">Phê duyệt</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">[Họ tên người phê duyệt]</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;"><strong style="font-size:12pt; font-family:'Times New Roman', serif; color:#0D0D0D;">[CV NPD]</strong></td>
                    <td style="border:1px solid #000000; padding:6px 8px; vertical-align:middle; text-align:center; background:#FFFFFF;">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;

        const revPage = `
          <div class="iso-a4-sheet" data-page="2" id="heading-iso-rev-log-wrapper" style="background:#FFFFFF; width:794px; min-height:1123px; padding:48px 50px 32px 50px; margin:0 auto 36px auto; box-shadow:0 4px 20px rgba(0,0,0,0.22); box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; position:relative;">
            <div class="iso-a4-sheet-content">
              <h1 id="heading-iso-rev-log" class="iso-doc-heading level-1" style="font-size:18pt; font-weight:bold; font-family:'Times New Roman', serif; text-transform:uppercase; margin:0 0 20px 0; color:#0D0D0D; text-align:center; letter-spacing:0.5px;">
                THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
              </h1>
              <table class="iso-rev-table" style="width:100%; border-collapse:collapse; table-layout:fixed; border:1.5px solid #000000; background:#FFFFFF;">
                <colgroup>
                  <col style="width:12.5%;" />
                  <col style="width:14.3%;" />
                  <col style="width:50.3%;" />
                  <col style="width:22.9%;" />
                </colgroup>
                <thead>
                  <tr style="height:36px; background:#FFFFFF;">
                    <th style="border:1px solid #000000; padding:6px 8px; text-align:center; font-size:13pt; font-weight:bold; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">Số TT</th>
                    <th style="border:1px solid #000000; padding:6px 8px; text-align:center; font-size:13pt; font-weight:bold; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">Ngày Sửa</th>
                    <th style="border:1px solid #000000; padding:6px 8px; text-align:center; font-size:13pt; font-weight:bold; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">Nội Dung Sửa Đổi</th>
                    <th style="border:1px solid #000000; padding:6px 8px; text-align:center; font-size:13pt; font-weight:bold; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">Trang Số</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyRows.join('')}
                </tbody>
              </table>
            </div>
            <div class="iso-a4-sheet-footer" style="border-top:1px solid #000000; padding-top:6px; margin-top:20px; display:flex; justify-content:space-between; font-family:'Times New Roman', serif; font-size:10pt; font-style:italic; color:#0D0D0D;">
              <span>Mã hiệu: ${docCode}</span>
              <span>Ngày ban hành: ${issueDate}</span>
              <span>Lần ban hành: ${version}</span>
              <span>Trang 2</span>
            </div>
          </div>
        `;

        return `${coverPage}\n${revPage}`;
      };

      // Hàm gọi API lấy 2 trang gốc hoặc dùng fallback A4 chuẩn
      const fetchOriginal2Pages = async () => {
        try {
          const tplRes = await api.get('/iso-master-records/template-original-2-pages', {
            params: {
              doc_title: cleanTitle,
              issuer: issuer,
              approver: approver,
              doc_code: docCode,
              issue_date: issueDate,
              version: version,
              dept_name: deptName,
              revision_logs: JSON.stringify(formData.revision_logs || []),
              _t: Date.now()
            }
          });
          const tplData = tplRes?.data || tplRes;
          if (tplData && tplData.success && tplData.full_2_pages_html) {
            let tplHtml = tplData.full_2_pages_html;
            if (tplHtml.includes('/vina_g7_logo.png')) {
              tplHtml = tplHtml.replaceAll('/vina_g7_logo.png', logoCty);
            }
            return sanitizePlaceholders(tplHtml);
          }
        } catch (eTpl) {
          console.warn('Lỗi gọi API template 2 trang gốc, chuyển sang dùng HTML gốc dự phòng:', eTpl);
        }
        return sanitizePlaceholders(buildFallback2Pages());
      };

      // 0. Nếu đã có bản HTML lưu trực tiếp trước đó
      if (formData.sections && formData.sections.__full_html__) {
        if (wordEditorRef.current) {
          let savedHtml = formData.sections.__full_html__;
          if (savedHtml.includes('/vina_g7_logo.png')) {
            savedHtml = savedHtml.replaceAll('/vina_g7_logo.png', logoCty);
          }

          // Tự động nâng cấp bảng lưu đồ cũ hoặc bảng Word thô sang bảng lưu đồ mới dạng SVG chuẩn ISO
          if (formData.steps && formData.steps.length > 0) {
            savedHtml = replaceFlowchartInHtml(savedHtml, formData.steps);
          }
          savedHtml = replaceRelatedFormsInHtml(savedHtml);

          // Nếu bản lưu HTML cũ chưa có tờ A4 (.iso-a4-sheet):
          // Phân trang và thay thế 2 trang đầu bằng 2 trang template A4 chuẩn mới
          if (!savedHtml.includes('iso-a4-sheet')) {
            let bodyContent = '';
            const heading1Pos = savedHtml.search(/(?:<h[1-4][^>]*>|<p[^>]*>\s*(?:<[^>]+>\s*)*)\s*(?:1\s*[\.\:\-]|Mục đích)/i);
            if (heading1Pos > 0) {
              bodyContent = savedHtml.substring(heading1Pos);
            } else {
              const pages = savedHtml.split(/<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>/i);
              if (pages.length >= 3) {
                bodyContent = pages.slice(2).join('<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>');
              } else {
                const splitMatch = savedHtml.match(/THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU[\s\S]*?<\/table>[\s\S]*?(?:<\/div>)*\s*(?:<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>)?([\s\S]*)$/i);
                if (splitMatch && splitMatch[1] && splitMatch[1].replace(/<[^>]*>/g, '').trim().length > 10) {
                  bodyContent = splitMatch[1];
                }
              }
            }
            bodyContent = bodyContent.replace(/^(?:\s*<\/div>\s*)+/i, '').replace(/^(?:\s*<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>\s*)+/i, '').trim();

            const twoPages = await fetchOriginal2Pages();
            if (bodyContent.trim()) {
              bodyContent = replaceRelatedFormsInHtml(bodyContent);
              const bodySheets = buildSheetsFromBodyHtml(bodyContent, 3);
              savedHtml = `${twoPages}\n${bodySheets}`;
            } else {
              savedHtml = twoPages;
            }
          }

          // Đồng bộ bảng THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU trên Trang 2 theo revision_logs mới nhất
          if (formData.revision_logs && formData.revision_logs.length > 0) {
            const revLogs = formData.revision_logs;
            const totalRowsCount = 22;
            const tbodyRows = [];
            for (let rIdx = 0; rIdx < totalRowsCount; rIdx++) {
              const isLast = (rIdx === totalRowsCount - 1);
              const bBorder = isLast ? '1.5px solid #000000' : '1px dotted #000000';
              if (rIdx < revLogs.length) {
                const item = revLogs[rIdx];
                const seqVal = String(item.seq_no || (rIdx + 1)).padStart(2, '0');
                const dateVal = item.rev_date || issueDate;
                const contentVal = item.content || 'Ban hành lần đầu';
                const pageVal = item.page_no || 'Toàn bộ';
                tbodyRows.push(`
                  <tr style="height:32px; background:#FFFFFF;">
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${seqVal}</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${dateVal}</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 8px; text-align:left; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${contentVal}</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; font-size:11pt; font-family:'Times New Roman', serif; color:#0D0D0D; background:#FFFFFF;">${pageVal}</td>
                  </tr>
                `);
              } else {
                tbodyRows.push(`
                  <tr style="height:32px; background:#FFFFFF;">
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 8px; background:#FFFFFF;">&nbsp;</td>
                    <td style="border-left:1px solid #000000; border-right:1px solid #000000; border-bottom:${bBorder}; border-top:none; padding:4px 6px; text-align:center; background:#FFFFFF;">&nbsp;</td>
                  </tr>
                `);
              }
            }
            if (/THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU/i.test(savedHtml)) {
              savedHtml = savedHtml.replace(
                /(THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU[\s\S]*?<table[^>]*>[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/i,
                `$1${tbodyRows.join('')}$2`
              );
            }
          }

          savedHtml = sanitizePlaceholders(savedHtml);
          if (wordEditorRef.current) {
            wordEditorRef.current.innerHTML = savedHtml;
            setIsWordEditorDirty(false);
            setTimeout(() => {
              reindexAllSheetFooters();
              updateDocHeadings();
            }, 150);
          }
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

              // Tự động nâng cấp bảng lưu đồ 5.1 sang bảng lưu đồ mới dạng SVG chuẩn ISO có nút Chỉnh sửa
              if (formData.steps && formData.steps.length > 0) {
                processedHtml = replaceFlowchartInHtml(processedHtml, formData.steps);
              }
              processedHtml = replaceRelatedFormsInHtml(processedHtml);

              // QUAN TRỌNG: Phân trang tệp Word thành các tờ .iso-a4-sheet chuẩn 1123px có đầy đủ header/footer
              if (!processedHtml.includes('iso-a4-sheet')) {
                let bodyContent = '';
                const heading1Pos = processedHtml.search(/(?:<h[1-4][^>]*>|<p[^>]*>\s*(?:<[^>]+>\s*)*)\s*(?:1\s*[\.\:\-]|Mục đích)/i);
                if (heading1Pos > 0) {
                  bodyContent = processedHtml.substring(heading1Pos);
                } else {
                  const pages = processedHtml.split(/<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>/i);
                  if (pages.length >= 3) {
                    bodyContent = pages.slice(2).join('<div class="iso-doc-page-break-divider"><span>--- Ngắt trang ---</span></div>');
                  } else {
                    const splitMatch = processedHtml.match(/THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU[\s\S]*?<\/table>[\s\S]*?(?:<\/div>)*\s*(?:<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>)?([\s\S]*)$/i);
                    if (splitMatch && splitMatch[1] && splitMatch[1].replace(/<[^>]*>/g, '').trim().length > 10) {
                      bodyContent = splitMatch[1];
                    }
                  }
                }
                bodyContent = bodyContent.replace(/^(?:\s*<\/div>\s*)+/i, '').replace(/^(?:\s*<div class="iso-doc-page-break-divider">[\s\S]*?<\/div>\s*)+/i, '').trim();

                const twoPages = await fetchOriginal2Pages();
                if (bodyContent.trim()) {
                  bodyContent = replaceRelatedFormsInHtml(bodyContent);
                  const bodySheets = buildSheetsFromBodyHtml(bodyContent, 3);
                  processedHtml = `${twoPages}\n${bodySheets}`;
                } else {
                  processedHtml = twoPages;
                }
              }

              processedHtml = sanitizePlaceholders(processedHtml);
              if (wordEditorRef.current) {
                wordEditorRef.current.innerHTML = processedHtml;
                setIsWordEditorDirty(false);
                setTimeout(() => {
                  reindexAllSheetFooters();
                  updateDocHeadings();
                }, 150);
              }
            }
            setLoadingDoc(false);
            return;
          }
        } catch (_) {
          // File không tồn tại hoặc lỗi, tự động nạp 2 trang gốc chuẩn từ database
        }
      }

      // Lấy 2 trang gốc chuẩn A4 cắt từ Mẩu quy trình.docx
      const originalCoverAndRevHtml = await fetchOriginal2Pages();
      let combinedHtml = originalCoverAndRevHtml;

      // PHẦN 3: NỘI DUNG TRONG FILE
      // Chỉ lấy các sections thực sự có văn bản do người dùng soạn thảo
      const validSections = Object.entries(formData.sections || {}).filter(([secTitle, secContent]) => {
        if (secTitle.startsWith('__')) return false;
        if (!secContent) return false;
        const cleanText = String(secContent).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return cleanText.length > 0 && cleanText !== '(Chưa có nội dung)';
      });

      if (validSections.length > 0) {
        let secHtml = '';
        validSections.forEach(([secTitle, secContent], idx) => {
          let processedContent = secContent || '';
          if (/5\.\s*nội dung|nội dung/i.test(secTitle)) {
            if (!processedContent.includes('<table') && formData.steps && formData.steps.length > 0) {
              const tableHtml = buildFlowchartTableHtml(formData.steps || []);
              if (!/Bước\s*1\s*:/i.test(processedContent) && !/5\.2/i.test(processedContent)) {
                const detailedHtml = buildDetailedStepsHtml(formData.steps || []);
                processedContent = `${tableHtml}\n${detailedHtml}\n${processedContent}`;
              } else {
                if (/5\.1/i.test(processedContent)) {
                  processedContent = processedContent.replace(/(5\.1[^\n<]*<\/p>)/i, `$1\n${tableHtml}`);
                } else {
                  processedContent = `${tableHtml}\n${processedContent}`;
                }
              }
            }
          } else if (/6\.\s*biểu mẫu|biểu mẫu|hồ sơ/i.test(secTitle)) {
            if (!processedContent.includes('<table')) {
              processedContent = buildRelatedFormsTableHtml(processedContent);
            }
          }

          secHtml += `
            <h2 id="heading-sec-${idx + 1}" class="iso-doc-heading level-1" style="margin: 24px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; font-family: 'Times New Roman', Times, serif;">
              ${secTitle}
            </h2>
            <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
              ${processedContent}
            </div>
          `;
        });

        const bodySheets = buildSheetsFromBodyHtml(secHtml, 3);
        combinedHtml += `\n${bodySheets}`;
      } else if (formData.steps && formData.steps.length > 0) {
        // NẾU TÀI LIỆU CHƯA CÓ SECTIONS NHƯNG CÓ BƯỚC LƯU ĐỒ -> TỰ ĐỘNG TẠO MỤC 5 VÀ LƯU ĐỒ TRÊN TRANG 3
        const tableHtml = buildFlowchartTableHtml(formData.steps || []);
        const detailedHtml = buildDetailedStepsHtml(formData.steps || []);
        const sec5Html = `
          <div class="iso-doc-section-block" style="margin-top: 10px; font-family: 'Times New Roman', Times, serif;">
            <h2 id="heading-sec-5" class="iso-doc-heading level-1" style="margin: 10px 0 10px 0; font-size: 13pt; font-weight: bold; color: #1e293b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; font-family: 'Times New Roman', Times, serif;">
              5. Nội dung quy trình
            </h2>
            <div style="font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
              ${tableHtml}
              ${detailedHtml}
            </div>
          </div>
        `;
        const bodySheets = buildSheetsFromBodyHtml(sec5Html, 3);
        combinedHtml += `\n${bodySheets}`;
      }

      if (wordEditorRef.current) {
        wordEditorRef.current.innerHTML = combinedHtml;
        setIsWordEditorDirty(false);
        setTimeout(updateDocHeadings, 150);
      }

      hasLoadedDocRef.current = true;
      loadedDocKeyRef.current = currentDocKey;
    } catch (fatalErr) {
      console.error('Lỗi khi nạp tài liệu Word:', fatalErr);
    } finally {
      setLoadingDoc(false);
    }
  }, [
    formData.id, formData.file_path, formData.docx_path, formData.document_path,
    formData.name, formData.code, formData.new_code, formData.version,
    formData.issue_date, formData.department_name, formData.editor,
    formData.owner, formData.approver, updateDocHeadings,
    replaceFlowchartInHtml, replaceRelatedFormsInHtml, buildSheetsFromBodyHtml
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
      {editorEngine === 'canvas' ? (
        <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', height: '100%' }}>
          <CanvasISOEditor
            formData={formData}
            setFormData={setFormData}
            handleSaveForm={handleSaveForm}
            onOpenFlowchartModal={() => handleOpenFlowchartModal()}
            showFeedback={showFeedback}
          />
        </div>
      ) : (
        <>
          {/* 1. WORD RIBBON TOOLBAR (CHUẨN MICROSOFT WORD) */}
          <div className="iso-word-ribbon" style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
            {/* Nút Quay Lại Canvas Editor */}
            <div className="iso-ribbon-group">
              <button
                type="button"
                className="iso-ribbon-btn"
                onClick={() => setEditorEngine('canvas')}
                style={{
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  padding: '0 10px',
                  borderRadius: '4px'
                }}
                title="Bật lại Canvas Editor chuẩn A4"
              >
                ⚡ Bật Canvas Editor (Chuẩn A4)
              </button>
            </div>
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

        {/* Nhóm Nút Lưu đồ Quy trình: Luôn hiển thị cho phép Thêm mới hoặc Chỉnh sửa */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleOpenFlowchartModal()}
            title="Mở bảng vẽ và chỉnh sửa Lưu đồ Quy trình (Flowchart Canvas & Bảng bước)"
            style={{
              backgroundColor: '#FAF6F0',
              color: '#7B5233',
              border: validSteps.length > 0 ? '1.5px solid #7B5233' : '1.5px dashed #7B5233',
              fontWeight: 'bold',
              padding: '0 10px',
              gap: '6px'
            }}
          >
            <GitBranch size={13} />
            <span>{validSteps.length > 0 ? `Chỉnh sửa Lưu đồ (${validSteps.length})` : '+ Thêm lưu đồ'}</span>
          </button>
        </div>

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

        {/* Nhóm 4: Heading styles & Thêm mục */}
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

          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={handleAddNewSection}
            disabled={!isEditing}
            title="Thêm mục nội dung mới vào tài liệu"
            style={{
              backgroundColor: isEditing ? '#FAF6F0' : '#F9FAFB',
              color: isEditing ? '#7B5233' : '#9CA3AF',
              border: isEditing ? '1px dashed #7B5233' : '1px dashed #D1D5DB',
              fontWeight: 'bold',
              padding: '0 8px',
              gap: '4px',
              fontSize: '0.74rem'
            }}
          >
            <Plus size={13} />
            <span>Thêm mục</span>
          </button>
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

        {/* Nhóm 7: Chèn Bảng & Chèn Lưu đồ */}
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
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={() => handleOpenFlowchartModal()}
            title="Chèn hoặc chỉnh sửa Lưu đồ quy trình tại vị trí này"
          >
            <GitBranch size={14} />
            <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>Lưu đồ</span>
          </button>
        </div>

        {/* Nhóm 8: Quản lý Trang A4 & Ngắt trang (Page Break) */}
        <div className="iso-ribbon-group">
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={handleInsertPageBreak}
            title="Ngắt trang tại vị trí con trỏ (Ctrl + Enter)"
          >
            <Scissors size={14} />
            <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>Ngắt trang</span>
          </button>
          <button
            type="button"
            className="iso-ribbon-btn"
            onClick={handleAppendNewA4Page}
            title="Thêm một trang A4 trắng mới vào cuối tài liệu"
          >
            <Plus size={14} />
            <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>Thêm trang A4</span>
          </button>
        </div>

        {/* Nhóm Cập nhật từ Word (Giữ nguyên 2 trang đầu + gán nội dung file chọn) */}
        <div className="iso-ribbon-group">
          <input
            type="file"
            ref={wordUploadInputRef}
            accept=".docx,.doc"
            style={{ display: 'none' }}
            onChange={handleWordUploadLocal}
          />
          <button
            type="button"
            className="iso-ribbon-btn"
            disabled={wordUploading}
            onClick={() => wordUploadInputRef.current?.click()}
            title="Chọn file Word (.docx) để gán nội dung vào quy trình (Giữ nguyên 2 trang đầu)"
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#15803D',
              fontWeight: '600'
            }}
          >
            <RefreshCw
              size={13}
              color="#15803D"
              style={{ animation: wordUploading ? 'spin 1s linear infinite' : 'none' }}
            />
            <span style={{ fontSize: '0.74rem', marginLeft: '3px' }}>
              {wordUploading ? 'Đang đọc file Word...' : 'Cập nhật từ Word'}
            </span>
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
                      targetSectionRef.current = h.el;
                      if (h.el) {
                        // Reset any internal sheet scroll positions to 0 so header/row 1 are never hidden
                        if (wordEditorRef.current) {
                          const contents = wordEditorRef.current.querySelectorAll('.iso-a4-sheet-content');
                          contents.forEach(c => {
                            if (c.scrollTop !== 0) c.scrollTop = 0;
                            if (c.scrollLeft !== 0) c.scrollLeft = 0;
                          });
                        }
                        const ws = h.el.closest('.iso-word-workspace');
                        if (ws) {
                          const targetSheet = h.el.closest('.iso-a4-sheet') || h.el;
                          const wsRect = ws.getBoundingClientRect();
                          const targetRect = targetSheet.getBoundingClientRect();
                          const offset = targetRect.top - wsRect.top + ws.scrollTop - 20;
                          ws.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                        }
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '6px' }}
                    title={h.title}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.title}</span>
                    {h.id !== 'iso-heading-cover-page' && h.id !== 'heading-iso-rev-log' && (
                      <button
                        type="button"
                        className="iso-nav-item-flowchart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFlowchartModal(h.el);
                        }}
                        title={`Thêm / Sửa lưu đồ tại ${h.title}`}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          color: '#7B5233',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginLeft: '4px'
                        }}
                      >
                        <GitBranch size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Khổ giấy A4 Soạn thảo trực tiếp (Word Canvas & Khối Lưu đồ nếu file có lưu đồ) */}
        <div className="iso-word-workspace" style={{ position: 'relative' }}>
          {loadingDoc && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(250, 247, 242, 0.75)',
              backdropFilter: 'blur(2px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 30,
              color: '#7B5233'
            }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>Đang nạp tài liệu Word...</span>
            </div>
          )}

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
              className="iso-word-a4-page has-a4-sheets"
              ref={wordEditorRef}
              contentEditable={isEditing ? "true" : "false"}
              suppressContentEditableWarning={true}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={(e) => {
                detectCurrentBlockStyle();
                try {
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    let node = sel.anchorNode;
                    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
                    if (node && wordEditorRef.current?.contains(node)) {
                      const secBlock = node.closest('.iso-doc-section-block, .iso-flowchart-block-container, [id^="heading-sec-"]') || node.closest('.iso-a4-sheet-content');
                      if (secBlock) targetSectionRef.current = secBlock;
                    }
                  }
                } catch (_) {}
                triggerDebouncedHeadingsUpdate();
              }}
              onMouseUp={() => {
                detectCurrentBlockStyle();
                try {
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    let node = sel.anchorNode;
                    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
                    if (node && wordEditorRef.current?.contains(node)) {
                      const secBlock = node.closest('.iso-doc-section-block, .iso-flowchart-block-container, [id^="heading-sec-"]') || node.closest('.iso-a4-sheet-content');
                      if (secBlock) targetSectionRef.current = secBlock;
                    }
                  }
                } catch (_) {}
              }}
              onDoubleClick={(e) => {
                const target = e.target;
                if (target && target.closest('.iso-flowchart-block-container, .iso-flowchart-table, .iso-flowchart-edit-badge, [data-flowchart-block="true"]')) {
                  e.preventDefault();
                  handleOpenFlowchartModal();
                }
              }}
              onInput={() => {
                setIsWordEditorDirty(true);
                triggerDebouncedHeadingsUpdate();
              }}
              onPaste={() => {
                setIsWordEditorDirty(true);
                setTimeout(updateDocHeadings, 200);
              }}
              style={{
                fontFamily: wordEditorFont,
                transform: `scale(${wordEditorZoom / 100})`,
                transformOrigin: 'top center',
                cursor: isEditing ? 'text' : 'default'
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. STATUS BAR CHÂN TRANG */}
      <div className="iso-word-statusbar inline-statusbar">
        <div className="iso-word-status-left">
          <span>{isEditing ? (isWordEditorDirty ? '● Đang chỉnh sửa (Chưa lưu thay đổi)' : '● Chế độ chỉnh sửa') : '✓ Chế độ xem tài liệu'}</span>
          <span className="iso-word-status-sep">|</span>
          <span>Khổ A4 (210 x 297 mm) &bull; {totalSheetsCount} trang</span>
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
      </>
      )}

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
                    relatedTemplates={formData.related_templates || []}
                    onPositionsChange={handlePositionsChange}
                    onAddStep={handleAddStep}
                    onUpdateStep={handleUpdateStep}
                    onDeleteStep={handleRemoveStep}
                    onNodeSelect={handleNodeSelect}
                    selectedStepIdx={selectedStepIdx}
                    onOpenFormPicker={(stepIdx) => {
                      setFormPickerStepIdx(stepIdx);
                      setFormPickerSearch('');
                    }}
                    ref={flowchartCanvasRef}
                    height="100%"
                    style={{ height: '100%', border: 'none' }}
                  />
                </div>
              )}

              {activeModalTab === 'table' && (
                <div style={{ padding: '16px 20px', maxWidth: '1440px', margin: '0 auto', boxSizing: 'border-box' }}>
                  {/* Toolbar thông tin & thao tác nhanh */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    backgroundColor: '#FFFFFF',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
                        📋 Tổng số: <strong style={{ color: '#7B5233' }}>{(formData.steps || []).length} bước</strong>
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748B', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        {(formData.steps || []).filter(s => s.node_type !== 'decision' && s.node_type !== 'terminal').length} bước xử lý
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#B45309', backgroundColor: '#FEF3C7', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                        {(formData.steps || []).filter(s => s.node_type === 'decision').length} bước quyết định (rẽ nhánh)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowStepDetails(!showStepDetails)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: showStepDetails ? '#FAF6F0' : '#FFFFFF',
                          color: showStepDetails ? '#7B5233' : '#475569',
                          fontWeight: 'bold',
                          fontSize: '0.80rem',
                          cursor: 'pointer'
                        }}
                      >
                        {showStepDetails ? '🔽 Thu gọn Diễn giải Mục 5.2' : '▶️ Mở rộng Diễn giải Mục 5.2'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (handleAddStep) handleAddStep();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 14px',
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
                        <span>Thêm bước mới</span>
                      </button>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9', color: '#7B5233' }}>
                          <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>STT</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', width: '140px' }}>Loại hình khối</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '180px' }}>Tên bước thực hiện</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', width: '180px' }}>Bộ phận / Trách nhiệm</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', width: '220px' }}>Biểu mẫu / Hồ sơ</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', width: '150px' }}>Tiêu chuẩn / Viện dẫn</th>
                          <th style={{ padding: '10px 10px', textAlign: 'left', width: '240px' }}>Bước kế / Rẽ nhánh</th>
                          <th style={{ padding: '10px 6px', textAlign: 'center', width: '50px' }}>Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!formData.steps || formData.steps.length === 0) ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                              Chưa có bước nào trong quy trình. Nhấp "Thêm bước mới" bên dưới để bắt đầu.
                            </td>
                          </tr>
                        ) : (
                          formData.steps.map((step, idx) => {
                            const isDecision = step.node_type === 'decision';
                            const currentFailPath = (step.fail_path && step.fail_path.length > 0) ? step.fail_path[0] : null;
                            const returnToStep = currentFailPath?.return_to_step || Math.max(1, (step.step_number || idx + 1) - 1);
                            const edgeLabel = currentFailPath?.edge_label || 'K.Đạt';

                            return (
                              <React.Fragment key={step.id || idx}>
                                <tr style={{
                                  borderBottom: showStepDetails ? '1px dashed #E2E8F0' : '1px solid #F1F5F9',
                                  backgroundColor: isDecision ? '#FFFDF8' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                                  transition: 'background-color 0.15s ease'
                                }}>
                                  {/* Cột 1: STT & Sắp xếp lên / xuống */}
                                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.88rem' }}>
                                        {idx + 1}
                                      </span>
                                      <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => handleMoveStep(idx, idx - 1)}
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                            color: idx === 0 ? '#CBD5E1' : '#64748B',
                                            fontSize: '10px',
                                            padding: '0 2px'
                                          }}
                                          title="Di chuyển lên"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === (formData.steps || []).length - 1}
                                          onClick={() => handleMoveStep(idx, idx + 1)}
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            cursor: idx === (formData.steps || []).length - 1 ? 'not-allowed' : 'pointer',
                                            color: idx === (formData.steps || []).length - 1 ? '#CBD5E1' : '#64748B',
                                            fontSize: '10px',
                                            padding: '0 2px'
                                          }}
                                          title="Di chuyển xuống"
                                        >
                                          ▼
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Cột 2: Loại hình khối */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    <select
                                      value={step.node_type || 'task'}
                                      onChange={(e) => {
                                        const newType = e.target.value;
                                        handleUpdateStep(idx, 'node_type', newType);
                                        if (newType === 'decision') {
                                          handleUpdateStep(idx, 'has_branch', true);
                                          if (!step.fail_path || step.fail_path.length === 0) {
                                            handleUpdateStep(idx, 'fail_path', [{
                                              return_to_step: Math.max(1, idx),
                                              edge_label: 'K.Đạt'
                                            }]);
                                          }
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        height: '34px',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: isDecision ? '1.5px solid #F59E0B' : '1px solid #CBD5E1',
                                        fontSize: '0.80rem',
                                        fontWeight: isDecision ? 'bold' : 'normal',
                                        backgroundColor: isDecision ? '#FFFBEB' : '#FFFFFF',
                                        color: isDecision ? '#B45309' : '#334155',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <option value="task">▭ Bước Xử Lý</option>
                                      <option value="decision">◇ Quyết Định</option>
                                      <option value="terminal">⬭ Bắt đầu / K.Thúc</option>
                                    </select>
                                  </td>

                                  {/* Cột 3: Tên bước thực hiện */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    <input
                                      type="text"
                                      value={step.name || ''}
                                      onChange={(e) => handleUpdateStep(idx, 'name', e.target.value)}
                                      placeholder="Nhập tên bước thực hiện..."
                                      style={{
                                        width: '100%',
                                        height: '34px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '0.84rem',
                                        fontWeight: '600',
                                        color: '#1E293B',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </td>

                                  {/* Cột 4: Bộ phận / Trách nhiệm (gọn gàng, bỏ badges gợi ý) */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    <input
                                      type="text"
                                      list={`roles-list-${idx}`}
                                      value={step.assignee_role || ''}
                                      onChange={(e) => handleUpdateStep(idx, 'assignee_role', e.target.value)}
                                      placeholder="Chọn hoặc nhập phòng ban..."
                                      style={{
                                        width: '100%',
                                        height: '34px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '0.82rem',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <datalist id={`roles-list-${idx}`}>
                                      {availableRoles.map((r, rIdx) => (
                                        <option key={rIdx} value={r} />
                                      ))}
                                    </datalist>
                                  </td>

                                  {/* Cột 5: Biểu mẫu / Hồ sơ áp dụng (gộp 1 ô, nhấp vào mở popup CSDL) */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    <div
                                      onClick={() => {
                                        setFormPickerStepIdx(idx);
                                        setFormPickerSearch('');
                                      }}
                                      style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        width: '100%'
                                      }}
                                      title="Nhấp để tìm kiếm và chọn biểu mẫu từ CSDL"
                                    >
                                      <input
                                        type="text"
                                        readOnly
                                        value={step.template_files || ''}
                                        placeholder="BM-01, BM-02..."
                                        style={{
                                          width: '100%',
                                          height: '34px',
                                          padding: '4px 28px 4px 8px',
                                          borderRadius: '4px',
                                          border: '1px solid #CBD5E1',
                                          fontSize: '0.82rem',
                                          backgroundColor: '#FFFFFF',
                                          color: step.template_files ? '#1E293B' : '#94A3B8',
                                          cursor: 'pointer',
                                          boxSizing: 'border-box',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden'
                                        }}
                                      />
                                      <Search
                                        size={14}
                                        style={{
                                          position: 'absolute',
                                          right: '8px',
                                          color: '#7B5233',
                                          pointerEvents: 'none',
                                          opacity: 0.8
                                        }}
                                      />
                                    </div>
                                  </td>

                                  {/* Cột 6: Tiêu chuẩn kiểm soát / Viện dẫn */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    <input
                                      type="text"
                                      value={step.reference_docs || ''}
                                      onChange={(e) => handleUpdateStep(idx, 'reference_docs', e.target.value)}
                                      placeholder="ISO 9001, HĐKT..."
                                      style={{
                                        width: '100%',
                                        height: '34px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #CBD5E1',
                                        fontSize: '0.80rem',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  </td>

                                  {/* Cột 7: Bước kế tiếp / Rẽ nhánh (Hỗ trợ Quyết định) */}
                                  <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                                    {isDecision ? (
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px',
                                        backgroundColor: '#FFFFFF',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                      }}>
                                        {/* Nhánh Đạt (Thuận chiều) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 'bold',
                                            color: '#15803D',
                                            backgroundColor: '#DCFCE7',
                                            border: '1px solid #BBF7D0',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            minWidth: '40px',
                                            textAlign: 'center',
                                            flexShrink: 0
                                          }}>
                                            ✓ Đạt
                                          </span>
                                          <select
                                            value={step.transition?.next_step ?? ''}
                                            onChange={(e) => {
                                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                              handleUpdateStep(idx, 'transition', { ...(step.transition || {}), next_step: val });
                                            }}
                                            style={{
                                              flex: 1,
                                              minWidth: 0,
                                              height: '24px',
                                              padding: '0 4px',
                                              borderRadius: '3px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.76rem',
                                              backgroundColor: '#FFFFFF',
                                              color: '#1E293B',
                                              outline: 'none'
                                            }}
                                          >
                                            <option value="">(Tự động: Bước {idx + 2})</option>
                                            {formData.steps.map((s, sIdx) => (
                                              <option key={sIdx} value={sIdx + 1}>
                                                Bước {sIdx + 1}: {s.name ? (s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name) : `Bước ${sIdx + 1}`}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Nhánh Không Đạt (Lỗi / Quay lại) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 'bold',
                                            color: '#DC2626',
                                            backgroundColor: '#FEE2E2',
                                            border: '1px solid #FECACA',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            minWidth: '40px',
                                            textAlign: 'center',
                                            flexShrink: 0
                                          }}>
                                            ✕ Lỗi
                                          </span>
                                          <select
                                            value={returnToStep}
                                            onChange={(e) => {
                                              const target = parseInt(e.target.value, 10);
                                              const updatedFp = [{
                                                return_to_step: target,
                                                edge_label: edgeLabel
                                              }];
                                              handleUpdateStep(idx, 'fail_path', updatedFp);
                                              handleUpdateStep(idx, 'has_branch', true);
                                            }}
                                            style={{
                                              flex: 1,
                                              minWidth: 0,
                                              height: '24px',
                                              padding: '0 4px',
                                              borderRadius: '3px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.76rem',
                                              backgroundColor: '#FFFFFF',
                                              color: '#1E293B',
                                              outline: 'none'
                                            }}
                                          >
                                            {formData.steps.filter((_, sIdx) => sIdx < idx).map((s, sIdx) => (
                                              <option key={sIdx} value={sIdx + 1}>
                                                Quay lại B{sIdx + 1}: {s.name ? (s.name.length > 10 ? s.name.substring(0, 10) + '...' : s.name) : `Bước ${sIdx + 1}`}
                                              </option>
                                            ))}
                                            {idx === 0 && <option value="1">Quay lại B1</option>}
                                          </select>
                                          <input
                                            type="text"
                                            value={edgeLabel}
                                            onChange={(e) => {
                                              const updatedFp = [{
                                                return_to_step: returnToStep,
                                                edge_label: e.target.value
                                              }];
                                              handleUpdateStep(idx, 'fail_path', updatedFp);
                                              handleUpdateStep(idx, 'has_branch', true);
                                            }}
                                            placeholder="Nhãn"
                                            title="Nhãn nhánh lỗi (VD: K.Đạt, Làm lại)"
                                            style={{
                                              width: '46px',
                                              height: '24px',
                                              padding: '0 4px',
                                              borderRadius: '3px',
                                              border: '1px solid #CBD5E1',
                                              fontSize: '0.72rem',
                                              fontWeight: 'bold',
                                              textAlign: 'center',
                                              backgroundColor: '#F8FAFC',
                                              color: '#7B5233',
                                              outline: 'none',
                                              boxSizing: 'border-box',
                                              flexShrink: 0
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <select
                                        value={step.transition?.next_step ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                          handleUpdateStep(idx, 'transition', { ...(step.transition || {}), next_step: val });
                                        }}
                                        style={{ width: '100%', height: '34px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.80rem', backgroundColor: '#FFFFFF' }}
                                      >
                                        <option value="">(Tự động: Bước {idx + 2})</option>
                                        {formData.steps.map((s, sIdx) => (
                                          <option key={sIdx} value={sIdx + 1}>
                                            Bước {sIdx + 1}: {s.name ? (s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name) : `Bước ${sIdx + 1}`}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </td>

                                  {/* Cột 8: Xóa bước */}
                                  <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
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

                                {/* Hàng chi tiết: Diễn giải / Hướng dẫn thực hiện bước (Mục 5.2) */}
                                {showStepDetails && (
                                  <tr style={{ backgroundColor: '#FDFBF7', borderBottom: '1px solid #EADCC9' }}>
                                    <td colSpan={8} style={{ padding: '6px 14px 10px 24px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '0.73rem', fontWeight: 'bold', color: '#7B5233', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>📝 Diễn giải chi tiết / Hướng dẫn thực hiện Bước {idx + 1} (Mục 5.2):</span>
                                            {step.reference_docs && (
                                              <span style={{ fontSize: '0.70rem', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: '3px', textTransform: 'none', fontWeight: '600' }}>
                                                Tiêu chuẩn: {step.reference_docs}
                                              </span>
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const stepRole = step.assignee_role || "Bộ phận phụ trách";
                                              const stepName = step.name || `Bước ${idx + 1}`;
                                              const tpl = step.template_files || "---";
                                              const refDoc = step.reference_docs ? `\n• Tiêu chuẩn / Tài liệu viện dẫn: ${step.reference_docs}` : '';
                                              const defaultSample = `• Trách nhiệm thực hiện: ${stepRole}\n• Nội dung công việc: ${stepRole} chủ trì phối hợp với các bộ phận liên quan tiến hành ${stepName.toLowerCase()} theo đúng quy định, tiêu chuẩn kỹ thuật áp dụng.${refDoc}\n• Hồ sơ / Biểu mẫu kiểm soát áp dụng: ${tpl}`;
                                              handleUpdateStep(idx, "instructions", defaultSample);
                                            }}
                                            style={{
                                              fontSize: '0.70rem',
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              border: '1px solid #EADCC9',
                                              backgroundColor: '#FFFFFF',
                                              color: '#7B5233',
                                              cursor: 'pointer',
                                              fontWeight: 'bold',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                            }}
                                            title="Điền mẫu hướng dẫn gợi ý chuẩn ISO"
                                          >
                                            + Mẫu gợi ý chuẩn ISO
                                          </button>
                                        </div>
                                        <textarea
                                          rows={2}
                                          value={step.instructions ? (
                                            step.instructions.startsWith("<")
                                              ? step.instructions.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n').replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1').replace(/&nbsp;/g, ' ').trim()
                                              : step.instructions
                                          ) : ""}
                                          onChange={(e) => handleUpdateStep(idx, "instructions", e.target.value)}
                                          placeholder={`Nhập hướng dẫn chi tiết thực hiện cho Bước ${idx + 1}: trách nhiệm cụ thể, các thao tác bắt buộc, tiêu chuẩn nghiệm thu...`}
                                          style={{
                                            width: '100%',
                                            padding: '6px 10px',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '4px',
                                            fontSize: '0.82rem',
                                            fontFamily: "'Times New Roman', Times, serif",
                                            lineHeight: '1.4',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                            backgroundColor: '#FFFFFF'
                                          }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic' }}>
                        * Dữ liệu trong bảng này đồng bộ 1-1 với Canvas Lưu đồ và các trang văn bản Mục 5.1 & Mục 5.2.
                      </span>
                    </div>
                  </div>

                                  </div>
              )}

              {activeModalTab === 'preview' && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 16px', minHeight: '100%' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '32px 40px',
                    borderRadius: '4px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    width: '816px',
                    boxSizing: 'border-box'
                  }}>
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

{/* KHUNG MODAL TÌM KIẾM VÀ CHỌN BIỂU MẪU TỪ CSDL */}
                  {formPickerStepIdx !== null && (
                    <div style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 100000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        width: '580px',
                        maxWidth: '95vw',
                        maxHeight: '82vh',
                        borderRadius: '8px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}>
                        {/* Header Modal */}
                        <div style={{
                          padding: '12px 18px',
                          backgroundColor: '#FAF6F0',
                          borderBottom: '1px solid #EADCC9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="#7B5233" />
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.92rem', color: '#7B5233' }}>
                                Chọn Biểu mẫu cho Bước {formPickerStepIdx + 1}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                {formData.steps[formPickerStepIdx]?.name || `Bước ${formPickerStepIdx + 1}`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setFormPickerStepIdx(null); setFormPickerSearch(''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* Search Input Box */}
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              autoFocus
                              value={formPickerSearch}
                              onChange={(e) => setFormPickerSearch(e.target.value)}
                              placeholder="🔍 Nhập mã (VD: BM01, QT06...) hoặc tên biểu mẫu để tìm kiếm..."
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                paddingRight: '32px',
                                borderRadius: '6px',
                                border: '1.5px solid #CBD5E1',
                                fontSize: '0.86rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                            {formPickerSearch && (
                              <button
                                type="button"
                                onClick={() => setFormPickerSearch('')}
                                style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#94A3B8',
                                  padding: '4px'
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.74rem', color: '#64748B' }}>
                            <span>Tìm thấy <strong>{filteredPickerForms.length}</strong> tài liệu liên quan</span>
                            <span style={{ fontStyle: 'italic' }}>Nhấp vào từng dòng để chọn hoặc bỏ chọn</span>
                          </div>
                        </div>

                        {/* List items - Chỉ lấy từ Tài liệu liên quan của quy trình */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 18px', maxHeight: '420px' }}>
                          {(!formData.related_templates || formData.related_templates.length === 0) ? (
                            <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', margin: '10px 0' }}>
                              <div style={{ fontWeight: 'bold', color: '#7B5233', fontSize: '0.92rem', marginBottom: '8px' }}>
                                Chưa có tài liệu liên quan nào trong quy trình
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: '1.5', maxWidth: '440px', margin: '0 auto' }}>
                                Vui lòng chuyển sang Tab <strong>"Tài liệu liên quan"</strong> để thêm hoặc tải lên các biểu mẫu, hướng dẫn, phụ lục áp dụng cho quy trình này trước khi chọn vào bước lưu đồ.
                              </div>
                            </div>
                          ) : filteredPickerForms.length === 0 ? (
                            <div style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                              Không tìm thấy tài liệu liên quan nào khớp với từ khóa "{formPickerSearch}".
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{
                                fontSize: '0.74rem',
                                fontWeight: 'bold',
                                color: '#7B5233',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span>★ Danh sách tài liệu liên quan của quy trình ({filteredPickerForms.length})</span>
                              </div>
                              {filteredPickerForms.map((f, fIdx) => {
                                const isSelected = checkIsFormSelected(f, formData.steps[formPickerStepIdx]?.template_files || '');
                                const displayTitle = formatTemplateDisplay(f);
                                return (
                                  <div
                                    key={`rel_${fIdx}`}
                                    onClick={() => handleToggleFormForStep(formPickerStepIdx, f)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 14px',
                                      borderRadius: '6px',
                                      border: isSelected ? '1.5px solid #7B5233' : '1px solid #EADCC9',
                                      backgroundColor: isSelected ? '#FAF6F0' : '#FFFFFF',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1, paddingRight: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.88rem', color: isSelected ? '#7B5233' : '#1E293B', fontFamily: "'Times New Roman', Times, serif" }}>
                                          {displayTitle}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                                          Tab Tài liệu liên quan
                                        </span>
                                        {f.file_name && (
                                          <span style={{ fontSize: '0.65rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '3px', fontWeight: '500' }}>
                                            📎 {f.file_name}
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: "'Times New Roman', Times, serif" }}>
                                        {f.code ? <span>Mã hiệu: <strong>{f.code}</strong></span> : null}
                                        {f.storage_location ? <span> • Nơi lưu: {f.storage_location}</span> : null}
                                        {f.retention_period ? <span> • Thời hạn lưu: {f.retention_period}</span> : null}
                                      </span>
                                    </div>

                                    <div style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '4px',
                                      border: isSelected ? '2px solid #7B5233' : '1.5px solid #CBD5E1',
                                      backgroundColor: isSelected ? '#7B5233' : '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      {isSelected && <Check size={14} color="#FFFFFF" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                          padding: '10px 18px',
                          borderTop: '1px solid #E2E8F0',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748B', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Đã chọn: <strong style={{ color: '#7B5233' }}>{formData.steps[formPickerStepIdx]?.template_files || '(Chưa chọn)'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => { setFormPickerStepIdx(null); setFormPickerSearch(''); }}
                            style={{
                              padding: '6px 18px',
                              backgroundColor: '#7B5233',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '0.82rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
