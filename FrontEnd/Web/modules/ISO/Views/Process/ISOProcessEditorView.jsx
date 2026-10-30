import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import {
  ArrowLeft, Save, Plus, Trash2, Edit, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
  ListPlus, Settings, FileText, Activity, Download, Upload, HelpCircle, Eye,
  ZoomIn, ZoomOut, Maximize2, Columns
} from 'lucide-react';
import '@styles/components.css';
import '../MasterRecord/isoMasterRecord.css';
import RichTextEditor from './components/RichTextEditor';
import { FlowchartConnectors, renderCustomOutcomeNode } from './components/FlowchartConnectors';
import { removeDiacritics, isGenericNameText, cleanDocumentTitle, generateNextQTCode } from './utils/isoUtils';
import logoCty from './utils/logoCty';
import FlowchartTable, { generateFlowchartSvgHtml } from './FlowchartTable';
import ProcessContentTab from './components/ProcessContentTab';
import ProcessInstructionsTab from './components/ProcessInstructionsTab';
import ProcessTemplatesTab from './components/ProcessTemplatesTab';
import FlowchartCanvas from './FlowchartCanvas';
import ApprovalSignatureSection from '@modules/ISO/components/ApprovalSignatureSection';
import DocumentBottomSignatures from '@modules/ISO/components/DocumentBottomSignatures';
import ISORevisionLogModal from '@modules/ISO/components/ISORevisionLogModal';
import FaithfulPageViewer from './components/FaithfulPageViewer';
import OnlyOfficeEditorModal from './components/OnlyOfficeEditorModal';
import useUiStore from '@shared/store/uiStore';

const ISOProcessEditorView = () => {
  const { theme } = useUiStore();
  const isDark = theme === 'dark';

  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setCustomScreenCode = outletContext.setCustomScreenCode || (() => {});

  const location = useLocation();
  const isProcessMode = location.pathname.includes('/iso-processes');
  const routePath = isProcessMode ? '/admin/iso-processes/edit/:id' : '/admin/iso-documents/edit/:id';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);
  const navigate = useNavigate();
  const { id } = useParams();
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const backPath = isProcessMode ? '/admin/iso-processes' : '/admin/iso-documents';
  const isEditMode = id && id !== 'new';

  // Screen routing states: 'overview' (Màn hình 1), 'step_instructions' (Ảnh 4)
  const [currentScreen, setCurrentScreen] = useState('overview');
  const [activeTab, setActiveTab] = useState('content');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activeMenu, setActiveMenu] = useState('Mục đích');
  const [selectedStepIdx, setSelectedStepIdx] = useState(-1);
  const [flowchartMode, setFlowchartMode] = useState(() => {
    return localStorage.getItem('iso_flowchart_mode') || 'classic';
  });

  const flowchartCanvasRef = useRef(null);

  const handleSetFlowchartMode = (mode) => {
    setFlowchartMode(mode);
    localStorage.setItem('iso_flowchart_mode', mode);
  };

  const [infoExpanded, setInfoExpanded] = useState(true);
  const [selectedInstructionId, setSelectedInstructionId] = useState(null);

  // Danh sách tài liệu để điều hướng tới / lui bằng nút <> bên hông
  const [docList, setDocList] = useState([]);
  useEffect(() => {
    let isMounted = true;
    const fetchDocList = async () => {
      try {
        const url = isProcessMode ? '/iso-documents/processes' : '/iso-documents/';
        const res = await api.get(url);
        if (isMounted && Array.isArray(res)) {
          setDocList(res);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách tài liệu phục vụ điều hướng:', err);
      }
    };
    fetchDocList();
    return () => { isMounted = false; };
  }, [isProcessMode]);

  const currentIndex = useMemo(() => {
    if (!docList.length || !id || id === 'new') return -1;
    return docList.findIndex(d => String(d.id) === String(id));
  }, [docList, id]);

  const prevDoc = currentIndex > 0 ? docList[currentIndex - 1] : null;
  const nextDoc = currentIndex >= 0 && currentIndex < docList.length - 1 ? docList[currentIndex + 1] : null;

  const handleNavigateToDoc = useCallback((targetDoc) => {
    if (!targetDoc) return;
    setLoading(true);
    const targetPath = isProcessMode
      ? `/admin/iso-processes/edit/${targetDoc.id}`
      : `/admin/iso-documents/edit/${targetDoc.id}`;
    navigate(targetPath, { state: null });
  }, [isProcessMode, navigate]);

  // Phím tắt Alt + Mũi tên trái / phải
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowLeft' && prevDoc) {
        e.preventDefault();
        handleNavigateToDoc(prevDoc);
      } else if (e.altKey && e.key === 'ArrowRight' && nextDoc) {
        e.preventDefault();
        handleNavigateToDoc(nextDoc);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevDoc, nextDoc, handleNavigateToDoc]);
  const [showStepPopup, setShowStepPopup] = useState(false);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editingStepIdx, setEditingStepIdx] = useState(-1);
  const [stepForm, setStepForm] = useState({
    id: '',
    step_number: 1,
    name: '',
    note: '',
    standard: '',
    image_url: ''
  });
  // Accordion collapsed states - initialized to false (collapsed) by default
  const [stepsAccordionExpanded, setStepsAccordionExpanded] = useState(false);
  const [historyAccordionExpanded, setHistoryAccordionExpanded] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [liveExportHtml, setLiveExportHtml] = useState(null);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [pendingSaveOptions, setPendingSaveOptions] = useState(null);
  const [pageSelectOpen, setPageSelectOpen] = useState(false);
  const pageSelectRef = useRef(null);

  // States hỗ trợ xem & sửa Word gốc 100%
  const [showFaithfulViewer, setShowFaithfulViewer] = useState(false);
  const [showOnlyOfficeModal, setShowOnlyOfficeModal] = useState(false);
  const [faithfulPages, setFaithfulPages] = useState([]);
  const [applyIsoTemplate, setApplyIsoTemplate] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    new_code: '',
    name: '',
    symbol: '',
    department_id: null,
    department_name: '',
    doc_type_id: null,
    doc_type_code: '',
    editor: '',
    owner: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    approver_bgd: '',
    file_path: '',
    original_file_path: '',
    original_file_name: '',
    status: 'Hiệu lực',
    folder: '', // display_at
    doc_type: '', // note
    document_level: 'Cấp phòng',
    iso_document_id: '',
    iso_document_code: '',
    iso_document_name: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }
    ],
    revision_note: '',
    revision_page_no: 'Toàn bộ',
    sections: {},
    section_types: {},
    steps: [],
    instruction_steps: [],
    work_instructions: [],
    related_templates: [],
    inspection_guide_id: null,
    inspection_guide: null
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [docTypes, setDocTypes] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [approversData, setApproversData] = useState({ managers: [], default_bgd: 'Ban Giám Đốc' });
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [bgdList, setBgdList] = useState([]);

  const [systemScreens, setSystemScreens] = useState([]);
  const [isScreenDropdownOpen, setIsScreenDropdownOpen] = useState(false);

  // Lấy danh mục Loại hồ sơ từ CSDL
  useEffect(() => {
    const fetchDocTypes = async () => {
      try {
        const types = await api.get('/iso-documents/types');
        if (Array.isArray(types)) {
          setDocTypes(types);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh mục loại hồ sơ:', err);
      }
    };
    fetchDocTypes();
  }, []);

  // Lấy danh sách Người duyệt & Phòng ban từ CSDL
  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        const [appRes, deptRes, tpRes, bgdRes] = await Promise.all([
          api.get('/iso-documents/approvers-list').catch(() => null),
          api.get('/iso-documents/meta/departments').catch(() => null),
          api.get('/iso-documents/approvers/department-heads').catch(() => []),
          api.get('/iso-documents/approvers/bgd').catch(() => [])
        ]);
        if (appRes) {
          setApproversData({
            managers: appRes.managers || [],
            default_bgd: appRes.default_bgd || 'Ban Giám Đốc'
          });
        }
        if (Array.isArray(tpRes) && tpRes.length > 0) {
          setDepartmentHeads(tpRes);
        }
        if (Array.isArray(bgdRes) && bgdRes.length > 0) {
          setBgdList(bgdRes);
        }
        const cleanDepts = (Array.isArray(deptRes) && deptRes.length > 0)
          ? deptRes
          : (Array.isArray(appRes?.departments) ? appRes.departments : []);
        setDepartmentsList(cleanDepts);
      } catch (err) {
        console.error('Lỗi khi tải danh sách người duyệt và phòng ban:', err);
      }
    };
    fetchApprovers();
  }, []);

  // Danh mục phòng ban lấy hoàn toàn từ CSDL (bảng roles)
  const allDepartmentOptions = useMemo(() => {
    const list = Array.isArray(departmentsList) ? [...departmentsList] : [];
    if (formData.department_name) {
      const exists = list.some(d => (typeof d === 'string' ? d : d.name) === formData.department_name);
      if (!exists) {
        list.unshift({
          id: formData.department_id || null,
          name: formData.department_name,
          code: formData.department_name.toUpperCase()
        });
      }
    }
    return list;
  }, [departmentsList, formData.department_name, formData.department_id]);

  // Hàm chuyển đổi tên phòng ban thành ký tự viết tắt (lấy trực tiếp từ DB)
  const getDepartmentAcronym = useCallback((deptName) => {
    if (!deptName) return 'QLCL';
    const found = (departmentsList || []).find(d => 
      typeof d === 'object' && d !== null && (d.name === deptName || d.code === deptName || String(d.id) === String(deptName))
    );
    if (found && found.code) {
      return found.code.trim().toUpperCase();
    }
    const upper = (deptName || '').toUpperCase();
    if (upper.includes('ISO')) return 'ISO';
    if (upper.includes('QLCL') || upper.includes('CHẤT LƯỢNG')) return 'QLCL';
    if (upper.includes('SẢN XUẤT') || upper.includes('SX')) return 'SX';
    if (upper.includes('HÀNH CHÍNH') || upper.includes('NHÂN SỰ') || upper.includes('HCNS') || upper.includes('C&B')) return 'HCNS';
    if (upper.includes('KỸ THUẬT') || upper.includes('CƠ ĐIỆN')) return 'KT';
    if (upper.includes('KẾ TOÁN')) return 'KT';
    if (upper.includes('MUA HÀNG') || upper.includes('NLVT') || upper.includes('VẬT TƯ')) return 'MH';
    if (upper.includes('KHO')) return 'KH';
    if (upper.includes('GIÁM ĐỐC') || upper.includes('BGD')) return 'BGD';
    if (upper.includes('IT')) return 'IT';
    
    const words = removeDiacritics(deptName || '').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words.map(w => w[0]).join('').toUpperCase();
    } else if (words.length === 1) {
      return words[0].toUpperCase();
    }
    return 'QLCL';
  }, [departmentsList]);

  // Hàm gợi ý mã mới G7.xx.yy.zz (Key duy nhất từ CSDL)
  const generateNewCodeSuggest = useCallback(async (deptName, typeCode) => {
    const deptAcronym = getDepartmentAcronym(deptName);
    const docTypeAcr = (typeCode || 'QT').trim().toUpperCase();
    try {
      const excludeParam = (id && id !== 'new') ? `&exclude_id=${id}` : '';
      const res = await api.get(`/iso-documents/processes/next-code?department_code=${deptAcronym}&doc_type_code=${docTypeAcr}${excludeParam}`);
      if (res && res.next_code) {
        return res.next_code;
      }
    } catch (err) {
      console.error('Lỗi khi lấy mã mới tiếp theo:', err);
    }
    return `G7.${deptAcronym}.${docTypeAcr}.01`;
  }, [getDepartmentAcronym, id]);

  // Xử lý đổi Phòng ban
  const handleDepartmentChange = async (selectedVal) => {
    const matchedDept = (allDepartmentOptions || []).find(d => 
      typeof d === 'object' && d !== null && (String(d.id) === String(selectedVal) || d.name === selectedVal)
    );

    const deptName = matchedDept ? matchedDept.name : selectedVal;
    const deptId = matchedDept ? matchedDept.id : null;

    setFormData(prev => ({
      ...prev,
      department_id: deptId,
      department_name: deptName
    }));

    if ((formData.document_level || 'Cấp phòng') === 'Cấp phòng') {
      const deptUpper = deptName.toUpperCase();
      const matchedMgr = (approversData.managers || []).find(m => {
        const mgrDeptUpper = (m.department || '').toUpperCase();
        return mgrDeptUpper && (deptUpper.includes(mgrDeptUpper) || mgrDeptUpper.includes(deptUpper));
      }) || (departmentHeads.find(d => {
        const dUpper = (d.department_name || d.role_name || '').toUpperCase();
        return dUpper && (deptUpper.includes(dUpper) || dUpper.includes(deptUpper));
      })) || (departmentHeads.length > 0 ? departmentHeads[0] : null);

      if (matchedMgr) {
        setFormData(prev => ({ ...prev, approver: matchedMgr.full_name || matchedMgr.name }));
      }
    }

    const currentDocTypeCode = formData.doc_type_code || (docTypes.find(dt => String(dt.id) === String(formData.doc_type_id))?.code) || 'QT';
    const nextCode = await generateNewCodeSuggest(deptName, currentDocTypeCode);
    setFormData(prev => ({
      ...prev,
      new_code: nextCode
    }));
  };

  // Xử lý đổi Loại hồ sơ
  const handleDocTypeChange = async (selectedTypeId) => {
    const typeObj = docTypes.find(dt => String(dt.id) === String(selectedTypeId));
    const typeCode = typeObj ? typeObj.code : '';
    setFormData(prev => ({
      ...prev,
      doc_type_id: selectedTypeId ? parseInt(selectedTypeId, 10) : null,
      doc_type_code: typeCode
    }));

    const currentDept = formData.department_name || '';
    const nextCode = await generateNewCodeSuggest(currentDept, typeCode || 'QT');
    setFormData(prev => ({
      ...prev,
      new_code: nextCode
    }));
  };

  // Xử lý đổi Cấp tài liệu (Cấp phòng / Cấp công ty)
  const handleDocumentLevelChange = (newLevel) => {
    let approverName = formData.approver;
    let approverBgdName = formData.approver_bgd;

    // Trưởng phòng xem xét / phê duyệt cấp phòng
    if (!approverName || approverName === 'Ban Giám Đốc') {
      const deptUpper = (formData.department_name || '').toUpperCase();
      const matchedMgr = (approversData.managers || []).find(m => {
        const mgrDeptUpper = (m.department || '').toUpperCase();
        return mgrDeptUpper && (deptUpper.includes(mgrDeptUpper) || mgrDeptUpper.includes(deptUpper));
      }) || (departmentHeads.length > 0 ? departmentHeads[0] : null);
      approverName = matchedMgr ? (matchedMgr.full_name || matchedMgr.name) : 'Đặng Văn Nam';
    }

    if (newLevel === 'Cấp công ty') {
      if (!approverBgdName || approverBgdName === approverName) {
        approverBgdName = bgdList.length > 0 ? bgdList[0].full_name : (approversData.default_bgd || 'Nguyễn Hòa');
      }
    } else {
      approverBgdName = '';
    }

    setFormData(prev => ({
      ...prev,
      document_level: newLevel,
      approver: approverName,
      approver_bgd: approverBgdName
    }));
  };

  // Tính lại mã mới G7.xx.yy.zz theo phòng ban & loại hồ sơ
  const handleRegenerateNewCode = async () => {
    const typeCode = formData.doc_type_code || (docTypes.find(dt => dt.id === formData.doc_type_id)?.code) || 'QT';
    const nextCode = await generateNewCodeSuggest(formData.department_name || '', typeCode);
    setFormData(prev => ({
      ...prev,
      new_code: nextCode
    }));
    showFeedback('info', `Đã cập nhật mã mới: ${nextCode}`);
  };

  // Đồng bộ lại nội dung trực tiếp từ file gốc trên máy chủ
  const handleSyncFromFile = async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const res = await api.post(`/iso-documents/processes/${id}/sync-from-file`);
      showFeedback('success', res.message || 'Đã đọc và cập nhật nội dung từ file gốc thành công!');
      await fetchDocDetails();
    } catch (err) {
      console.error('Lỗi khi đọc file gốc:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể đồng bộ nội dung từ file gốc');
    } finally {
      setLoading(false);
    }
  };

  // States for Related Templates
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [showSystemTemplatesModal, setShowSystemTemplatesModal] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [searchTemplateQuery, setSearchTemplateQuery] = useState('');
  const [systemTemplatesFilterOpen, setSystemTemplatesFilterOpen] = useState(false);
  const [systemTemplatesDepartmentFilter, setSystemTemplatesDepartmentFilter] = useState('');

  useEffect(() => {
    if (showSystemTemplatesModal) {
      const fetchSystemTemplates = async () => {
        try {
          const data = await api.get('/iso-documents');
          setSystemTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Lỗi khi tải danh sách tài liệu hệ thống:', err);
        }
      };
      fetchSystemTemplates();
    }
  }, [showSystemTemplatesModal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pageSelectRef.current && !pageSelectRef.current.contains(event.target)) {
        setPageSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [tempCheckedIds, setTempCheckedIds] = useState([]);

  const handleUploadAttachment = async (e, templateId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    showFeedback('info', 'Đang tải lên tài liệu đính kèm...');
    try {
      const res = await api.post('/iso-documents/upload-attachment', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFormData(prev => ({
        ...prev,
        related_templates: (prev.related_templates || []).map(t => {
          if (t.id === templateId) {
            return {
              ...t,
              file_name: res.file_name || file.name,
              original_file_name: res.file_name || file.name,
              file_path: res.file_path
            };
          }
          return t;
        })
      }));
      showFeedback('success', 'Tải lên tài liệu đính kèm thành công!');
    } catch (err) {
      console.error('Lỗi khi upload tài liệu đính kèm:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể tải lên tài liệu đính kèm');
    }
  };

  const handleDeleteAttachment = (templateId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          return {
            ...t,
            file_name: '',
            file_path: ''
          };
        }
        return t;
      })
    }));
    showFeedback('success', 'Đã xóa file đính kèm chính!');
  };

  const handleUploadChildFiles = async (e, templateId) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const formDataPay = new FormData();
    files.forEach(file => {
      formDataPay.append('files', file);
    });

    showFeedback('info', `Đang tải lên ${files.length} tệp con đính kèm...`);
    try {
      const res = await api.post('/iso-documents/upload-multiple-attachments', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newUploadedFiles = res.data?.files || res.files || [];
      if (!newUploadedFiles.length) {
        showFeedback('warning', 'Không có tệp con nào được tải lên hợp lệ.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        related_templates: (prev.related_templates || []).map(t => {
          if (t.id === templateId) {
            const currentSubFiles = Array.isArray(t.sub_files) ? [...t.sub_files] : [];
            return {
              ...t,
              sub_files: [...currentSubFiles, ...newUploadedFiles]
            };
          }
          return t;
        })
      }));
      showFeedback('success', `Đã tải lên thành công ${newUploadedFiles.length} tệp con đính kèm!`);
    } catch (err) {
      console.error('Lỗi khi upload tệp con đính kèm:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể tải lên tệp con đính kèm');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteChildFile = (templateId, childFileId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          const updatedSubFiles = (t.sub_files || []).filter(f => f.id !== childFileId);
          return {
            ...t,
            sub_files: updatedSubFiles
          };
        }
        return t;
      })
    }));
    showFeedback('success', 'Đã xóa tệp con đính kèm!');
  };

  const handleAddRelatedTemplate = () => {
    const newId = `template_${Date.now()}`;
    const nextIdx = (formData.related_templates || []).length + 1;
    const suffix = `BM${String(nextIdx).padStart(2, '0')}`;
    const procCode = formData.code ? formData.code.trim() : 'QT';
    const newT = {
      id: newId,
      code: `${procCode}-${suffix}`,
      title: `Biểu mẫu ${suffix}`,
      scope: 'Tất cả',
      note: '',
      file_name: '',
      file_path: '',
      sub_files: [],
      storage_location: formData.department_name || 'Ban Quản trị Chất lượng & ISO (QLCL)',
      retention_period: '03 năm'
    };
    setFormData(prev => ({
      ...prev,
      related_templates: [...(prev.related_templates || []), newT]
    }));
    setSelectedTemplateId(newId);
  };

  const handleDeleteRelatedTemplate = (templateId) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).filter(t => t.id !== templateId)
    }));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
    showFeedback('success', 'Đã xóa tài liệu liên quan!');
  };

  const handleUpdateRelatedTemplate = (templateId, field, value) => {
    setFormData(prev => ({
      ...prev,
      related_templates: (prev.related_templates || []).map(t => {
        if (t.id === templateId) {
          return {
            ...t,
            [field]: value
          };
        }
        return t;
      })
    }));
  };

  const handleOpenSystemTemplatesModal = () => {
    const checkedIds = systemTemplates
      .filter(st => (formData.related_templates || []).some(rt => rt.code === st.code))
      .map(st => st.id);

    setTempCheckedIds(checkedIds);
    setSearchTemplateQuery('');
    setSystemTemplatesDepartmentFilter('');
    setShowSystemTemplatesModal(true);
  };

  const handleUpdateSystemTemplates = () => {
    const checkedDocs = systemTemplates.filter(st => tempCheckedIds.includes(st.id));
    const currentList = [...(formData.related_templates || [])];
    const newList = [];

    checkedDocs.forEach(st => {
      const existing = currentList.find(rt => rt.code === st.code);
      if (existing) {
        newList.push(existing);
      } else {
        newList.push({
          id: `template_${Date.now()}_${st.id}`,
          code: st.code,
          title: st.name,
          scope: st.folder || 'Tất cả',
          note: st.notes || '',
          file_name: st.file_path ? st.file_path.split('/').pop() : '',
          file_path: st.file_path || ''
        });
      }
    });

    setFormData(prev => ({
      ...prev,
      related_templates: newList
    }));

    if (newList.length > 0) {
      if (!newList.some(t => t.id === selectedTemplateId)) {
        setSelectedTemplateId(newList[0].id);
      }
    } else {
      setSelectedTemplateId(null);
    }

    setShowSystemTemplatesModal(false);
    showFeedback('success', 'Đã cập nhật danh sách tài liệu liên quan!');
  };

  useEffect(() => {
    const fetchScreens = async () => {
      try {
        const data = await api.get('/screens');
        setSystemScreens(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách màn hình:', err);
      }
    };
    fetchScreens();
  }, []);

  const handleToggleScreen = (routePath) => {
    const currentList = formData.folder ? formData.folder.split(',').map(s => s.trim()).filter(Boolean) : [];
    let newList;
    if (currentList.includes(routePath)) {
      newList = currentList.filter(p => p !== routePath);
    } else {
      newList = [...currentList, routePath];
    }
    handleInputChange('folder', newList.join(', '));
  };

  // Get all sidestep numbers that are in a No-branch chain
  const getSidestepsInfo = () => {
    const sidesteps = new Set();
    const parentToChild = {};

    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum) {
          sidesteps.add(noStepNum);
          parentToChild[step.step_number] = noStepNum;

          let current = noStepNum;
          while (current) {
            const currStep = formData.steps.find(s => String(s.step_number) === String(current));
            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && String(next) !== String(current) && !formData.steps.some(s => String(s.step_number) === String(next) && s.node_type === 'decision')) {
              sidesteps.add(next);
              parentToChild[current] = next;
              current = next;
            } else {
              break;
            }
          }
        }
      }
    });
    return { sidesteps, parentToChild };
  };

  const { sidesteps: sidestepSet } = getSidestepsInfo();

  // Calculate maximum No-branch horizontal chain length to adjust canvas padding
  const getMaxLeftChainLength = () => {
    let maxLen = 0;
    (formData.steps || []).forEach(step => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;
        let len = 0;
        const visited = new Set();
        while (current && !visited.has(current)) {
          visited.add(current);
          len++;
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
          current = currStep?.transition?.next_step || currStep?.next_step;
        }
        if (len > maxLen) maxLen = len;
      }
    });
    return maxLen;
  };
  const maxLeftChainLength = getMaxLeftChainLength();

  const getStepDisplayLabels = () => {
    const labels = {};
    const mainSteps = (formData.steps || []).filter(s => !sidestepSet.has(s.step_number));

    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      labels[step.step_number] = `B${mainNum}`;
    });

    mainSteps.forEach((step, index) => {
      const mainNum = index + 1;
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        let current = failPath[0]?.return_to_step;

        // Use the parent decision step's main number (mainNum) as the prefix
        const prefixNum = mainNum;

        const visited = new Set();
        let subIdx = 1;
        while (current && !visited.has(current)) {
          visited.add(current);
          const currStep = formData.steps.find(s => String(s.step_number) === String(current));
          if (currStep) {
            labels[currStep.step_number] = `B${prefixNum}.${subIdx}`;
            subIdx++;
            current = currStep.transition?.next_step || currStep.next_step;
            if (mainSteps.some(ms => String(ms.step_number) === String(current))) {
              break;
            }
          } else {
            break;
          }
        }
      }
    });
    return labels;
  };

  const stepDisplayLabels = getStepDisplayLabels();

  // Handle drag-to-scroll (pan) in the flowchart viewport canvas
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click

    // Ignore interactive element clicks
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'button' || tagName === 'input' || tagName === 'select' || tagName === 'option' || e.target.closest('button')) {
      return;
    }

    const container = e.currentTarget;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';

    const startX = e.clientX;
    const startY = e.clientY;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      container.scrollLeft = scrollLeft - dx;
      container.scrollTop = scrollTop - dy;
    };

    const handleMouseUp = () => {
      container.style.cursor = 'grab';
      container.style.removeProperty('user-select');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Auto-synchronize default step names with their dynamic labels
  useEffect(() => {
    let changed = false;
    const newSteps = (formData.steps || []).map(step => {
      const label = stepDisplayLabels[step.step_number];
      if (label) {
        const cleanNum = label.substring(1); // e.g. "2.1"
        const expectedDefaultName = `Bước mới ${cleanNum}`;
        if (step.name && step.name.startsWith("Bước mới") && step.name !== expectedDefaultName) {
          changed = true;
          return { ...step, name: expectedDefaultName };
        }
      }
      return step;
    });
    if (changed) {
      setFormData(prev => ({ ...prev, steps: newSteps }));
    }
  }, [formData.steps, stepDisplayLabels]);

  const handleQuickTransitionChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
      if (val === 'new_step') {
        const nextStepNum = steps.length + 1;
        const newStep = {
          step_number: nextStepNum,
          name: `Bước mới ${nextStepNum}`,
          node_type: 'task',
          assignee_role: 'QC',
          transition: null,
          fail_path: []
        };
        steps.push(newStep);
        steps[index] = { ...steps[index], transition: { next_step: nextStepNum } };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        steps[index] = { ...steps[index], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...steps[index], transition: null };
        return { ...prev, steps };
      } else {
        steps[index] = { ...steps[index], transition: { next_step: parseInt(val) } };
        return { ...prev, steps };
      }
    });
  };

  const handleQuickFailPathChange = (index, val) => {
    setFormData(prev => {
      const steps = prev.steps.map(s => ({ ...s }));
      if (!steps[index]) return prev;
      const currentStep = steps[index];
      const failPath = [...getStepFailPath(currentStep)];
      if (val === 'new_step') {
        const nextStepNum = steps.length + 1;
        const newStep = {
          step_number: nextStepNum,
          name: `Bước mới ${nextStepNum}`,
          node_type: 'task',
          assignee_role: 'QC',
          transition: null,
          fail_path: []
        };
        steps.push(newStep);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Không đồng ý", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: nextStepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: nextStepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
        return { ...prev, steps };
      } else if (val === 'custom') {
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Hủy bỏ / Trả hàng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: null, node_type: "terminal" }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hủy bỏ / Trả hàng" } : { ...fp });
        }
        steps[index] = { ...currentStep, has_branch: true, fail_path: newFailPath };
        return { ...prev, steps };
      } else if (val === '') {
        steps[index] = { ...currentStep, fail_path: [], has_branch: false };
        return { ...prev, steps };
      } else {
        const stepNum = parseInt(val);
        let newFailPath;
        if (failPath.length === 0) {
          newFailPath = [{ name: "Xử lý lỗi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: stepNum }];
        } else {
          newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: stepNum } : { ...fp });
        }
        steps[index] = { ...currentStep, fail_path: newFailPath, has_branch: true };
        return { ...prev, steps };
      }
    });
  };

  // Helper to render a single step card UI cleanly
  const renderSingleStepCard = (step, idx) => {
    const isSelected = selectedStepIdx === idx;
    const isDecision = step.node_type === 'decision';
    const isCondition = step.node_type === 'condition';
    const isTerminal = step.node_type === 'terminal';

    let cardBg = 'white';
    let cardBorder = '1px solid #cbd5e1';
    let cardRadius = '6px';
    let cardPadding = '12px 16px';
    let shapeIcon = '📄';

    if (isTerminal) {
      cardBg = '#F0FDF4';
      cardBorder = '1.5px solid #16a34a';
      cardRadius = '24px';
      shapeIcon = '🏁';
    } else if (isDecision) {
      cardBg = '#FFFBEB';
      cardBorder = '1.5px solid #d97706';
      cardRadius = '8px';
      shapeIcon = '🔶';
    } else if (isCondition) {
      cardBg = '#FAF5FF';
      cardBorder = '1.5px solid #7c3aed';
      cardRadius = '8px';
      shapeIcon = '☶';
    }

    if (isDecision || isCondition) {
      const hasYes = step.transition && (step.transition.next_step !== null || step.transition.name);
      const hasNo = getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step !== null || getStepFailPath(step)[0].name);

      return (
        <div id={`step-card-${step.step_number}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Custom Outcome Cards (beside the diamond) */}
          {isDecision && getStepFailPath(step)[0] && (getStepFailPath(step)[0].return_to_step === null || getStepFailPath(step)[0].return_to_step === undefined) &&
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-fail`,
              getStepFailPath(step)[0].node_type || 'terminal',
              getStepFailPath(step)[0].name || 'Hủy bỏ',
              true
            )
          }

          {isDecision && step.transition && step.transition.next_step === null &&
            renderCustomOutcomeNode(
              `step-card-${step.step_number}-custom-yes`,
              step.transition.node_type || 'terminal',
              step.transition.name || 'Hoàn tất',
              false
            )
          }
          <div
            onClick={() => setSelectedStepIdx(idx)}
            style={{
              width: '150px',
              height: '150px',
              transform: 'rotate(45deg)',
              backgroundColor: isSelected ? '#FAF6F0' : cardBg,
              border: isSelected ? '2px solid #7B5233' : cardBorder,
              cursor: 'pointer',
              boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.15s ease',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '12px 0'
            }}
          >
            {/* Content rotated back -45deg */}
            <div style={{
              transform: 'rotate(-45deg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              width: '115px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.62rem', backgroundColor: isSelected ? '#7B5233' : (isDecision ? '#d97706' : '#7c3aed'), color: 'white', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
                {step.assignee_role && (
                  <span style={{ fontSize: '0.55rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
                )}
              </div>

              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#1e293b', lineBreak: 'anywhere', maxWidth: '106px' }}>
                {step.name}
              </div>

              {/* Validation Badges inside diamond */}
              {isDecision && !hasYes && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu Yes</span>
              )}
              {isDecision && !hasNo && (
                <span style={{ fontSize: '0.55rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Thiếu No</span>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
                style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginTop: '2px' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>

          {/* Quick Connection Controls for Decision */}
          {isDecision && (
            <div style={{ display: 'flex', gap: '8px', zIndex: 20, marginTop: '2px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#F0FDF4', border: '1px solid #b7ebc6', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Đúng:</span>
                <select
                  value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
                  onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #b7ebc6', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#FFF5F5', border: '1px solid #f8d7da', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem' }}>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Sai:</span>
                <select
                  value={getStepFailPath(step)[0]?.return_to_step === null && getStepFailPath(step)[0]?.name ? 'custom' : (getStepFailPath(step)[0]?.return_to_step || '')}
                  onChange={(e) => handleQuickFailPathChange(idx, e.target.value)}
                  style={{ padding: '1px', border: '1px solid #f8d7da', borderRadius: '3px', fontSize: '0.65rem', backgroundColor: 'white', maxWidth: '90px' }}
                >
                  <option value="">-- Hết --</option>
                  <option value="new_step">➕ Bước mới...</option>
                  <option value="custom">✍️ Tùy chỉnh...</option>
                  {formData.steps.map((s, sidx) => (
                    s.step_number !== step.step_number && (
                      <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                    )
                  ))}
                </select>
              </div>
            </div>
          )}

          {isCondition && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.68rem', color: '#7c3aed', fontWeight: 'bold', textAlign: 'center', marginTop: '-4px', marginBottom: '4px' }}>
              <div>➔ Nhánh 1: B3</div>
              <div>➔ Nhánh 2: B4</div>
            </div>
          )}
        </div>
      );
    } else {
      const hasNext = step.transition && (step.transition.next_step !== null || step.transition.name);
      const isLastStep = idx === formData.steps.length - 1;

      return (
        <div
          id={`step-card-${step.step_number}`}
          onClick={() => setSelectedStepIdx(idx)}
          style={{
            width: '240px',
            backgroundColor: isSelected ? '#FAF6F0' : cardBg,
            border: isSelected ? '2px solid #7B5233' : cardBorder,
            borderRadius: cardRadius,
            padding: cardPadding,
            cursor: 'pointer',
            boxShadow: isSelected ? '0 4px 12px rgba(123, 82, 51, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s ease',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem' }}>{shapeIcon}</span>
              <span style={{ fontSize: '0.7rem', backgroundColor: isSelected ? '#7B5233' : '#64748b', color: 'white', fontWeight: 'bold', padding: '1px 5px', borderRadius: '3px' }}>{stepDisplayLabels[step.step_number] || `B${step.step_number}`}</span>
              {step.assignee_role && (
                <span style={{ fontSize: '0.62rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>{step.assignee_role}</span>
              )}
            </div>

            {/* Validation Badge for Task */}
            {!hasNext && !isLastStep && (
              <span style={{ fontSize: '0.62rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>⚠️ Thiếu bước tiếp theo</span>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveStep(idx); }}
              style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#1e293b' }}>
            {step.name}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ color: '#7B5233', fontWeight: 'bold' }}>➔ Bước tiếp:</span>
            <select
              value={step.transition?.next_step === null ? 'custom' : (step.transition?.next_step || '')}
              onChange={(e) => handleQuickTransitionChange(idx, e.target.value)}
              style={{ flex: 1, padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.68rem', backgroundColor: 'white' }}
            >
              <option value="">-- Mặc định --</option>
              <option value="new_step">➕ Tạo bước mới...</option>
              <option value="custom">✍️ Tùy chỉnh...</option>
              {formData.steps.map((s, sidx) => (
                s.step_number !== step.step_number && (
                  <option key={sidx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                )
              ))}
            </select>
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    if (isProcessMode) {
      setCustomTitle(title);
      setCustomSubtitle(subtitle || (isEditMode ? 'Nhân sự - Chỉnh sửa Quy trình' : 'Nhân sự - Thêm mới Quy trình'));
      setCustomScreenCode(screenCode || (isEditMode ? 'AD55' : 'AD18'));
    } else {
      setCustomTitle(title);
      setCustomSubtitle(subtitle || (isEditMode ? 'Nhân sự - Chỉnh sửa Mẫu ISO' : 'Nhân sự - Thêm mới Mẫu ISO'));
      setCustomScreenCode(screenCode || (isEditMode ? 'AD17.1' : 'AD17'));
    }

    if (isEditMode) {
      fetchDocDetails();
    } else if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lấy nguyên danh sách sections từ parser – không thêm bớt
      const newSections = { ...(parsed.sections || {}) };
      const newSectionTypes = {};

      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      const rawName = (parsed.name || '').trim();
      const cleanedName = cleanDocumentTitle(rawName);
      const fileOldCode = (parsed.code || parsed.symbol || '').trim();

      generateNewCodeSuggest(formData.department_name || 'Quản Lý Chất Lượng', parsed.doc_type || 'QT').then(suggestedNewCode => {
        setFormData({
          id: null,
          code: fileOldCode,
          new_code: parsed.new_code || suggestedNewCode,
          name: cleanedName,
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          issuer: parsed.issuer || '',
          editor: loggedInUser.full_name || loggedInUser.username || '',
          approver: parsed.approver || '',
          owner: parsed.issuer || parsed.owner || '',
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiệu lực',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          revision_logs: parsed.revision_logs && parsed.revision_logs.length > 0 ? parsed.revision_logs : [
            { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Toàn bộ' }
          ],
          sections: {
            ...newSections,
            ...(parsed.html_content ? { '__full_html__': parsed.html_content } : {})
          },
          template_sections: newSections,
          section_types: newSectionTypes,
          steps: (parsed.steps || []).map(step => ({
            ...step,
            node_type: step.transition?.node_type || step.node_type || 'task',
            has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
            fail_path: step.transition?.fail_path || step.fail_path || [],
            image_url: step.transition?.image_url || ''
          })),
          instruction_steps: (parsed.steps || []).map((step, idx) => ({
            id: `inst_${Date.now()}_${idx}`,
            step_number: step.step_number || (idx + 1),
            name: step.name || '',
            image_url: step.transition?.image_url || step.image_url || ''
          })),
          work_instructions: [{
            id: `inst_${Date.now()}`,
            code: `${nextCode}-HD01`,
            title: 'Hướng dẫn thực hiện quy trình',
            scope: 'Tất cả',
            note: '',
            steps: (parsed.steps || []).map((step, idx) => ({
              id: `step_${Date.now()}_${idx}`,
              step_number: step.step_number || (idx + 1),
              name: step.name || '',
              image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
            }))
          }]
        });
      });
      showFeedback('success', 'Đã bóc tách tự động dữ liệu từ file Word thành công!');
    } else {
      generateNextQTCode(isProcessMode).then(nextCode => {
        setFormData(prev => ({
          ...prev,
          code: nextCode,
          new_code: nextCode
        }));
      });
    }
  }, [id, isProcessMode, isEditMode, title, subtitle, screenCode]);

  const getEffectiveFooterData = useCallback((data) => {
    const fData = data || formData || {};
    const rawCode = (fData.new_code || '').trim() || (fData.code || '').trim() || (fData.symbol || '').trim() || (formData?.new_code || '').trim() || (formData?.code || '').trim();
    const effCode = rawCode || 'G7.CL -QT01';
    const rawLogs = Array.isArray(fData.revision_logs) ? fData.revision_logs : [];
    const validLogs = rawLogs.filter(l => l && (l.content || l.rev_date || l.seq_no));

    let effVer = (fData.version || '01').trim();
    let effDate = (fData.issue_date || '').trim();

    if (validLogs.length > 0) {
      const seqNums = validLogs.map(l => Number(l.seq_no)).filter(n => !isNaN(n) && n > 0);
      const maxSeq = seqNums.length > 0 ? Math.max(...seqNums) : validLogs.length;
      effVer = String(maxSeq).padStart(2, '0');

      for (let i = validLogs.length - 1; i >= 0; i--) {
        const d = validLogs[i].rev_date;
        if (d && String(d).trim()) {
          effDate = String(d).trim();
          break;
        }
      }
    }

    if (/^\d+$/.test(effVer)) {
      effVer = effVer.padStart(2, '0');
    }

    if (!effDate) {
      effDate = (fData.issue_date || '15/10/2026').trim();
    }

    return { effCode, effVer, effDate };
  }, [formData]);

  const handleOpenPdfPreview = useCallback(() => {
    const { effCode, effVer, effDate } = getEffectiveFooterData(formData);

    // 1. Ưu tiên lấy trực tiếp các trang A4 đang hiển thị trên giao diện soạn thảo (WYSIWYG 100%)
    const editorEl = document.querySelector('.iso-word-a4-page');
    if (editorEl) {
      const sheets = Array.from(editorEl.querySelectorAll('.iso-a4-sheet'));
      if (sheets && sheets.length > 0) {
        const tempContainer = document.createElement('div');
        // Lọc ra các trang hợp lệ
        const validSheets = sheets.filter((sheet, idx) => {
          if (idx >= 2) {
            const content = sheet.querySelector('.iso-a4-sheet-content');
            if (content) {
              const text = (content.innerText || '').replace(/[\s\u00a0]+/g, ' ').trim();
              const hasMedia = content.querySelector('table, img, svg, canvas, iframe');
              if (text.length === 0 && !hasMedia && sheets.length > 3) {
                return false;
              }
            }
          }
          return true;
        });
        const totalValidPages = validSheets.length;
        let validPageCount = 0;
        validSheets.forEach((sheet, idx) => {
          const sheetClone = sheet.cloneNode(true);
          sheetClone.querySelectorAll('.iso-flowchart-edit-badge, .iso-nav-item-flowchart-btn, button').forEach(b => b.remove());
          validPageCount++;
          if (idx === 0) {
            const coverFooter = sheetClone.querySelector('.iso-a4-sheet-footer');
            if (coverFooter) coverFooter.style.display = 'none';
          } else {
            let footerEl = sheetClone.querySelector('.iso-a4-sheet-footer');
            if (!footerEl) {
              footerEl = document.createElement('div');
              footerEl.className = 'iso-a4-sheet-footer';
              sheetClone.appendChild(footerEl);
            }
            footerEl.style.cssText = 'height: 28px; min-height: 28px; border-top: 1px solid #000000; padding-top: 5px; margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-family: "Times New Roman", Times, serif; font-size: 10pt; color: #0D0D0D; user-select: none; box-sizing: border-box; width: 100%;';
            footerEl.innerHTML = `
              <span>Mã hiệu: ${effCode}</span>
              <span>Lần ban hành: ${effVer}</span>
              <span>Ngày ban hành: ${effDate}</span>
              <span class="iso-sheet-page-num">Trang: ${validPageCount}/${totalValidPages}</span>
            `;
          }
          tempContainer.appendChild(sheetClone);
        });
        setLiveExportHtml(tempContainer.innerHTML);
        setShowPdfPreview(true);
        return;
      }
    }

    // 2. Nếu chưa mount DOM nhưng đã có HTML đầy đủ lưu trong sections (__full_html__)
    const savedFullHtml = formData.sections?.['__full_html__'] || formData.sections?.['__full_document_html__'];
    if (savedFullHtml && savedFullHtml.includes('iso-a4-sheet')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(savedFullHtml, 'text/html');
      doc.querySelectorAll('.iso-flowchart-edit-badge, .iso-nav-item-flowchart-btn, button').forEach(b => b.remove());
      const sheets = Array.from(doc.querySelectorAll('.iso-a4-sheet'));
      const validSheets = sheets.filter((sheet, idx) => {
        if (idx >= 2) {
          const content = sheet.querySelector('.iso-a4-sheet-content');
          if (content) {
            const text = (content.innerText || '').replace(/[\s\u00a0]+/g, ' ').trim();
            const hasMedia = content.querySelector('table, img, svg, canvas, iframe');
            if (text.length === 0 && !hasMedia && sheets.length > 3) {
              sheet.remove();
              return false;
            }
          }
        }
        return true;
      });
      const totalValidPages = validSheets.length;
      let validPageCount = 0;
      validSheets.forEach((sheet, idx) => {
        validPageCount++;
        if (idx === 0) {
          const coverFooter = sheet.querySelector('.iso-a4-sheet-footer');
          if (coverFooter) coverFooter.style.display = 'none';
        } else {
          let footerEl = sheet.querySelector('.iso-a4-sheet-footer');
          if (!footerEl) {
            footerEl = doc.createElement('div');
            footerEl.className = 'iso-a4-sheet-footer';
            sheet.appendChild(footerEl);
          }
          footerEl.style.cssText = 'height: 28px; min-height: 28px; border-top: 1px solid #000000; padding-top: 5px; margin-top: 6px; display: flex; justify-content: space-between; align-items: center; font-family: "Times New Roman", Times, serif; font-size: 10pt; color: #0D0D0D; user-select: none; box-sizing: border-box; width: 100%;';
          footerEl.innerHTML = `
            <span>Mã hiệu: ${effCode}</span>
            <span>Lần ban hành: ${effVer}</span>
            <span>Ngày ban hành: ${effDate}</span>
            <span class="iso-sheet-page-num">Trang: ${validPageCount}/${totalValidPages}</span>
          `;
        }
      });
      setLiveExportHtml(doc.body.innerHTML);
      setShowPdfPreview(true);
      return;
    }

    // 3. Fallback: Dùng bộ dựng động nội bộ
    setLiveExportHtml(null);
    setShowPdfPreview(true);
  }, [formData, getEffectiveFooterData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('print') === 'true' && formData.id && !loading && !autoPrintTriggered) {
      handleOpenPdfPreview();
      setAutoPrintTriggered(true);
    }
  }, [location.search, formData.id, loading, autoPrintTriggered, handleOpenPdfPreview]);

  useEffect(() => {
    if (showPdfPreview && autoPrintTriggered) {
      const timer = setTimeout(() => {
        handlePrintPdf();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showPdfPreview, autoPrintTriggered]);

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const url = isProcessMode ? `/iso-documents/processes/${id}/details` : `/iso-documents/${id}/details`;
      const data = await api.get(url, { params: { _t: Date.now() } });

      const receivedSections = { ...(data.sections || {}) };
      let sectionTypes = {};

      if (receivedSections['__metadata_section_types__']) {
        try {
          sectionTypes = JSON.parse(receivedSections['__metadata_section_types__']);
        } catch (e) {
          console.error('Error parsing section types metadata:', e);
        }
        delete receivedSections['__metadata_section_types__'];
      }

      let instructionSteps = [];
      if (receivedSections['__metadata_instruction_steps__']) {
        try {
          instructionSteps = JSON.parse(receivedSections['__metadata_instruction_steps__']);
        } catch (e) {
          console.error('Error parsing instruction steps metadata:', e);
        }
        delete receivedSections['__metadata_instruction_steps__'];
      } else {
        instructionSteps = (data.steps || []).map((step, idx) => ({
          id: `inst_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_url: step.transition?.image_url || step.image_url || ''
        }));
      }

      let workInstructions = [];
      if (receivedSections['__metadata_work_instructions__']) {
        try {
          workInstructions = JSON.parse(receivedSections['__metadata_work_instructions__']);
        } catch (e) {
          console.error('Error parsing work instructions metadata:', e);
        }
        delete receivedSections['__metadata_work_instructions__'];
      } else {
        // Fallback: convert instructionSteps to workInstructions
        const convertedSteps = (instructionSteps && instructionSteps.length > 0 ? instructionSteps : (data.steps || [])).map((step, idx) => ({
          id: step.id || `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: step.image_urls || (step.image_url ? [step.image_url] : [])
        }));
        workInstructions = [{
          id: `inst_${Date.now()}`,
          title: 'Hướng dẫn thực hiện quy trình',
          steps: convertedSteps
        }];
      }

      let relatedTemplates = (data.related_templates && data.related_templates.length > 0) ? [...data.related_templates] : [];
      if (receivedSections['__metadata_related_templates__']) {
        try {
          const parsed = JSON.parse(receivedSections['__metadata_related_templates__']);
          if (Array.isArray(parsed) && parsed.length > 0) {
            relatedTemplates = parsed;
          }
        } catch (e) {
          console.error('Error parsing related templates metadata:', e);
        }
        delete receivedSections['__metadata_related_templates__'];
      }

      // Sections được lấy nguyên từ DB – không merge thêm key cố định

      // Tự động nhận diện Loại hồ sơ nếu data chưa có doc_type_id
      let resolvedDocTypeId = data.doc_type_id || null;
      let resolvedDocTypeCode = data.doc_type_code || '';
      if (!resolvedDocTypeId && docTypes && docTypes.length > 0) {
        const fullCodeUpper = (data.code || '').toUpperCase();
        const fullNameUpper = (data.name || '').toUpperCase();
        const matchedDt = docTypes.find(dt => 
          fullCodeUpper.includes(dt.code) || fullNameUpper.includes(dt.name.toUpperCase())
        );
        if (matchedDt) {
          resolvedDocTypeId = matchedDt.id;
          resolvedDocTypeCode = matchedDt.code;
        }
      }

      // Tự động sinh mã mới nếu chưa có hoặc đang là placeholder G7.xx.yy.zz hoặc mã cũ có IS/QL sai
      let initialNewCode = data.new_code || '';
      const dCode = getDepartmentAcronym(data.department_name);
      const tCode = (resolvedDocTypeCode || 'QT').trim().toUpperCase();

      const shouldRegen = !initialNewCode || 
        initialNewCode === 'G7.xx.yy.zz' || 
        initialNewCode.includes('xx') || 
        initialNewCode.includes('yy') || 
        initialNewCode.includes('.IS.') || 
        (dCode === 'ISO' && initialNewCode.includes('.QL.'));

      if (shouldRegen) {
        initialNewCode = await generateNewCodeSuggest(data.department_name, tCode);
      }

      // Sections: nếu section có văn bản thực tế thì mặc định là text, nếu không có chữ và có steps thì là flowchart
      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          const hasText = receivedSections[key] && receivedSections[key].replace(/<[^>]*>/g, '').trim().length > 0;
          if (hasText) {
            sectionTypes[key] = 'text';
          } else {
            sectionTypes[key] = ((key === 'Nội dung' || key === 'Lưu trình' || key === 'Lưu đồ') && isProcessMode && data.steps && data.steps.length > 0) ? 'flowchart' : 'text';
          }
        }
      });

      // Xác định người duyệt & người xem xét mặc định nếu quy trình chưa có
      let initialApprover = data.approver || '';
      if (!initialApprover) {
        initialApprover = 'Đặng Văn Nam';
      }

      let initialApproverBgd = data.approver_bgd || '';
      if (!initialApproverBgd && (data.document_level || 'Cấp phòng') === 'Cấp công ty') {
        initialApproverBgd = bgdList.length > 0 ? bgdList[0].full_name : 'Nguyễn Hòa';
      }

      setFormData({
        id: data.id,
        code: data.code || '',
        new_code: initialNewCode,
        name: data.name || '',
        symbol: data.symbol || '',
        department_id: data.department_id || null,
        department_name: data.department_name || '',
        doc_type_id: resolvedDocTypeId,
        doc_type_code: resolvedDocTypeCode,
        version: data.version || '01',
        issue_date: data.issue_date || '',
        issuer: data.issuer || '',
        approver: initialApprover,
        approver_bgd: initialApproverBgd,
        file_path: data.file_path || '',
        original_file_path: data.original_file_path || data.file_path || '',
        original_file_name: data.original_file_name || '',
        status: data.status || 'Hiệu lực',
        folder: data.folder || data.display_at || '',
        doc_type: data.doc_type || data.notes || '',
        document_level: data.document_level || 'Cấp phòng',
        revision_logs: data.revision_logs || [],
        iso_document_id: data.iso_document_id || '',
        iso_document_code: data.iso_document_code || '',
        iso_document_name: data.iso_document_name || '',
        owner: data.owner || data.editor || '',
        editor: data.editor || data.owner || '',
        sections: receivedSections,
        template_sections: data.template_sections || {},
        section_types: sectionTypes,
        steps: (data.steps || []).map(step => ({
          ...step,
          template_files: step.template_files || step.transition?.template_files || '',
          standard: step.standard || step.transition?.standard || '',
          node_type: step.transition?.node_type || step.node_type || 'task',
          has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
          fail_path: step.transition?.fail_path || step.fail_path || [],
          image_url: step.transition?.image_url || ''
        })),
        instruction_steps: instructionSteps,
        work_instructions: workInstructions,
        related_templates: relatedTemplates,
        inspection_guide_id: data.inspection_guide_id || null,
        inspection_guide: data.inspection_guide || null,
        revision_note: '',
        revision_page_no: 'Toàn bộ'
      });

      if (relatedTemplates && relatedTemplates.length > 0) {
        setSelectedTemplateId(relatedTemplates[0].id);
      }

      const validSecKeys = Object.keys(receivedSections).filter(k => !k.startsWith('__'));
      if (validSecKeys.length > 0 && (!activeMenu || !validSecKeys.includes(activeMenu))) {
        setActiveMenu(validSecKeys[0]);
      }
    } catch (error) {
      // Nếu 404 ở processes, thử kiểm tra bên documents
      if (error.response?.status === 404 && isProcessMode) {
        try {
          const fallbackData = await api.get(`/iso-documents/${id}/details`);
          if (fallbackData) {
            setFormData(prev => ({
              ...prev,
              ...fallbackData,
              id: fallbackData.id,
              name: fallbackData.name || fallbackData.document_name || prev.name,
              code: fallbackData.code || fallbackData.document_code || prev.code,
              file_path: fallbackData.file_path || prev.file_path
            }));
            return;
          }
        } catch (_) {}
      }

      console.warn('Quy trình ID chưa có trong CSDL, chuyển sang chế độ tạo mới:', id);
      showFeedback('info', `Quy trình #${id} chưa có trong hệ thống. Bạn có thể soạn thảo hoặc bấm "Cập nhật từ Word" để tạo mới.`);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 4500);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleWordUpload = async (eOrFile) => {
    let file = null;
    if (eOrFile && eOrFile.target && eOrFile.target.files) {
      file = eOrFile.target.files[0];
    } else if (eOrFile && (typeof eOrFile.arrayBuffer === 'function' || eOrFile.name || eOrFile.size !== undefined)) {
      file = eOrFile;
    }
    if (!file) return;

    const fileNameLower = file.name ? file.name.toLowerCase() : '';
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      return;
    }


    const formDataPay = new FormData();
    formDataPay.append('file', file);
    formDataPay.append('apply_iso_template', applyIsoTemplate ? 'true' : 'false');

    setUploadLoading(true);
    showFeedback('info', `Đang tải lên và kết xuất trung thực file "${file.name}"...`);

    try {
      const parsedData = await api.post('/iso-documents/upload', formDataPay, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newSections = parsedData.sections || {};
      const newSectionTypes = {};
      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsedData.section_types?.[key] || 'text';
      });

      if (parsedData.html_content) {
        newSections.__full_html__ = parsedData.html_content;
      }

      const nextCode = parsedData.code || formData.code || 'QT01';

      const stepsMapped = (parsedData.steps || []).map(step => ({
        ...step,
        node_type: step.transition?.node_type || step.node_type || 'task',
        has_branch: step.transition?.has_branch !== undefined ? step.transition.has_branch : (step.has_branch || false),
        fail_path: step.transition?.fail_path || step.fail_path || [],
        image_url: step.transition?.image_url || ''
      }));

      const instructionStepsMapped = (parsedData.steps || []).map((step, idx) => ({
        id: `inst_${Date.now()}_${idx}`,
        step_number: step.step_number || (idx + 1),
        name: step.name || '',
        image_url: step.transition?.image_url || step.image_url || ''
      }));

      const workInstructionsMapped = [{
        id: `inst_${Date.now()}`,
        code: `${nextCode}-HD01`,
        title: 'Hướng dẫn thực hiện quy trình',
        scope: 'Tất cả',
        note: '',
        steps: (parsedData.steps || []).map((step, idx) => ({
          id: `step_${Date.now()}_${idx}`,
          step_number: step.step_number || (idx + 1),
          name: step.name || '',
          image_urls: (step.transition?.image_url || step.image_url) ? [step.transition?.image_url || step.image_url] : []
        }))
      }];

      const returnedPages = parsedData.faithful_pages || [];
      if (returnedPages.length > 0) {
        setFaithfulPages(returnedPages);
      }

      const detectedDocTypeAcr = (parsedData.doc_type || 'QT').trim().toUpperCase();
      let detectedDocTypeId = formData.doc_type_id;
      let detectedDocTypeCode = formData.doc_type_code;
      if (docTypes && docTypes.length > 0) {
        const foundDt = docTypes.find(dt => 
          dt.code === detectedDocTypeAcr || 
          (parsedData.doc_type && dt.name.toLowerCase().includes(parsedData.doc_type.toLowerCase()))
        );
        if (foundDt) {
          detectedDocTypeId = foundDt.id;
          detectedDocTypeCode = foundDt.code;
        }
      }

      // Mã mới là Key duy nhất (k trùng)
      let updatedNewCode = parsedData.new_code || '';
      if (!updatedNewCode || updatedNewCode === 'G7.xx.yy.zz' || updatedNewCode.includes('xx') || updatedNewCode.includes('yy') || updatedNewCode.endsWith('.01')) {
        updatedNewCode = await generateNewCodeSuggest(formData.department_name || 'Quản Lý Chất Lượng', detectedDocTypeCode || detectedDocTypeAcr);
      }

      // Mã cũ: ăn theo file nguồn (hoặc tên file)
      const fileCode = (parsedData.code || parsedData.symbol || '').trim();

      // Tên tài liệu: làm sạch và ăn theo file nguồn
      const rawParsedName = (parsedData.name || '').trim();
      const cleanedParsedName = cleanDocumentTitle(rawParsedName);

      setFormData(prev => ({
        ...prev,
        name: cleanedParsedName || prev.name || '',
        symbol: parsedData.symbol || prev.symbol,
        code: fileCode || prev.code || '',
        new_code: updatedNewCode,
        doc_type_id: detectedDocTypeId || prev.doc_type_id,
        doc_type_code: detectedDocTypeCode || prev.doc_type_code,
        version: parsedData.version || prev.version || '01',
        file_path: parsedData.file_path || prev.file_path,
        docx_path: parsedData.file_path || prev.docx_path,
        original_file_path: parsedData.original_file_path || parsedData.raw_file_path || prev.original_file_path || '',
        original_file_name: parsedData.original_file_name || (file && file.name) || prev.original_file_name || '',
        folder: parsedData.folder || prev.folder,
        doc_type: parsedData.doc_type || prev.doc_type,
        document_level: parsedData.document_level || prev.document_level,
        notes: parsedData.notes || prev.notes,
        owner: parsedData.issuer || parsedData.owner || prev.owner,
        approver: parsedData.approver || prev.approver,
        headings: parsedData.headings || prev.headings || [],
        full_html: parsedData.html_content || prev.full_html || '',
        sections: newSections,
        template_sections: newSections,
        section_types: newSectionTypes,
        steps: stepsMapped,
        instruction_steps: instructionStepsMapped,
        work_instructions: workInstructionsMapped,
        updated_at: Date.now()
      }));

      // Nếu đang dùng Canvas Editor và có sẵn hàm nạp, nạp file đã chuẩn hóa sạch từ server vào Canvas Editor
      if (typeof window.__importBufferToCanvasEditor__ === 'function') {
        if (parsedData.file_path) {
          try {
            const streamRes = await api.get('/iso-master-records/file-stream', {
              params: { path: parsedData.file_path },
              responseType: 'arraybuffer'
            });
            const buf = streamRes?.data || streamRes;
            await window.__importBufferToCanvasEditor__(buf);
          } catch (streamErr) {
            console.warn('Lỗi nạp stream docx sạch vào Canvas Editor:', streamErr);
            const fileBuf = await file.arrayBuffer();
            await window.__importBufferToCanvasEditor__(fileBuf);
          }
        } else {
          const fileBuf = await file.arrayBuffer();
          await window.__importBufferToCanvasEditor__(fileBuf);
        }
      }

      showFeedback('success', `Đã nạp file "${file.name}". ${returnedPages.length > 0 ? `Bản gốc: ${returnedPages.length} trang.` : ''}`);

      // Tự động mở xem bản gốc 100% trung thực để người dùng thấy ngay
      if (returnedPages.length > 0) {
        setShowFaithfulViewer(true);
      }
    } catch (error) {
      console.error('Lỗi upload file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình mới';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      if (eOrFile && eOrFile.target) eOrFile.target.value = '';
    }
  };

  // Mở trình xem trang trung thực (100% gốc: trang ngang/dọc, lưu đồ, bảng, form)
  const handleOpenFaithfulViewer = async () => {
    if (faithfulPages.length > 0) {
      setShowFaithfulViewer(true);
      return;
    }
    const targetPath = formData.original_file_path || formData.file_path;
    if (targetPath) {
      try {
        showFeedback('info', 'Đang tạo bản xem trung thực 100% từ file gốc...');
        const res = await api.get('/iso-documents/onlyoffice/pages', {
          params: { file_path: targetPath }
        });
        const pages = res?.pages || [];
        if (pages.length > 0) {
          setFaithfulPages(pages);
          setShowFaithfulViewer(true);
        } else {
          showFeedback('warning', 'Chưa có bản render ảnh từng trang từ file gốc. Hãy kiểm tra Word trên máy chủ.');
        }
      } catch (err) {
        showFeedback('error', 'Không thể kết xuất bản xem trang gốc: ' + (err?.message || ''));
      }
      return;
    }
    showFeedback('info', 'Vui lòng chọn tải lên file Word (.docx) để xem bản gốc.');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Mở modal ONLYOFFICE để sửa trực tiếp file Word gốc
  const handleOpenOnlyOfficeModal = () => {
    if (formData.file_path) {
      setShowOnlyOfficeModal(true);
    } else {
      showFeedback('info', 'Vui lòng chọn tải lên file Word (.docx) trước để soạn thảo trực tiếp.');
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  // Tải file Word gốc (.docx/.doc) từ máy chủ về máy khách
  const handleDownloadOriginalWord = async () => {
    const targetPath = formData.original_file_path || formData.file_path;
    if (!targetPath) {
      showFeedback('warning', 'Chưa có file Word gốc nào được lưu.');
      return;
    }
    try {
      let blob;
      const downloadUrl = isProcessMode 
        ? `/iso-documents/processes/${formData.id}/download-raw`
        : `/iso-documents/${formData.id}/download-raw`;

      if (formData.id && formData.id !== 'new') {
        const res = await api.get(downloadUrl, { responseType: 'blob' });
        blob = res instanceof Blob ? res : new Blob([res]);
      } else {
        const res = await api.get('/iso-master-records/file-stream', {
          params: { path: targetPath },
          responseType: 'blob'
        });
        blob = res instanceof Blob ? res : new Blob([res]);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rawExt = targetPath.includes('.') 
        ? targetPath.slice(targetPath.lastIndexOf('.')) 
        : '.docx';
      const safeDownloadName = formData.original_file_name || `${formData.code || 'ISO'}_${(formData.name || 'Quy_trinh').replace(/\s+/g, '_')}_BanGoc${rawExt}`;
      a.download = safeDownloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showFeedback('error', 'Lỗi khi tải file Word gốc: ' + err.message);
    }
  };

  // Đăng ký toàn cục để các component con (CanvasISOEditor, Ribbon) có thể gọi
  const autoTestTriggeredRef = useRef(false);
  useEffect(() => {
    window.__openFaithfulViewer__ = handleOpenFaithfulViewer;
    window.__openOnlyOfficeEditor__ = handleOpenOnlyOfficeModal;
    window.__downloadRawWord__ = handleDownloadOriginalWord;
    window.__smartWordUpload__ = handleWordUpload;
    const validLogs = (formData?.revision_logs || []).filter(l => l && (l.content || l.rev_date || l.seq_no));
    const seqNums = validLogs.map(l => Number(l.seq_no)).filter(n => !isNaN(n) && n > 0);
    const maxSeq = seqNums.length > 0 ? Math.max(...seqNums) : validLogs.length;
    const effVer = maxSeq > 0 ? String(maxSeq).padStart(2, '0') : ((formData?.version || '01').trim() || '01');

    window.__ISO_FORM_DATA__ = {
      ...formData,
      version: effVer,
      effective_version: effVer,
      apply_iso_template: applyIsoTemplate
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_upload_doc') === '1' && !autoTestTriggeredRef.current) {
      autoTestTriggeredRef.current = true;
      (async () => {
        try {
          const testUrl = urlParams.get('test_upload_file') || '/test_qt01_raw.docx';
          const resp = await fetch(testUrl);
          const blob = await resp.blob();
          const testFilename = urlParams.get('test_filename') || 'G7.CL -QT01_Quy trình kiểm soát nguyên vật liệu đầu vào.docx';
          const testFile = new File([blob], testFilename, {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
          await handleWordUpload(testFile);
          console.log('[AUTO-TEST] Đã nạp thành công:', testFilename);
        } catch (err) {
          console.error('[AUTO-TEST] Lỗi khi nạp test_document.docx:', err);
        }
      })();
    }

    return () => {
      delete window.__openFaithfulViewer__;
      delete window.__openOnlyOfficeEditor__;
      delete window.__downloadRawWord__;
      delete window.__smartWordUpload__;
    };
  }, [handleOpenFaithfulViewer, handleOpenOnlyOfficeModal, handleDownloadOriginalWord, handleWordUpload, formData, applyIsoTemplate]);

  const handleSectionChange = (sectionName, val) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: val
      }
    }));
  };

  const getSectionHint = (sectionKey) => {
    const templateHtml = formData.template_sections?.[sectionKey] || '';
    if (!templateHtml) return null;
    const cleanText = templateHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!cleanText) return null;
    const match = cleanText.match(/\[([^\]]*)\]/);
    return match ? match[1].trim() : cleanText;
  };

  // --- QC STEPS CONFIGURATION ---
  const handleAddStep = () => {
    const nextStepNum = formData.steps.length + 1;
    const newStep = {
      step_number: nextStepNum,
      name: `Bước mới ${nextStepNum}`,
      assignee_role: 'QC',
      instructions: '',
      checklist: [],
      transition: { next_step: nextStepNum + 1, image_url: '' },
      flow_node_id: `node_${nextStepNum}`,
      node_type: 'task',
      has_branch: false,
      image_url: ''
    };

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));

    setSelectedStepIdx(nextStepNum - 1);
  };

  const getStepFailPath = (step) => {
    if (!step) return [];
    if (step.fail_path && step.fail_path.length > 0) {
      return step.fail_path;
    }
    if (step.has_branch === true) {
      const defaultRole = step.assignee_role || 'QC';
      return [
        { name: "Cập nhật báo cáo thông tin", assignee_role: defaultRole, edge_label: "Không", return_to_step: null }
      ];
    }
    return [];
  };

  const handleUpdateStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      if (field.startsWith('fail_path_')) {
        const nodeIdx = parseInt(field.split('_')[2]);
        const currentPath = [...getStepFailPath(nextSteps[index])];
        if (currentPath[nodeIdx]) {
          currentPath[nodeIdx] = { ...currentPath[nodeIdx], name: val };
        }
        nextSteps[index] = { ...nextSteps[index], fail_path: currentPath };
      } else {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, steps: nextSteps };
    });
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => {
      const nextSteps = prev.steps.filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1, flow_node_id: `node_${idx + 1}` }));
      return { ...prev, steps: nextSteps };
    });
    if (selectedStepIdx >= formData.steps.length - 1) {
      setSelectedStepIdx(Math.max(0, formData.steps.length - 2));
    }
  };

  const handleAddInstructionStep = () => {
    const nextStepNum = (formData.instruction_steps || []).length + 1;
    const newStep = {
      id: `inst_${Date.now()}`,
      step_number: nextStepNum,
      name: '',
      image_url: ''
    };
    setFormData(prev => ({
      ...prev,
      instruction_steps: [...(prev.instruction_steps || []), newStep]
    }));
  };

  const handleUpdateInstructionStep = (index, field, val) => {
    setFormData(prev => {
      const nextSteps = [...(prev.instruction_steps || [])];
      if (nextSteps[index]) {
        nextSteps[index] = { ...nextSteps[index], [field]: val };
      }
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleRemoveInstructionStep = (index) => {
    setFormData(prev => {
      const nextSteps = (prev.instruction_steps || []).filter((_, idx) => idx !== index)
        .map((step, idx) => ({ ...step, step_number: idx + 1 }));
      return { ...prev, instruction_steps: nextSteps };
    });
  };

  const handleInstructionImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateInstructionStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Work Instructions CRUD & Image Helpers
  const handleAddWorkInstruction = () => {
    const processCode = formData.code || 'G7.SX.QT01';
    const prefix = `${processCode}-HD`;
    let maxAa = 0;
    if (formData.work_instructions && formData.work_instructions.length > 0) {
      formData.work_instructions.forEach(inst => {
        const c = inst.code || '';
        if (c.toUpperCase().startsWith(prefix.toUpperCase())) {
          const suffix = c.slice(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxAa) {
            maxAa = num;
          }
        }
      });
    }
    const aa = String(maxAa + 1).padStart(2, '0');
    const generatedCode = `${prefix}${aa}`;

    const newInst = {
      id: `inst_${Date.now()}`,
      code: generatedCode,
      title: `hướng dẫn ${maxAa + 1}`,
      scope: 'Tất cả',
      note: '',
      steps: []
    };

    setFormData(prev => ({
      ...prev,
      work_instructions: [...(prev.work_instructions || []), newInst]
    }));
    setSelectedInstructionId(newInst.id);
  };

  const handleUpdateWorkInstructionTitle = (id, newTitle) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, title: newTitle };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionScope = (id, newScope) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, scope: newScope };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleUpdateWorkInstructionNote = (id, newNote) => {
    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === id) {
          return { ...inst, note: newNote };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handleRemoveWorkInstruction = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hướng dẫn này cùng toàn bộ các bước và hình ảnh?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).filter(inst => inst.id !== id);
        return { ...prev, work_instructions: nextInstructions };
      });
      if (selectedInstructionId === id) {
        setSelectedInstructionId(null);
      }
    }
  };

  const handleOpenAddStepPopup = (activeInst) => {
    const nextNum = (activeInst.steps || []).length + 1;
    setStepForm({
      id: `step_${Date.now()}_${nextNum}`,
      step_number: nextNum,
      name: '',
      note: '',
      standard: '',
      image_url: ''
    });
    setIsEditingStep(false);
    setEditingStepIdx(-1);
    setShowStepPopup(true);
  };

  const handleOpenEditStepPopup = (activeInst, idx) => {
    const step = activeInst.steps[idx];
    if (step) {
      setStepForm({
        id: step.id || `step_${Date.now()}_${step.step_number}`,
        step_number: step.step_number,
        name: step.name || '',
        note: step.note || '',
        standard: step.standard || '',
        image_url: step.image_url || ''
      });
      setIsEditingStep(true);
      setEditingStepIdx(idx);
      setShowStepPopup(true);
    }
  };

  const handleSaveStep = (e) => {
    e.preventDefault();
    if (!selectedInstructionId) return;

    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];
          if (isEditingStep && editingStepIdx >= 0) {
            nextSteps[editingStepIdx] = { ...stepForm };
          } else {
            const insertIdx = stepForm.step_number - 1;
            nextSteps.splice(insertIdx, 0, { ...stepForm });
          }
          nextSteps = nextSteps.map((s, idx) => ({ ...s, step_number: idx + 1 }));
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });

    setShowStepPopup(false);
  };

  const handleRemoveWorkInstructionStep = (instId, stepIdx) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bước này?")) {
      setFormData(prev => {
        const nextInstructions = (prev.work_instructions || []).map(inst => {
          if (inst.id === instId) {
            const nextSteps = (inst.steps || []).filter((_, idx) => idx !== stepIdx)
              .map((step, idx) => ({ ...step, step_number: idx + 1 }));
            return { ...inst, steps: nextSteps };
          }
          return inst;
        });
        return { ...prev, work_instructions: nextInstructions };
      });
    }
  };

  const handleReorderStepInPopup = (targetStepNo) => {
    const targetIdx = parseInt(targetStepNo, 10) - 1;
    if (isNaN(targetIdx) || targetIdx < 0) return;

    setFormData(prev => {
      const nextInstructions = (prev.work_instructions || []).map(inst => {
        if (inst.id === selectedInstructionId) {
          let nextSteps = [...(inst.steps || [])];

          if (isEditingStep && editingStepIdx >= 0) {
            const currentIdx = editingStepIdx;
            if (currentIdx === targetIdx) return inst;

            const [movedStep] = nextSteps.splice(currentIdx, 1);
            nextSteps.splice(targetIdx, 0, movedStep);
            nextSteps = nextSteps.map((s, i) => ({ ...s, step_number: i + 1 }));

            setEditingStepIdx(targetIdx);
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          } else {
            setStepForm(prevForm => ({ ...prevForm, step_number: targetStepNo }));
          }
          return { ...inst, steps: nextSteps };
        }
        return inst;
      });
      return { ...prev, work_instructions: nextInstructions };
    });
  };

  const handlePopupImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setStepForm(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const handlePrintPdf = () => {
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Trình duyệt chặn mở cửa sổ mới. Vui lòng cho phép popup để xuất PDF.");
      return;
    }

    const cloneForPrint = previewEl.cloneNode(true);
    cloneForPrint.querySelectorAll('.iso-flowchart-edit-badge, .iso-nav-item-flowchart-btn, button').forEach(b => b.remove());
    let htmlContent = cloneForPrint.innerHTML;

    // Replace relative image paths with absolute paths so they load on about:blank base
    const origin = window.location.origin;
    htmlContent = htmlContent.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    htmlContent = htmlContent.replace(/src="assets\//g, `src="${origin}/assets/`);

    printWindow.document.write(`
      <html>
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 12mm 15mm 12mm;
            }
            * {
              font-family: "Times New Roman", Times, serif !important;
              box-sizing: border-box !important;
            }
            body {
              color: black;
              background-color: white;
              line-height: 1.5;
              font-size: 12pt;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-page, .iso-a4-sheet {
              width: 100% !important;
              max-width: 100% !important;
              min-height: unset !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 0 20px 0 !important;
              box-shadow: none !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
            }
            .a4-page:last-child, .iso-a4-sheet:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .iso-a4-sheet-content {
              flex: 1 1 auto !important;
              width: 100% !important;
              height: auto !important;
              min-height: unset !important;
              overflow: visible !important;
            }
            .iso-a4-sheet-footer {
              height: 32px !important;
              min-height: 32px !important;
              border-top: 1px solid #000000 !important;
              padding-top: 6px !important;
              margin-top: 6px !important;
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              font-size: 10pt !important;
              font-style: italic !important;
            }
            .cover-border-box {
              border: 2px solid black;
              padding: 24px;
              height: 250mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              flex: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid black;
              padding: 8px;
              vertical-align: middle;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
            }
            th {
              background-color: #f8fafc !important;
            }
            h3 {
              font-size: 13pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
              border-bottom: 1px solid black;
              padding-bottom: 2px;
              page-break-after: avoid;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
              page-break-after: avoid;
            }
            img {
              max-width: 100%;
              height: auto;
              object-fit: cover;
            }
            .instruction-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .instruction-card {
              border: 1px solid black;
              padding: 10px;
              display: flex;
              flex-direction: column;
              gap: 8px;
              page-break-inside: avoid;
            }
            .iso-flowchart-block-container {
              page-break-inside: avoid;
            }
            .iso-flowchart-edit-badge, .iso-nav-item-flowchart-btn, button, .no-print {
              display: none !important;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                background: none;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            ${htmlContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const svgToPngDataUrl = (svgElement) => {
    return new Promise((resolve) => {
      try {
        let width = svgElement.viewBox?.baseVal?.width;
        let height = svgElement.viewBox?.baseVal?.height;
        if (!width || !height) {
          const vb = svgElement.getAttribute('viewBox');
          if (vb) {
            const parts = vb.split(/[\s,]+/).filter(Boolean);
            if (parts.length === 4) {
              width = parseFloat(parts[2]);
              height = parseFloat(parts[3]);
            }
          }
        }
        if (!width) width = svgElement.width?.baseVal?.value || svgElement.clientWidth || 860;
        if (!height) height = svgElement.height?.baseVal?.value || svgElement.clientHeight || 800;

        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext('2d');
          ctx.scale(2, 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(pngUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch (e) {
        resolve(null);
      }
    });
  };

  const buildWordFlowchartTable = (steps = [], cleanTitle = 'QUY TRÌNH') => {
    if (!steps || steps.length === 0) return '';
    try {
      if (typeof generateFlowchartSvgHtml === 'function') {
        const svgHtml = generateFlowchartSvgHtml(steps);
        if (svgHtml) {
          return `
            <div class="iso-flowchart-block-container" style="margin:12pt 0;">
              <h3 style="font-size:12pt; font-weight:bold; margin-bottom:8pt; font-family:'Times New Roman',serif;">5.1. Sơ đồ lưu trình kiểm soát công tác ${cleanTitle.toLowerCase()}</h3>
              <div style="width:100%; display:flex; justify-content:center; margin-bottom:15pt;">
                ${svgHtml}
              </div>
            </div>
          `;
        }
      }
    } catch (eSvg) {
      console.warn('Lỗi render SVG flowchart:', eSvg);
    }

    const totalSteps = steps.length;
    const rows = steps.map((s, idx) => {
      const stepNum = s.step_number || (idx + 1);
      const role = s.assignee_role ? `- ${s.assignee_role}` : '- Đang cập nhật';
      const tpl = (s.template_files && s.template_files !== '---') ? s.template_files : '---';
      const isTerminal = idx === 0 || idx === totalSteps - 1;
      const isDecision = s.has_branch || s.node_type === 'decision';

      let nodeStyle = 'display:inline-block; border:1.5pt solid windowtext; background:#ffffff; padding:5pt 10pt; font-size:10pt; font-weight:bold; font-family:"Times New Roman",serif; text-align:center; max-width:180pt;';
      if (isTerminal) {
        nodeStyle += ' border-radius:16pt;';
      } else if (isDecision) {
        nodeStyle += ' border:2.0pt solid #b45309; background:#fffbeb;';
      }

      const arrowDown = (idx < totalSteps - 1)
        ? '<div style="font-size:11pt; line-height:1.2; margin-top:3pt; color:#000000; text-align:center;">&#9660;</div>'
        : '';

      return `
        <tr style="page-break-inside:avoid; height:45pt;">
          <td style="border:1.0pt solid windowtext; width:6%; text-align:center; font-weight:bold; font-size:10.5pt; vertical-align:middle; font-family:'Times New Roman',serif;">
            ${stepNum}.
          </td>
          <td style="border:1.0pt solid windowtext; width:24%; padding:6pt 8pt; vertical-align:middle; font-size:10.5pt; font-family:'Times New Roman',serif;">
            ${role}
          </td>
          <td style="border:1.0pt solid windowtext; width:42%; text-align:center; vertical-align:middle; padding:8pt 6pt; font-family:'Times New Roman',serif;">
            <div style="${nodeStyle}">
              ${s.name || `Bước ${stepNum}`}
            </div>
            ${arrowDown}
          </td>
          <td style="border:1.0pt solid windowtext; width:28%; padding:6pt 8pt; vertical-align:middle; font-size:9.5pt; font-weight:bold; color:#0369a1; font-family:'Times New Roman',serif;">
            ${tpl}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="iso-flowchart-block-container" style="margin:12pt 0;">
        <h3 style="font-size:12pt; font-weight:bold; margin-bottom:8pt; font-family:'Times New Roman',serif;">5.1. Sơ đồ lưu trình kiểm soát công tác ${cleanTitle.toLowerCase()}</h3>
        <table style="width:100%; border-collapse:collapse; border:1.5pt solid windowtext; margin-bottom:15pt; table-layout:fixed;">
          <thead>
            <tr style="background:#f1f5f9; font-weight:bold; text-align:center; height:28pt;">
              <th style="border:1.0pt solid windowtext; width:6%; font-size:11pt; padding:5pt; text-align:center; font-family:'Times New Roman',serif;">Bước</th>
              <th style="border:1.0pt solid windowtext; width:24%; font-size:11pt; padding:5pt; text-align:center; font-family:'Times New Roman',serif;">Trách nhiệm</th>
              <th style="border:1.0pt solid windowtext; width:42%; font-size:11pt; padding:5pt; text-align:center; font-family:'Times New Roman',serif;">Lưu đồ</th>
              <th style="border:1.0pt solid windowtext; width:28%; font-size:11pt; padding:5pt; text-align:center; font-family:'Times New Roman',serif;">Phụ lục</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const buildRelatedFormsTableHtml = (existingContent = '', currentFormData = {}) => {
    const leadIn = `<p style="margin: 6pt 0 10pt 0; font-size: 11pt; line-height: 1.5; color: #000000; font-family: 'Times New Roman', serif;">Toàn bộ các biểu mẫu phục vụ quy trình này phải được kiểm soát theo danh mục sau:</p>`;

    const baseCode = (currentFormData.new_code || currentFormData.code || formData.new_code || formData.code || 'G7.ISO.QT02').trim();
    const deptText = (currentFormData.folder || currentFormData.department_name || formData.folder || formData.department_name || '').trim();
    const defaultDept = (deptText && deptText !== '---' && !/phòng\s*ban/i.test(deptText))
      ? deptText
      : 'Ban hệ thống ISO\n(ISO)';

    const items = [];

    // 1. Ưu tiên hàng đầu: Lấy từ mảng related_templates đã upload/cấu hình ở Tab Tài liệu liên quan
    const relTpls = currentFormData.related_templates || formData.related_templates || [];
    if (relTpls && relTpls.length > 0) {
      relTpls.forEach((t, tIdx) => {
        const code = (t.code || '').trim();
        const name = (t.title || t.name || '').trim();
        if (code || name) {
          items.push({
            code: code || `${baseCode}-BM0${tIdx + 1}`,
            name: name || `Biểu mẫu 0${tIdx + 1}`,
            storage: t.storage_location || 'Ban hệ thống ISO\n(ISO)',
            retention: t.retention_period || '12 tháng'
          });
        }
      });
    }

    // 2. Bóc tách từ existingContent (tách riêng 4 cột độc lập, không gộp text)
    if (items.length === 0 && existingContent && typeof existingContent === 'string') {
      // 2a. Nếu chứa thẻ <tr> (từ bảng Word hoặc bảng HTML)
      if (existingContent.includes('<tr')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<div>${existingContent}</div>`, 'text/html');
          const rows = Array.from(doc.querySelectorAll('tr'));
          rows.forEach(r => {
            // Bỏ qua dòng tiêu đề bảng
            if (r.querySelector('th') || /mã\s*hiệu\s*biểu\s*mẫu|tên\s*biểu\s*mẫu/i.test(r.textContent)) {
              return;
            }
            const cells = Array.from(r.querySelectorAll('td')).map(c => c.textContent.replace(/[\u00a0\s]+/g, ' ').trim());
            if (cells.length < 2) return;

            let rowCode = '';
            let rowName = '';
            let rowStorage = '';
            let rowRetention = '';

            if (cells.length >= 5) {
              // Bảng 5 cột có STT ở đầu: [STT, Mã, Tên, Nơi lưu, Thời hạn]
              rowCode = cells[1];
              rowName = cells[2];
              rowStorage = cells[3];
              rowRetention = cells[4];
            } else if (cells.length === 4) {
              // Bảng 4 cột chuẩn: [Mã, Tên, Nơi lưu, Thời hạn]
              rowCode = cells[0];
              rowName = cells[1];
              rowStorage = cells[2];
              rowRetention = cells[3];
            } else if (cells.length === 3) {
              rowCode = cells[0];
              rowName = cells[1];
              if (/\d+\s*(?:tháng|năm)/i.test(cells[2])) {
                rowRetention = cells[2];
              } else {
                rowStorage = cells[2];
              }
            } else if (cells.length === 2) {
              rowCode = cells[0];
              rowName = cells[1];
            }

            // Dọn dẹp rác tiền tố STT
            rowCode = rowCode.replace(/^[-*•\d\.\s]+/, '').trim();
            rowName = rowName.replace(/^[-*•\d\.\s]+/, '').trim();

            // Khắc phục dữ liệu bị gộp cũ (nếu có chuỗi gộp nối " - Ban hệ thống ISO - 12 tháng")
            if (!rowRetention) {
              const retM = rowName.match(/[-–—:,]?\s*(\b\d+\s*(?:tháng|năm)\b)\s*$/i);
              if (retM) {
                rowRetention = retM[1].trim();
                rowName = rowName.substring(0, retM.index).trim();
              }
            }
            if (!rowStorage) {
              const stM = rowName.match(/[-–—:,]\s*(Ban\s+hệ\s+thống\s+ISO(?:\s*\(ISO\))?|Ban\s+QLCL|Phòng\s+[^-\n,]+|Kho|Sản\s+xuất)\s*$/i);
              if (stM) {
                rowStorage = stM[1].trim();
                rowName = rowName.substring(0, stM.index).trim();
              }
            }

            if (rowCode || rowName) {
              items.push({
                code: rowCode,
                name: rowName,
                storage: rowStorage,
                retention: rowRetention
              });
            }
          });
        } catch (_) {}
      }

      // 2b. Nếu chưa có items, bóc tách từ các dòng văn bản
      if (items.length === 0) {
        const textLines = existingContent
          .replace(/<\/tr>|<\/p>|<\/li>|<br\s*\/?>/gi, '\n')
          .split('\n')
          .map(l => l.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ').trim())
          .filter(l => l.length > 0 && !/^(?:(?:6\.)?\s*(?:biểu\s*mẫu|hồ\s*sơ)(?:\s*đi\s*kèm)?\s*:?|toàn\s*bộ\s*các\s*biểu\s*mẫu.*|danh\s*mục\s*biểu\s*mẫu.*|stt\s+mã\s+biểu\s+mẫu.*)$/i.test(l));

        textLines.forEach(line => {
          let clean = line.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ');
          clean = clean.replace(/^(?:(?:iso\s*[-_]\s*)?doc\s*[-_]\s*paragraph"?\s*(?:data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?)?>?|data\s*[-_]\s*p\s*[-_]\s*idx="?\d+"?>?)\s*[-–—:\s]*/i, '').trim();
          clean = clean.replace(/^[-*•\d\.\s]+/, '').trim();
          if (!clean) return;

          let code = '';
          let name = clean;
          let storage = '';
          let retention = '';

          // 1. Tách thời hạn lưu (vd: "12 tháng", "3 năm")
          const retMatch = name.match(/[-–—:,]?\s*(\b\d+\s*(?:tháng|năm)\b)\s*$/i);
          if (retMatch) {
            retention = retMatch[1].trim();
            name = name.substring(0, retMatch.index).trim();
          }

          // 2. Tách nơi lưu trữ
          const storageMatch = name.match(/[-–—:,]\s*(Ban\s+hệ\s+thống\s+ISO(?:\s*\(ISO\))?|Ban\s+QLCL|Phòng\s+[^-\n,]+|Kho|Sản\s+xuất)\s*$/i);
          if (storageMatch) {
            storage = storageMatch[1].trim();
            name = name.substring(0, storageMatch.index).trim();
          }

          // 3. Tách mã hiệu
          const codeMatch = name.match(/^([A-Z0-9\.\/_-]+(?:[-_]BM\d+)?)\s*[-–—:]\s*(.+)$/i);
          if (codeMatch) {
            code = codeMatch[1].trim();
            name = codeMatch[2].trim();
          }

          if (code || name) {
            items.push({ code, name, storage, retention });
          }
        });
      }
    }

    // 3. Fallback từ bước quy trình (steps)
    const curSteps = currentFormData.steps || formData.steps || [];
    if (items.length === 0 && curSteps.length > 0) {
      const seen = new Set();
      curSteps.forEach(s => {
        if (s.template_files && s.template_files !== '---') {
          const tpls = s.template_files.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
          tpls.forEach(t => {
            if (!seen.has(t)) {
              seen.add(t);
              const fmtCode = /^(?:BM|HD|PL)\d+/i.test(t) ? `${baseCode}-${t}` : t;
              items.push({
                code: fmtCode,
                name: `Biểu mẫu kiểm soát ${s.name || ''}`.trim(),
                storage: 'Ban hệ thống ISO\n(ISO)',
                retention: '12 tháng'
              });
            }
          });
        }
      });
    }

    // 4. Mặc định khớp 100% Ảnh 2
    if (items.length === 0) {
      items.push({ code: `${baseCode}-BM02`, name: 'Phiếu ghi nhận thông tin/khiếu nại', storage: 'Ban hệ thống ISO\n(ISO)', retention: '12 tháng' });
      items.push({ code: `${baseCode}-BM03`, name: 'Biên bản xác minh thông tin', storage: 'Ban hệ thống ISO\n(ISO)', retention: '12 tháng' });
      items.push({ code: `${baseCode}-BM04`, name: 'Biên bản họp Hội đồng kỷ luật', storage: 'Ban hệ thống ISO\n(ISO)', retention: '12 tháng' });
    }

    const rowsHtml = items.map((item, idx) => {
      const seq = idx + 1;
      let code = (item.code || `${baseCode}-BM0${seq}`).trim();
      const name = (item.name || `Biểu mẫu 0${seq}`).trim();

      // Chuẩn hóa định dạng mã biểu mẫu: G7.ISO.QT02-BM02
      if (/^(?:BM|HD|PL)\d+/i.test(code)) {
        code = `${baseCode}-${code.toUpperCase()}`;
      } else {
        code = code.replace(/\s*-\s*(BM|HD|PL)/gi, '-$1');
      }

      let storage = item.storage || defaultDept;
      if (!item.storage && (code.includes('BM02') || code.includes('BM03') || code.includes('BM04') || code.includes('ISO') || code.includes('QLCL'))) {
        storage = 'Ban hệ thống ISO\n(ISO)';
      }

      const retention = item.retention || '12 tháng';

      return `
        <tr style="height: 32pt; page-break-inside: avoid; background: #ffffff;">
          <td style="border: 1.0pt solid #000000; text-align: left; padding: 6pt 8pt; font-size: 11pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle;">${code}</td>
          <td style="border: 1.0pt solid #000000; text-align: left; padding: 6pt 8pt; font-size: 11pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle;">${name}</td>
          <td style="border: 1.0pt solid #000000; text-align: center; padding: 6pt 6pt; font-size: 11pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle; white-space: pre-line;">${storage}</td>
          <td style="border: 1.0pt solid #000000; text-align: center; padding: 6pt 6pt; font-size: 11pt; font-family: 'Times New Roman', serif; color: #000000; vertical-align: middle;">${retention}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="iso-doc-forms-container" style="margin: 16px 0; font-family: 'Times New Roman', Times, serif;">
        <h2 id="heading-sec-6" class="iso-doc-heading level-1" style="font-size: 13pt; font-weight: bold; margin: 18px 0 10px 0; color: #0D0D0D; font-family: 'Times New Roman', Times, serif;">
          6. Danh mục biểu mẫu và hồ sơ lưu trữ
        </h2>
        ${leadIn}
        <table class="iso-doc-forms-table" style="width: 100%; border-collapse: collapse; border: 1.0pt solid #000000; table-layout: fixed; margin-top: 6pt; background: #ffffff;">
          <thead>
            <tr style="background: #ffffff; font-weight: bold; text-align: center; height: 32pt;">
              <th style="border: 1.0pt solid #000000; width: 26%; padding: 6pt 6pt; font-size: 11pt; font-family: 'Times New Roman', serif; text-align: center; vertical-align: middle;">Mã hiệu biểu mẫu</th>
              <th style="border: 1.0pt solid #000000; width: 38%; padding: 6pt 8pt; font-size: 11pt; font-family: 'Times New Roman', serif; text-align: center; vertical-align: middle;">Tên biểu mẫu / Hồ sơ kiểm soát</th>
              <th style="border: 1.0pt solid #000000; width: 20%; padding: 6pt 6pt; font-size: 11pt; font-family: 'Times New Roman', serif; text-align: center; vertical-align: middle;">Nơi lưu trữ</th>
              <th style="border: 1.0pt solid #000000; width: 16%; padding: 6pt 6pt; font-size: 11pt; font-family: 'Times New Roman', serif; text-align: center; vertical-align: middle;">Thời hạn lưu</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  };

  const handleDownloadDoc = async () => {
    const docCode = formData.code || formData.new_code || 'G7.QL.QT10';
    const docName = (formData.name || 'Quy_trinh').replace(/\s+/g, '_');

    // Chuyển đổi SVG Lưu đồ thành PNG chất lượng cao để chèn vào file Word
    let flowchartImageData = null;
    try {
      let svgEl = document.querySelector('.iso-flowchart-block-container svg') ||
                  document.querySelector('#iso-flowchart-block-container svg') ||
                  document.querySelector('.iso-doc-table-wrapper svg');
      if (!svgEl && formData.steps && formData.steps.length > 0) {
        const offscreen = document.createElement('div');
        offscreen.style.position = 'absolute';
        offscreen.style.left = '-9999px';
        offscreen.style.top = '-9999px';
        offscreen.innerHTML = generateFlowchartSvgHtml(formData.steps);
        document.body.appendChild(offscreen);
        svgEl = offscreen.querySelector('svg');
        if (svgEl) {
          flowchartImageData = await svgToPngDataUrl(svgEl);
        }
        document.body.removeChild(offscreen);
      } else if (svgEl) {
        flowchartImageData = await svgToPngDataUrl(svgEl);
      }
    } catch (eSvg) {
      console.warn('Could not generate flowchart PNG data URL:', eSvg);
    }

    const payload = {
      ...formData,
      flowchart_image_data: flowchartImageData
    };

    // 1. First, attempt to download native .docx from backend
    try {
      const resp = await api.post('/iso-documents/export-process-docx', payload, {
        responseType: 'blob'
      });
      if (resp) {
        const blob = resp instanceof Blob ? resp : new Blob([resp], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        if (blob && blob.size > 1000) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${docCode}_${docName}.docx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }
    } catch (eDocx) {
      console.warn('Backend docx export failed or not available, using client-side Word HTML export:', eDocx);
    }

    // 2. Client-side Word HTML (.doc) export with perfected layout
    const previewEl = document.getElementById("pdf-preview-document-root");
    if (!previewEl) return;

    // Clone the DOM so we can manipulate it (replacing SVGs with native tables for Word compat)
    const clone = previewEl.cloneNode(true);

    // Strip edit badges and buttons
    clone.querySelectorAll('.iso-flowchart-edit-badge, .iso-nav-item-flowchart-btn, button').forEach(b => b.remove());

    // Flowchart: Replace SVG flowchart container with native Word HTML 4-column table + visual diagram image
    const cleanDocTitle = (formData.name || 'QUY TRÌNH').trim().toUpperCase();
    const fcContainers = clone.querySelectorAll('.iso-flowchart-block-container, [data-flowchart-block="true"], #iso-flowchart-block-container');
    if (fcContainers.length > 0 && formData.steps && formData.steps.length > 0) {
      const fcHtml = buildWordFlowchartTable(formData.steps, cleanDocTitle);
      const imgHtml = flowchartImageData
        ? `<div style="text-align:center; margin:12pt 0 16pt 0;"><img src="${flowchartImageData}" style="max-width:100%; height:auto;" alt="Lưu đồ quy trình" /></div>`
        : '';
      fcContainers.forEach((fc, idx) => {
        if (idx === 0) {
          const temp = document.createElement('div');
          temp.innerHTML = imgHtml + fcHtml;
          fc.parentNode.replaceChild(temp.firstElementChild, fc);
        } else {
          fc.remove();
        }
      });
    }

    // Section 6: Format Biểu mẫu đi kèm into 5-column table
    const allHeadings = clone.querySelectorAll('h1, h2, h3, h4, h5, p');
    allHeadings.forEach(h => {
      const txt = (h.textContent || '').trim().toLowerCase();
      if (/6\.\s*biểu mẫu|^biểu mẫu/i.test(txt)) {
        let sib = h.nextElementSibling;
        let contentHtml = '';
        const toRemove = [];
        let hasTable = false;
        while (sib && !/^H[1-6]$/i.test(sib.tagName)) {
          if (sib.tagName === 'TABLE' || (sib.querySelector && sib.querySelector('table'))) {
            hasTable = true;
          }
          contentHtml += sib.outerHTML;
          toRemove.push(sib);
          sib = sib.nextElementSibling;
        }
        if (!hasTable) {
          toRemove.forEach(el => el.remove());
          const newFormsHtml = buildRelatedFormsTableHtml(contentHtml, formData);
          h.insertAdjacentHTML('afterend', newFormsHtml);
        }
      }
    });

    // Find any remaining standalone SVGs (if any) and replace them with high-res PNG images
    const cloneSvgs = clone.querySelectorAll("svg");
    const origSvgs = previewEl.querySelectorAll("svg");
    for (let i = 0; i < cloneSvgs.length; i++) {
      const svgEl = cloneSvgs[i];
      const origSvg = origSvgs[i] || svgEl;
      const pngUrl = await svgToPngDataUrl(origSvg);
      if (pngUrl) {
        const img = document.createElement("img");
        img.src = pngUrl;
        img.setAttribute("width", "520");
        img.style.width = "520px";
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "0 auto";
        svgEl.parentNode.replaceChild(img, svgEl);
      }
    }

    // Strip flexbox and rigid fixed heights that break Word pagination (forcing dual pages per sheet)
    const cleanStyles = (element) => {
      if (element.style) {
        if (element.style.display === 'flex' || element.style.display === 'inline-flex') {
          element.style.display = 'block';
        }
        element.style.flex = '';
        element.style.flexDirection = '';
        element.style.justifyContent = '';
        element.style.alignItems = '';
        element.style.flexWrap = '';
        element.style.flexGrow = '';
        element.style.flexShrink = '';
        element.style.flexBasis = '';

        // Reset rigid heights that cause Word to split every sheet into 2 pages
        if (element.style.height && (element.style.height.includes('px') || element.style.height.includes('mm'))) {
          element.style.height = 'auto';
        }
        if (element.style.minHeight) element.style.minHeight = 'unset';
        if (element.style.maxHeight) element.style.maxHeight = 'none';
        if (element.style.overflow) element.style.overflow = 'visible';
      }
      Array.from(element.children).forEach(child => cleanStyles(child));
    };
    cleanStyles(clone);

    // Flowchart wrapper: MUST start on a clean fresh page and avoid break inside
    clone.querySelectorAll('.iso-flowchart-block-container, [data-flowchart-block="true"]').forEach(fc => {
      fc.style.pageBreakBefore = 'always';
      fc.style.pageBreakInside = 'avoid';
      fc.style.margin = '15pt auto';
    });

    // Detailed steps: MUST also start on a fresh page after flowchart
    clone.querySelectorAll('.iso-detailed-steps-block-container, [data-detailed-steps="true"]').forEach(ds => {
      ds.style.pageBreakBefore = 'always';
    });

    // Also look for other elements with page-break-before: always inside the document
    const breakElms = clone.querySelectorAll('*');
    breakElms.forEach(el => {
      if (el.style && el.style.pageBreakBefore === 'always') {
        el.style.pageBreakBefore = ''; // Remove from element to avoid duplicate break
        const br = document.createElement("p");
        br.style.pageBreakBefore = "always";
        br.style.clear = "both";
        br.innerHTML = "&nbsp;";
        el.parentNode.insertBefore(br, el);
      }
    });

    const dividers = clone.querySelectorAll('.iso-doc-page-break-divider');
    dividers.forEach(div => {
      const br = document.createElement("p");
      br.style.pageBreakBefore = "always";
      br.style.clear = "both";
      br.innerHTML = "&nbsp;";
      if (div.parentNode) {
        div.parentNode.replaceChild(br, div);
      }
    });

    // Extract pages flat inner contents: supports both .iso-a4-sheet and .a4-page
    let allPageNodes = Array.from(clone.querySelectorAll(".iso-a4-sheet, .a4-page"));
    
    // Filter out completely blank sheets (e.g. sheets with only empty <p><br></p>)
    const validPages = allPageNodes.filter((page) => {
      const coverBox = page.querySelector(".cover-border-box, .cover-border-box-table, .iso-cover-table");
      if (coverBox) return true; // Cover page is always kept

      const contentEl = page.querySelector('.iso-a4-sheet-content') || page;
      const textOnly = (contentEl.innerText || contentEl.textContent || '')
        .replace(/\s+/g, '')
        .replace(/Mãhiệu:.*?Trang\d+/g, '')
        .replace(/---Ngắttrang---/g, '');

      const hasImg = contentEl.querySelector('img, svg, canvas');
      const hasHeadings = contentEl.querySelector('h1, h2, h3, h4');
      const hasTables = contentEl.querySelector('table');

      return textOnly.length > 5 || hasImg || hasHeadings || hasTables;
    });

    const { effCode, effVer, effDate } = getEffectiveFooterData(formData);
    const issueDate = effDate;
    const docVersion = effVer;

    const pageContents = [];
    validPages.forEach((page, idx) => {
      // 1. Format Cover page matching standard Mẫu quy trình.docx and G7.CL-QT01
      const coverBox = page.querySelector(".cover-border-box, .iso-cover-table");
      if (coverBox) {
        const cleanDocTitle = (formData.name || 'QUY TRÌNH').trim().toUpperCase();
        const deptText = formData.folder || formData.department_name || 'Ban Quản trị Chất lượng & ISO (QLCL)';
        const issuerName = formData.issuer || '---';
        const approverName = formData.approver || '---';

        const coverTable = document.createElement("div");
        coverTable.innerHTML = `
          <table class="cover-border-box-table" style="width:100%; border-collapse:collapse; border:1.5pt solid windowtext; margin:0 auto;">
            <tbody>
              <!-- Row 0: Logo & Company Name (100pt height) -->
              <tr style="height:100pt;">
                <td style="border:1.0pt solid windowtext; width:25%; text-align:center; vertical-align:middle; padding:8pt;">
                  <img src="${logoCty}" style="max-height:75pt; max-width:100%; object-fit:contain;" alt="Logo VINA G7" />
                </td>
                <td colspan="3" style="border:1.0pt solid windowtext; width:75%; text-align:center; vertical-align:middle; padding:8pt;">
                  <strong style="font-size:16pt; font-family:'Times New Roman', serif; text-transform:uppercase;">CÔNG TY CỔ PHẦN VINA G7</strong>
                </td>
              </tr>

              <!-- Row 1: Title and Metadata (375pt height - fills page 1 cleanly) -->
              <tr style="height:375pt;">
                <td colspan="4" style="border:1.0pt solid windowtext; text-align:center; vertical-align:middle; padding:35pt 15pt;">
                  <div style="margin-bottom:30pt;">
                    <strong style="font-size:20pt; font-family:'Times New Roman', serif; text-transform:uppercase; line-height:1.4;">${cleanDocTitle}</strong>
                  </div>
                  <table class="dashed-table" style="margin:0 auto; border-collapse:collapse; border:1.0pt dashed windowtext; width:78%; font-size:11pt; text-align:left;">
                    <tbody>
                      <tr>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt; font-weight:bold; width:45%;">Mã hiệu:</td>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt; width:55%;">${effCode}</td>
                      </tr>
                      <tr>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt; font-weight:bold;">Lần ban hành:</td>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt;">${docVersion}</td>
                      </tr>
                      <tr>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt; font-weight:bold;">Ngày ban hành:</td>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt;">${issueDate}</td>
                      </tr>
                      <tr>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt; font-weight:bold;">Bộ phận thực hiện:</td>
                        <td style="border:1.0pt dashed windowtext; padding:6pt 8pt;">${deptText}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Row 2: Signatures Header (38pt height) -->
              <tr style="height:38pt; background-color:#ffffff; font-weight:bold; text-align:center;">
                <td style="border:1.0pt solid windowtext; width:25%; padding:5pt; font-size:11pt;">TRÁCH NHIỆM</td>
                <td style="border:1.0pt solid windowtext; width:30%; padding:5pt; font-size:11pt;">HỌ TÊN</td>
                <td style="border:1.0pt solid windowtext; width:25%; padding:5pt; font-size:11pt;">CHỨC VỤ</td>
                <td style="border:1.0pt solid windowtext; width:20%; padding:5pt; font-size:11pt;">KÝ TÊN</td>
              </tr>

              <!-- Row 3: Biên soạn (85pt height) -->
              <tr style="height:85pt; text-align:center;">
                <td style="border:1.0pt solid windowtext; padding:5pt; font-weight:bold; vertical-align:middle;">Biên soạn</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">${issuerName}</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">Người soạn thảo</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">&nbsp;</td>
              </tr>

              <!-- Row 4: Phê duyệt (85pt height) -->
              <tr style="height:85pt; text-align:center;">
                <td style="border:1.0pt solid windowtext; padding:5pt; font-weight:bold; vertical-align:middle;">Phê duyệt</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">${approverName}</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">Trưởng Phòng</td>
                <td style="border:1.0pt solid windowtext; padding:5pt; vertical-align:middle;">&nbsp;</td>
              </tr>
            </tbody>
          </table>
        `;
        coverBox.parentNode.replaceChild(coverTable.firstElementChild, coverBox);
      }

      // 2. REMOVE all inline footers completely so no floating tables remain in Word
      page.querySelectorAll('.iso-a4-sheet-footer, .word-doc-footer-table, .iso-sheet-page-num, .MsoFooter').forEach(el => el.remove());
      const lastTbl = page.querySelector('.no-border:last-of-type');
      if (lastTbl && (lastTbl.innerText || '').includes('Mã hiệu:')) {
        lastTbl.remove();
      }

      pageContents.push(page.innerHTML);
    });

    if (pageContents.length === 0) {
      pageContents.push(clone.innerHTML);
    }

    // Join pages with clean paragraph breaks (standard for MS Word HTML)
    let html = pageContents.join('\n<p style="page-break-before:always; clear:both; mso-break-type:section-break">&nbsp;</p>\n');

    // Ensure relative assets are resolved with absolute web origin paths
    const origin = window.location.origin;
    html = html.replace(/src="\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="\.\/assets\//g, `src="${origin}/assets/`);
    html = html.replace(/src="assets\//g, `src="${origin}/assets/`);

    const documentHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <title>${formData.name || 'Quy trình ISO'}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt; /* A4 width/height in points */
              margin: 72.0pt 72.0pt 72.0pt 72.0pt; /* 1.0 inch exact standard margins matching G7.CL-QT01 */
              mso-header-margin: 36.0pt;
              mso-footer-margin: 36.0pt;
              mso-title-page: yes; /* Activates Different First Page in Word */
              mso-first-page-footer: f0;
              mso-footer: f1;
            }
            div.Section1 {
              page: Section1;
            }
            body, p, span, div, table, tr, td, th, h1, h2, h3, h4, h5, h6 {
              font-family: "Times New Roman", Times, serif !important;
            }
            body {
              font-size: 12pt;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            tr {
              page-break-inside: avoid;
            }
            th, td {
              border: 1.0pt solid windowtext;
              mso-border-alt: 0.5pt solid windowtext;
              padding: 5px 6px;
              vertical-align: middle;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
            }
            table.header-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              margin-bottom: 12px !important;
            }
            table.header-table td {
              border: none !important;
              mso-border-alt: none !important;
              padding: 8px !important;
            }
            table.dashed-table {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              margin: 0 auto 12px auto !important;
            }
            table.dashed-table td {
              border: 1.0pt dashed windowtext !important;
              mso-border-alt: dashed windowtext 0.5pt !important;
              padding: 4px 8px !important;
            }
            table.cover-border-box-table {
              border: 1.5pt solid windowtext !important;
              mso-border-alt: solid windowtext 1.5pt !important;
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 0 !important;
            }
            table.cover-border-box-table td {
              padding: 6pt !important;
            }
            table.no-border, table.no-border tr, table.no-border td {
              border: none !important;
              mso-border-alt: none !important;
            }
            table.MsoFooter {
              width: 100%;
              border-collapse: collapse;
              border: none !important;
              border-top: 1.0pt solid windowtext !important;
              font-family: 'Times New Roman', serif;
              font-size: 10pt;
              font-style: normal;
            }
            table.MsoFooter td {
              border: none !important;
              padding: 3pt 0 !important;
            }
            h1.iso-doc-heading, h1 {
              font-size: 14pt;
              font-weight: bold;
              margin: 12px 0 6px 0;
            }
            h3 {
              font-size: 12pt;
              font-weight: bold;
              margin: 12px 0 6px 0;
              border-bottom: 1.0pt solid windowtext;
              padding-bottom: 2px;
            }
            h4 {
              font-size: 11pt;
              font-weight: bold;
              margin: 10px 0 4px 0;
            }
            .instruction-grid {
              width: 100%;
            }
            .instruction-card {
              border: 1.0pt solid windowtext;
              padding: 8px;
              margin-bottom: 12px;
            table.MsoFooter, table.MsoFooter tr, table.MsoFooter td {
              border: none !important;
              mso-border-alt: none !important;
              mso-border-top-alt: none !important;
              mso-border-bottom-alt: none !important;
              mso-border-left-alt: none !important;
              mso-border-right-alt: none !important;
            }
            table.MsoFooter {
              border-top: 1.0pt solid windowtext !important;
              mso-border-top-alt: 1.0pt solid windowtext !important;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            ${html}
          </div>
          <!-- Suppress footer on cover page -->
          <div style="mso-element:footer" id="f0">
            <p class="MsoFooter" style="margin:0; font-size:1pt; line-height:1pt;">&nbsp;</p>
          </div>
          <!-- Real Word Footer pinned to bottom margin of page 2 and onwards (Khong co ke khung o, chi co duong ke ngang don o tren) -->
          <div style="mso-element:footer" id="f1">
            <table class="MsoFooter" border="0" cellspacing="0" cellpadding="0" style="width:100%; border-collapse:collapse; border:none !important; mso-border-alt:none !important; border-top:1.0pt solid windowtext !important; mso-border-top-alt:1.0pt solid windowtext !important; font-family:'Times New Roman',serif; font-size:10pt; color:#0D0D0D; margin-top:4pt;">
              <tr style="border:none !important; mso-border-alt:none !important;">
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:left; width:28%;">Mã hiệu: ${effCode}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:center; width:22%;">Lần ban hành: ${effVer}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:center; width:28%;">Ngày ban hành: ${effDate}</td>
                <td style="border:none !important; mso-border-alt:none !important; padding:3pt 0; text-align:right; width:22%;">Trang: <span style="mso-field-code: PAGE ">1</span>/<span style="mso-field-code: NUMPAGES ">${validPages?.length || 6}</span></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + documentHtml], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docCode}_${docName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet: Thông tin chung & Các bước quy trình (kèm lưu đồ)
      const stepsData = (formData.steps || []).map((s, idx) => ({
        "Bước": `Bước ${s.step_number || (idx + 1)}`,
        "Tên bước / Thao tác": s.name || '',
        "Bộ phận / Trách nhiệm": s.assignee_role || '',
        "Hình khối lưu đồ": s.node_type === 'decision' ? 'Quyết định (Hình thoi)' : (s.node_type === 'terminal' ? 'Oval (Bắt đầu/Kết thúc)' : 'Bước xử lý (Chữ nhật)'),
        "Biểu mẫu / Phụ lục": s.template_files || '',
        "Hướng dẫn / Diễn giải chi tiết": (s.instructions || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }));

      const infoRows = [
        ["THÔNG TIN QUY TRÌNH ISO"],
        ["Mã quy trình:", formData.code || '---'],
        ["Mã chuẩn hóa mới:", formData.new_code || '---'],
        ["Tên quy trình:", formData.name || '---'],
        ["Bộ phận quản lý:", formData.department_name || '---'],
        ["Lần ban hành:", formData.version || '01'],
        ["Ngày ban hành:", formData.issue_date || '---'],
        ["Người biên soạn:", formData.owner || formData.editor || '---'],
        ...(formData.document_level === 'Cấp công ty' ? [
          ["Người xem xét (Trưởng phòng):", formData.approver || '---'],
          ["Người phê duyệt (Ban Giám Đốc):", formData.approver_bgd || '---']
        ] : [
          ["Người phê duyệt (Trưởng phòng):", formData.approver || '---']
        ]),
        [],
        ["DANH SÁCH CÁC BƯỚC QUY TRÌNH & LƯU ĐỒ"]
      ];

      const wsProcess = XLSX.utils.aoa_to_sheet(infoRows);
      XLSX.utils.sheet_add_json(wsProcess, stepsData, { origin: "A12" });

      wsProcess['!cols'] = [
        { wch: 14 },
        { wch: 38 },
        { wch: 28 },
        { wch: 26 },
        { wch: 28 },
        { wch: 65 },
      ];

      XLSX.utils.book_append_sheet(wb, wsProcess, "Quy trình & Lưu đồ");

      // 2. Sheet: Biểu mẫu liên quan
      if (formData.related_templates && formData.related_templates.length > 0) {
        const templatesData = formData.related_templates.map((t, idx) => ({
          "STT": idx + 1,
          "Mã biểu mẫu": t.code || '',
          "Tên biểu mẫu / Tài liệu": t.name || t.title || '',
          "Phòng ban": t.folder || '',
          "Trạng thái": t.status || '',
          "Ngày ban hành": t.issue_date || ''
        }));
        const wsTemplates = XLSX.utils.json_to_sheet(templatesData);
        wsTemplates['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsTemplates, "Biểu mẫu liên quan");
      }

      // 3. Sheet: Lịch sử sửa đổi
      if (formData.revision_logs && formData.revision_logs.length > 0) {
        const logsData = formData.revision_logs.map(l => ({
          "Số TT": l.seq_no || '',
          "Ngày sửa": l.rev_date || '',
          "Nội dung sửa đổi": l.content || '',
          "Trang số": l.page_no || '',
          "Người sửa đổi": l.modifier || ''
        }));
        const wsLogs = XLSX.utils.json_to_sheet(logsData);
        wsLogs['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 45 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsLogs, "Theo dõi sửa đổi");
      }

      const fileName = `${formData.code || 'ISO'}_${formData.name || 'Quy_trinh'}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Lỗi xuất Excel quy trình:", err);
      alert("Không thể xuất file Excel. Vui lòng thử lại.");
    }
  };

  const handleAutoLayoutClassic = useCallback(() => {
    const steps = formData.steps || [];
    if (steps.length === 0) return;

    // 1. Get unique roles in order of appearance
    const uniqueRoles = [];
    steps.forEach(s => {
      const role = s.assignee_role || "";
      if (role && !uniqueRoles.includes(role)) {
        uniqueRoles.push(role);
      }
    });
    if (uniqueRoles.length === 0) {
      uniqueRoles.push("");
    }

    // 2. Identify sidesteps (fail paths)
    const getSidesteps = () => {
      const sidesteps = new Set();
      steps.forEach(s => {
        if (s.node_type === 'decision') {
          const failPath = s.fail_path || [];
          const noStepNum = failPath[0]?.return_to_step;
          if (noStepNum) {
            sidesteps.add(noStepNum);
            let current = noStepNum;
            while (current) {
              const currStep = steps.find(st => String(st.step_number) === String(current));
              const next = currStep?.transition?.next_step || currStep?.next_step;
              if (next && String(next) !== String(current) && !steps.some(st => String(st.step_number) === String(next) && st.node_type === 'decision')) {
                sidesteps.add(next);
                current = next;
              } else break;
            }
          }
        }
      });
      return sidesteps;
    };

    const sidesteps = getSidesteps();
    const mainSteps = steps.filter(s => !sidesteps.has(s.step_number));
    const positions = {};

    const getNodeDimensions = (nodeType) => {
      if (nodeType === "decision") return { width: 86, height: 86 };
      if (nodeType === "terminal") return { width: 120, height: 44 };
      return { width: 140, height: 54 }; // task
    };

    // 3. Lay out main steps vertically
    mainSteps.forEach((step, idx) => {
      const role = step.assignee_role || "";
      const roleIdx = uniqueRoles.indexOf(role);
      const colCenter = 300 + (roleIdx >= 0 ? roleIdx : 0) * 280;

      const { width } = getNodeDimensions(step.node_type);
      positions[step.step_number] = {
        x: colCenter - width / 2,
        y: 60 + idx * 140
      };
    });

    // 4. Lay out sidesteps to the left column relative to their parent decision step
    mainSteps.forEach((step, idx) => {
      if (step.node_type === 'decision') {
        const failPath = step.fail_path || [];
        const noStepNum = failPath[0]?.return_to_step;
        if (noStepNum && sidesteps.has(noStepNum)) {
          const parentY = positions[step.step_number]?.y || (60 + idx * 140);
          const parentRole = step.assignee_role || "";
          const parentRoleIdx = uniqueRoles.indexOf(parentRole);
          const colCenter = 300 + (parentRoleIdx >= 0 ? parentRoleIdx : 0) * 280;
          const sideCenter = colCenter - 180;

          const firstStep = steps.find(st => st.step_number === noStepNum);
          let startY = parentY;
          if (firstStep) {
            const { height: childHeight } = getNodeDimensions(firstStep.node_type);
            startY = parentY + 43 - childHeight / 2;
          }

          let current = noStepNum;
          let chainIdx = 0;
          const visited = new Set();

          while (current && !visited.has(current)) {
            visited.add(current);
            const currStep = steps.find(st => st.step_number === current);
            if (currStep) {
              const { width } = getNodeDimensions(currStep.node_type);
              positions[current] = {
                x: sideCenter - width / 2,
                y: startY + chainIdx * 130
              };
            }

            const next = currStep?.transition?.next_step || currStep?.next_step;
            if (next && sidesteps.has(next)) {
              current = next;
              chainIdx++;
            } else {
              break;
            }
          }
        }
      }
    });

    // 5. Update steps
    setFormData(prev => {
      const nextSteps = prev.steps.map(s => {
        const pos = positions[s.step_number];
        if (pos) {
          return { ...s, x_pos: pos.x, y_pos: pos.y };
        }
        return s;
      });
      return { ...prev, steps: nextSteps };
    });
  }, [formData.steps]);

  const handlePositionsChange = useCallback(({ type, stepNumber, branchIdx, x, y }) => {
    setFormData(prev => {
      const nextSteps = [...prev.steps];
      const stepIdx = nextSteps.findIndex(s => s.step_number === stepNumber);
      if (stepIdx < 0) return prev;

      if (type === 'step') {
        nextSteps[stepIdx] = { ...nextSteps[stepIdx], x_pos: x, y_pos: y };
      } else if (type === 'branch') {
        const currentPath = [...(nextSteps[stepIdx].fail_path || [])];
        if (currentPath[branchIdx]) {
          currentPath[branchIdx] = { ...currentPath[branchIdx], x_pos: x, y_pos: y };
          nextSteps[stepIdx] = { ...nextSteps[stepIdx], fail_path: currentPath };
        }
      }
      return { ...prev, steps: nextSteps };
    });
  }, []);

  const handleAddStepFromCanvas = useCallback((nodeType, position) => {
    setFormData(prev => {
      const nextStepNum = prev.steps.length + 1;
      const newStep = {
        step_number: nextStepNum,
        name: nodeType === 'decision' ? `Kiểm tra ${nextStepNum}` : nodeType === 'terminal' ? `Kết thúc` : `Bước mới ${nextStepNum}`,
        assignee_role: 'QC',
        instructions: '',
        checklist: [],
        transition: { next_step: nextStepNum + 1, image_url: '' },
        flow_node_id: `node_${nextStepNum}`,
        node_type: nodeType,
        has_branch: false,
        fail_path: [],
        x_pos: position.x,
        y_pos: position.y,
        image_url: ''
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
    setSelectedStepIdx(formData.steps.length);
  }, [formData.steps]);

  const handleNodeSelect = useCallback((stepNumber) => {
    const idx = formData.steps.findIndex(s => s.step_number === stepNumber);
    if (idx >= 0) {
      setSelectedStepIdx(idx);
    }
  }, [formData.steps]);

  const handleImageUpload = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateStep(index, 'image_url', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const triggerDownload = () => {
    alert("Đang khởi tạo tải xuống tài liệu quy trình dạng PDF/Word...");
  };

  // Helper tính tổng số trang thực tế hiện có của tài liệu
  const getTotalDocumentPages = useCallback(() => {
    try {
      const sheets = document.querySelectorAll('.iso-a4-sheet');
      if (sheets && sheets.length > 0) {
        return sheets.length;
      }
    } catch (e) {}

    const fullHtml = formData.sections?.['__full_html__'] || formData.sections?.['__full_document_html__'] || '';
    if (fullHtml) {
      const matches = fullHtml.match(/data-page="(\d+)"/g);
      if (matches && matches.length > 0) {
        const nums = matches.map(m => parseInt(m.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          return Math.max(...nums);
        }
      }
    }

    const stepCount = (formData.steps || []).length;
    if (stepCount > 8) return 4;
    return 3;
  }, [formData.sections, formData.steps]);

  // Helpers cho combobox chọn nhiều số trang thay đổi
  const currentPagesVal = formData.revision_page_no || 'Toàn bộ';
  const isAllPagesSelected = !currentPagesVal || currentPagesVal.toLowerCase().includes('toàn bộ') || currentPagesVal.toLowerCase().includes('tất cả');
  const selectedPagesList = useMemo(() => {
    if (isAllPagesSelected) return [];
    const matches = currentPagesVal.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  }, [currentPagesVal, isAllPagesSelected]);

  const handleTogglePageSelection = (pageNum, total) => {
    if (pageNum === 'all') {
      handleInputChange('revision_page_no', 'Toàn bộ');
      return;
    }
    let updated = [];
    if (isAllPagesSelected) {
      updated = [pageNum];
    } else if (selectedPagesList.includes(pageNum)) {
      updated = selectedPagesList.filter(p => p !== pageNum);
    } else {
      updated = [...selectedPagesList, pageNum].sort((a, b) => a - b);
    }

    if (updated.length === 0 || updated.length === total) {
      handleInputChange('revision_page_no', 'Toàn bộ');
    } else {
      handleInputChange('revision_page_no', `Trang ${updated.join(', ')}`);
    }
  };

  // --- SAVE FORM ---
  const handleSaveForm = async (options = {}) => {
    const effectiveNewCode = (formData.new_code || '').trim();
    const effectiveCode = (formData.code || '').trim() || effectiveNewCode;
    if (!effectiveCode && !effectiveNewCode) {
      showFeedback('error', 'Mã tài liệu / quy trình không được để trống');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      showFeedback('error', 'Tên tài liệu / quy trình là bắt buộc');
      return;
    }

    // Tạm thời tắt bắt buộc modal ghi nhận lịch sử sửa đổi (theo yêu cầu người dùng: không cần bắt buộc)
    /*
    if (isEditMode && !options?.skipModal) {
      const directNote = (formData.revision_note || '').trim();
      if (directNote) {
        options = {
          ...(options || {}),
          skipModal: true,
          revisionNote: directNote,
          revisionPageNo: formData.revision_page_no || 'Toàn bộ'
        };
      } else {
        setPendingSaveOptions(options);
        setShowRevisionModal(true);
        return;
      }
    }
    */

    setLoading(true);
    try {
      const nodes = [];
      const links = [];

      formData.steps.forEach((step, idx) => {
        let nodeType = step.node_type || 'task';
        nodes.push({
          id: step.flow_node_id,
          label: `B${step.step_number}: ${step.name}`,
          type: nodeType,
          role: step.assignee_role,
          x: step.x_pos || 250,
          y: step.y_pos || (80 + idx * 120)
        });

        if (idx > 0) {
          links.push({
            from: formData.steps[idx-1].flow_node_id,
            to: step.flow_node_id,
            label: 'Đạt'
          });
        }
      });

      const stepsToSave = formData.steps.map(step => {
        const tFiles = step.template_files || step.transition?.template_files || '';
        const std = step.standard || step.transition?.standard || '';
        const nextTransition = {
          ...(step.transition || {}),
          template_files: tFiles,
          standard: std,
          node_type: step.node_type || 'task',
          has_branch: step.has_branch || false,
          fail_path: getStepFailPath(step),
          image_url: step.image_url || ''
        };
        return {
          ...step,
          template_files: tFiles,
          standard: std,
          transition: nextTransition
        };
      });

      const flattenedInstructionSteps = (formData.work_instructions?.[0]?.steps || []).map(step => ({
        id: step.id,
        step_number: step.step_number,
        name: step.name,
        image_url: step.image_urls?.[0] || ''
      }));

      // Lấy live HTML từ DOM của bộ soạn thảo Word A4 nếu đang mở
      let liveWordHtml = formData.sections?.__full_html__;
      try {
        const wordEditorEl = document.querySelector('.iso-word-a4-page');
        if (wordEditorEl && wordEditorEl.innerHTML && wordEditorEl.innerHTML.trim().length > 50) {
          liveWordHtml = wordEditorEl.innerHTML;
        }
      } catch (e) {
        console.warn('Could not read wordEditorEl from DOM:', e);
      }

      // 1. Trích xuất snapshot JSON và export docx từ Canvas Editor nếu iframe đang mở
      let liveCanvasSnapshot = formData.sections?.__canvas_editor_data__;
      let liveFilePath = formData.file_path || formData.docx_path || '';

      try {
        const iframeEl = document.querySelector('iframe[src*="canvas-editor"]');
        const iframeWin = iframeEl?.contentWindow;
        const canvasEditor = iframeWin?.editor || iframeWin?.__CANVAS_EDITOR_INSTANCE__;
        if (canvasEditor) {
          if (typeof canvasEditor.command?.getValue === 'function') {
            const ceVal = canvasEditor.command.getValue();
            if (ceVal && ceVal.data && (ceVal.data.main || Array.isArray(ceVal.data))) {
              liveCanvasSnapshot = JSON.stringify(ceVal.data);
            }
          }
// Bỏ exportDocx tự động khi lưu để tránh browser tự tải file docx về máy
        }
      } catch (ceErr) {
        console.warn('Lỗi lấy snapshot từ Canvas Editor:', ceErr);
      }

      const finalPayload = {
        ...formData,
        code: effectiveCode,
        new_code: effectiveNewCode,
        file_path: liveFilePath || formData.file_path || formData.docx_path || '',
        docx_path: liveFilePath || formData.docx_path || formData.file_path || '',
        original_file_path: formData.original_file_path || '',
        original_file_name: formData.original_file_name || '',
        department_id: formData.department_id || null,
        department_name: formData.department_name || '',
        doc_type_id: formData.doc_type_id || null,
        doc_type_code: formData.doc_type_code || '',
        editor: formData.editor || formData.owner || loggedInUser.full_name || loggedInUser.username || '',
        owner: formData.editor || formData.owner || loggedInUser.full_name || loggedInUser.username || '',
        issuer: loggedInUser.full_name || loggedInUser.username || formData.issuer || '',
        approver: formData.approver || '',
        approver_bgd: formData.document_level === 'Cấp công ty' 
          ? (formData.approver_bgd || (bgdList.length > 0 ? bgdList[0].full_name : 'Nguyễn Hòa'))
          : '',
        display_at: formData.folder,
        notes: formData.revision_note || formData.notes || formData.doc_type || '',
        revision_note: options?.revisionNote || formData.revision_note || '',
        revision_page_no: options?.revisionPageNo || formData.revision_page_no || 'Toàn bộ',
        steps: stepsToSave,
        diagram_data: JSON.stringify({ nodes, links }),
        sections: {
          ...(formData.sections || {}),
          ...(liveCanvasSnapshot ? { '__canvas_editor_data__': liveCanvasSnapshot } : {}),
          ...(liveWordHtml ? { '__full_html__': liveWordHtml } : {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {}),
          '__metadata_instruction_steps__': JSON.stringify(flattenedInstructionSteps),
          '__metadata_work_instructions__': JSON.stringify(formData.work_instructions || []),
          '__metadata_related_templates__': JSON.stringify(formData.related_templates || [])
        }
      };

      const url = isProcessMode ? '/iso-documents/processes/save' : '/iso-documents/save';
      const res = await api.post(url, finalPayload);
      showFeedback('success', res?.message || 'Lưu tài liệu quy trình ISO thành công!');

      setFormData(prev => ({
        ...prev,
        id: res?.id || prev.id,
        file_path: liveFilePath || res?.file_path || prev.file_path,
        docx_path: liveFilePath || res?.file_path || prev.docx_path,
        original_file_path: res?.original_file_path || prev.original_file_path,
        original_file_name: res?.original_file_name || prev.original_file_name,
        sections: finalPayload.sections,
        revision_logs: (res?.revision_logs && res.revision_logs.length > 0) ? res.revision_logs : prev.revision_logs
      }));

      // Giữ người dùng ở lại trang sau khi lưu thành công (không tự động quay lại)
      return res;

    } catch (error) {
      console.error('Lỗi khi lưu quy trình:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ dữ liệu quy trình');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận từ Revision Log Modal và thực thi lưu dữ liệu
  const handleConfirmRevisionSave = async ({ revisionNote, revisionPageNo }) => {
    setShowRevisionModal(false);
    setFormData(prev => ({
      ...prev,
      revision_note: revisionNote,
      revision_page_no: revisionPageNo
    }));
    const optionsToRun = {
      ...(pendingSaveOptions || {}),
      skipModal: true,
      revisionNote,
      revisionPageNo
    };
    await handleSaveForm(optionsToRun);
  };

  // Card panel style helpers
  const cardBorderColor = isDark ? '#4D4742' : '#7B5233';
  const headerBgColor = isDark ? '#383431' : '#FAF6F0';
  const accentColor = isDark ? '#D8B282' : '#7B5233';

  const cardStyle = {
    backgroundColor: isDark ? '#302D2A' : 'white',
    borderRadius: '6px',
    border: `1.5px solid ${cardBorderColor}`,
    overflow: 'hidden',
    boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(123, 82, 51, 0.02)',
    marginBottom: '16px'
  };

  const headerStyle = {
    backgroundColor: headerBgColor,
    padding: '10px 14px',
    borderBottom: `1.5px solid ${cardBorderColor}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  };

  const headerTextStyle = {
    fontWeight: 'bold',
    color: accentColor,
    fontSize: '0.84rem',
    textTransform: 'uppercase'
  };
  const isStepSelected = selectedStepIdx !== -1 && selectedStepIdx !== null && selectedStepIdx !== undefined && formData.steps && formData.steps[selectedStepIdx];
  const isFlowchartActive = activeTab === 'content' && formData.section_types?.[activeMenu] === 'flowchart';

  const editor = {
    accentColor,
    activeMenu,
    activeTab,
    autoPrintTriggered,
    backPath,
    cardBorderColor,
    cardStyle,
    isDark,
    theme,
    currentScreen,
    departmentsList,
    editingStepIdx,
    explanationExpanded,
    fetchDocDetails,
    fileInputRef,
    flowchartCanvasRef,
    flowchartMode,
    formData,
    getMaxLeftChainLength,
    getSectionHint,
    getSidestepsInfo,
    getStepDisplayLabels,
    getStepFailPath,
    handleAddInstructionStep,
    handleAddRelatedTemplate,
    handleAddStep,
    handleAddStepFromCanvas,
    handleAddWorkInstruction,
    handleAutoLayoutClassic,
    handleCanvasMouseDown,
    handleDeleteAttachment,
    handleDeleteRelatedTemplate,
    handleDownloadDoc,
    handleImageUpload,
    handleInputChange,
    handleNodeSelect,
    handleOpenAddStepPopup,
    handleOpenEditStepPopup,
    handleOpenSystemTemplatesModal,
    handlePopupImageUpload,
    handlePositionsChange,
    handlePrintPdf,
    handleQuickFailPathChange,
    handleQuickTransitionChange,
    handleRemoveInstructionStep,
    handleRemoveStep,
    handleRemoveWorkInstruction,
    handleRemoveWorkInstructionStep,
    handleReorderStepInPopup,
    handleSaveForm,
    handleSaveStep,
    handleConfirmRevisionSave,
    getTotalDocumentPages,
    showRevisionModal,
    setShowRevisionModal,
    handleSectionChange,
    handleSetFlowchartMode,
    handleToggleScreen,
    handleUpdateInstructionStep,
    handleUpdateRelatedTemplate,
    handleUpdateStep,
    handleUpdateSystemTemplates,
    handleUpdateWorkInstructionNote,
    handleUpdateWorkInstructionScope,
    handleUpdateWorkInstructionTitle,
    handleUploadAttachment,
    handleUploadChildFiles,
    handleDeleteChildFile,
    handleWordUpload,
    headerStyle,
    headerTextStyle,
    historyAccordionExpanded,
    infoExpanded,
    isEditMode,
    isEditingStep,
    isProcessMode,
    isScreenDropdownOpen,
    isStepSelected,
    maxLeftChainLength,
    message,
    navigate,
    renderSingleStepCard,
    searchTemplateQuery,
    selectedInstructionId,
    selectedStepIdx,
    selectedTemplateId,
    setActiveMenu,
    setActiveTab,
    setAutoPrintTriggered,
    setCurrentScreen,
    setEditingStepIdx,
    setExplanationExpanded,
    setFlowchartMode,
    setFormData,
    setHistoryAccordionExpanded,
    setInfoExpanded,
    setIsEditingStep,
    setIsScreenDropdownOpen,
    setLoading,
    setMessage,
    setSearchTemplateQuery,
    setSelectedInstructionId,
    setSelectedStepIdx,
    setSelectedTemplateId,
    setShowPdfPreview,
    handleOpenPdfPreview,
    setShowStepPopup,
    setShowSystemTemplatesModal,
    setStepForm,
    setStepsAccordionExpanded,
    setSystemScreens,
    setSystemTemplates,
    setSystemTemplatesDepartmentFilter,
    setSystemTemplatesFilterOpen,
    setTempCheckedIds,
    setUploadLoading,
    setZoomScale,
    showFeedback,
    showPdfPreview,
    showStepPopup,
    showSystemTemplatesModal,
    sidestepSet,
    stepDisplayLabels,
    stepForm,
    stepsAccordionExpanded,
    systemScreens,
    systemTemplates,
    systemTemplatesDepartmentFilter,
    systemTemplatesFilterOpen,
    tempCheckedIds,
    uploadLoading,
    zoomScale,
  };

  const { effCode, effVer, effDate } = getEffectiveFooterData(formData);

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      color: isDark ? '#F7F3EF' : '#2D1A12',
      backgroundColor: isDark ? '#242220' : '#FAF8F5',
      minHeight: '100vh',
      width: '100%'
    }}>

      {/* Top Action bar */}
      {/* Top action bar: Chỉ hiển thị khi ở màn hình phụ (flowchart/diagram) để có nút Quay lại */}
      {currentScreen !== 'overview' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isDark ? '#302D2A' : 'white',
          padding: '10px 18px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#4D4742' : '#EADCC9'}`,
          boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(45, 26, 18, 0.02)',
          width: '100%',
          marginBottom: '4px'
        }}>
          <button
            onClick={() => setCurrentScreen('overview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: isDark ? '#D8B282' : '#7B5233',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Quay lại trang thông tin
          </button>

          <button
            onClick={handleSaveForm}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#7B5233',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '4px',
              fontSize: '0.84rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(123, 82, 51, 0.15)'
            }}
          >
            <Save size={15} /> {loading ? 'Đang lưu...' : (isProcessMode ? 'Lưu quy trình' : 'Lưu Mẫu ISO')}
          </button>
        </div>
      )}

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
          color: message.type === 'success' ? '#137333' : '#c5221f',
          border: `1px solid ${message.type === 'success' ? '#137333' : '#c5221f'}`,
          width: '100%'
        }}>
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* --- SCREEN 1: OVERVIEW SCREEN (Màn hình chính) --- */}
      {currentScreen === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>

          {/* Card: Thông tin quy trình - Có thể thu gọn/mở rộng */}
          <div style={{ ...cardStyle, overflow: 'visible' }}>
            <div
              style={{ ...headerStyle, borderTopLeftRadius: '5px', borderTopRightRadius: '5px', cursor: 'pointer' }}
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={headerTextStyle}>{isProcessMode ? 'Thông tin tài liệu' : 'Thông tin Mẫu ISO'}</span>
                {isEditMode && docList.length > 1 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: isDark ? '#3D3834' : '#FAF6F0',
                      border: `1px solid ${isDark ? '#4D4742' : '#EADCC9'}`,
                      borderRadius: '16px',
                      padding: '1px 6px',
                      userSelect: 'none'
                    }}
                    title="Chuyển tới lui giữa các tài liệu (Alt + Phím mũi tên)"
                  >
                    <button
                      type="button"
                      disabled={!prevDoc}
                      onClick={() => handleNavigateToDoc(prevDoc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px 2px',
                        cursor: prevDoc ? 'pointer' : 'not-allowed',
                        color: prevDoc ? (isDark ? '#D8B282' : '#7B5233') : (isDark ? '#6B635B' : '#CBD5E1'),
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={prevDoc ? `Tài liệu trước (Alt + ←): [${prevDoc.new_code || prevDoc.code}] ${prevDoc.name}` : 'Đã ở đầu'}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '0.70rem', fontWeight: '700', color: isDark ? '#D8B282' : '#7B5233', minWidth: '34px', textAlign: 'center' }}>
                      {currentIndex >= 0 ? `${currentIndex + 1}/${docList.length}` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={!nextDoc}
                      onClick={() => handleNavigateToDoc(nextDoc)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '1px 2px',
                        cursor: nextDoc ? 'pointer' : 'not-allowed',
                        color: nextDoc ? (isDark ? '#D8B282' : '#7B5233') : (isDark ? '#6B635B' : '#CBD5E1'),
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={nextDoc ? `Tài liệu kế tiếp (Alt + →): [${nextDoc.new_code || nextDoc.code}] ${nextDoc.name}` : 'Đã ở cuối'}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Nút Cập nhật từ Word */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  style={{ display: 'none' }}
                  onClick={(e) => { e.target.value = null; }}
                  onChange={handleWordUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#15803D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  title="Tải lên file Word (.docx, .doc) giữ nguyên 100% định dạng, khổ giấy, bảng biểu, hình ảnh"
                >
                  <Upload size={13} />
                  <span>{uploadLoading ? 'Đang đọc Word...' : 'Cập nhật từ Word (.docx, .doc)'}</span>
                </button>

                {/* NÚT 1: Xem bản gốc trung thực 100% */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFaithfulViewer();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#FFF7ED',
                    color: '#9A3412',
                    border: '1px solid #FED7AA',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  title="Xem từng trang tài liệu Word gốc: đúng khổ giấy, hướng ngang/dọc, lưu đồ, bảng, form 100% chuẩn (Được bảo toàn nguyên bản lúc tải lên, không bị ghi đè)"
                >
                  <Eye size={14} />
                  <span>
                    Xem bản gốc{faithfulPages.length > 0 ? ` (${faithfulPages.length} trang)` : ''}
                  </span>
                </button>

                {/* NÚT: So sánh song song bản gốc và bản soạn thảo */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof window.__openCompareMode__ === 'function') {
                      window.__openCompareMode__();
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#FAF4EF',
                    color: '#7B5233',
                    border: '1px solid #7B5233',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  title="Mở toàn màn hình so sánh song song với file Word gốc ban đầu (cuộn xem đầy đủ các trang)"
                >
                  <Columns size={14} />
                  <span>So sánh bản gốc</span>
                </button>

                {/* NÚT 2: Soạn thảo trực tiếp trên file Word gốc bằng ONLYOFFICE */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenOnlyOfficeModal();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  title="Mở trình soạn thảo Word trực tiếp trong trình duyệt bằng ONLYOFFICE"
                >
                  <Edit size={14} />
                  <span>Sửa trực tiếp Word</span>
                </button>

                {/* NÚT 3: Tải file Word gốc (.docx/.doc) */}
                {(formData.original_file_path || formData.file_path) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadOriginalWord();
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#FFFFFF',
                      color: '#7B5233',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Tải tệp tin Word gốc nguyên bản lúc tải lên về máy tính"
                  >
                    <Download size={13} />
                    <span>Tải bản gốc</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPdfPreview();
                  }}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#4A301C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={13} />
                  Xuất tài liệu
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveForm();
                  }}
                  disabled={loading}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#7B5233',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  title="Lưu toàn bộ thông tin quy trình, sơ đồ và nội dung văn bản"
                >
                  <Save size={14} />
                  <span>{loading ? 'Đang lưu...' : 'Lưu file'}</span>
                </button>
                <div style={{ width: '1px', height: '18px', backgroundColor: '#EADCC9', margin: '0 4px' }} />
                {infoExpanded ? <ChevronUp size={16} style={{color:accentColor}} /> : <ChevronDown size={16} style={{color:accentColor}} />}
              </div>
            </div>

            {infoExpanded && (
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${isDark ? '#4D4742' : '#EADCC9'}`, backgroundColor: isDark ? '#302D2A' : '#FFFFFF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px 12px', alignItems: 'start' }}>

                  {/* HÀNG 1: MÃ CŨ (25%) | MÃ MỚI (25%) | TÊN TÀI LIỆU (50%) */}
                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Mã cũ
                    </label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      placeholder="Mã cũ..."
                      title="Mã tài liệu cũ (tự động nhận diện từ file)"
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', fontWeight: '600', backgroundColor: '#FFFFFF', color: '#374151', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Mã mới
                    </label>
                    <input
                      type="text"
                      value={formData.new_code || ''}
                      readOnly
                      title="Mã mới là Key duy nhất do hệ thống tự sinh không trùng"
                      placeholder="G7.xx.yy.zz"
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #A7F3D0', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', fontWeight: '700', color: '#065F46', backgroundColor: '#ECFDF5', cursor: 'default', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 6', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Tên tài liệu <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nhập tên tài liệu..."
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', color: '#111827', fontWeight: '600', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* HÀNG 2: 4 DROPDOWN ĐỀU NHAU 25% (mỗi cột span 3) */}
                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Cấp tài liệu
                    </label>
                    <select
                      value={formData.document_level || 'Cấp phòng'}
                      onChange={(e) => handleDocumentLevelChange(e.target.value)}
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937', boxSizing: 'border-box' }}
                    >
                      <option value="Cấp phòng">Cấp phòng</option>
                      <option value="Cấp công ty">Cấp công ty</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Phòng ban
                    </label>
                    <select
                      value={formData.department_name || ''}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {allDepartmentOptions.map((dept, idx) => {
                        const dName = typeof dept === 'string' ? dept : dept.name;
                        const dKey = (typeof dept === 'object' && dept !== null && dept.id) ? dept.id : idx;
                        return (
                          <option key={dKey} value={dName}>
                            {dName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Loại tài liệu
                    </label>
                    <select
                      value={formData.doc_type_id || ''}
                      onChange={(e) => handleDocTypeChange(e.target.value)}
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Chọn loại tài liệu --</option>
                      {docTypes.map(dt => (
                        <option key={dt.id} value={dt.id}>
                          {dt.code} - {dt.name} {dt.description ? `(${dt.description})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Trạng thái
                    </label>
                    <select
                      value={formData.status === 'Nháp' ? 'Soạn thảo' : (formData.status || 'Soạn thảo')}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937', boxSizing: 'border-box' }}
                    >
                      <option value="Soạn thảo">Soạn thảo</option>
                      <option value="Chờ xem xét">Chờ xem xét</option>
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Hiệu lực">Hiệu lực</option>
                      <option value="Hết hiệu lực">Hết hiệu lực</option>
                      <option value="Chỉnh sửa">Chỉnh sửa</option>
                    </select>
                  </div>

                  {/* HÀNG 3: 4 CỘT KIỂM SOÁT ĐỀU NHAU 25% (mỗi cột span 3) */}
                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Người biên soạn
                    </label>
                    <input
                      type="text"
                      value={formData.editor !== undefined && formData.editor !== null ? formData.editor : (formData.owner || '')}
                      onChange={(e) => {
                        handleInputChange('editor', e.target.value);
                        handleInputChange('owner', e.target.value);
                      }}
                      placeholder="Nhập tên người biên soạn..."
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', backgroundColor: '#FFFFFF', color: '#1F2937', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* CỘT 2: Người xem xét (Trưởng phòng) nếu Cấp công ty, hoặc Người duyệt nếu Cấp phòng */}
                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {formData.document_level === 'Cấp công ty' ? 'Người xem xét (Trưởng phòng)' : 'Người duyệt (Trưởng phòng)'}
                    </label>
                    <select
                      value={formData.approver || ''}
                      onChange={(e) => handleInputChange('approver', e.target.value)}
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', color: '#1F2937', backgroundColor: '#FFFFFF', boxSizing: 'border-box', cursor: 'pointer' }}
                    >
                      <option value="">-- Chọn Trưởng phòng xem xét --</option>
                      {departmentHeads.map(acc => (
                        <option key={acc.id} value={acc.full_name}>
                          {acc.display_name || acc.full_name}
                        </option>
                      ))}
                      {formData.approver && !departmentHeads.some(a => a.full_name === formData.approver) && (
                        <option value={formData.approver}>{formData.approver}</option>
                      )}
                    </select>
                  </div>

                  {/* CỘT 3: Nếu Cấp công ty -> Người phê duyệt (Ban Giám Đốc); Nếu Cấp phòng -> Người cập nhật cuối cùng */}
                  {formData.document_level === 'Cấp công ty' ? (
                    <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                      <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#1E40AF', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Người phê duyệt (Ban Giám Đốc)
                      </label>
                      <select
                        value={formData.approver_bgd || ''}
                        onChange={(e) => handleInputChange('approver_bgd', e.target.value)}
                        style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1.5px solid #BFDBFE', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', color: '#1E3A8A', backgroundColor: '#EFF6FF', fontWeight: '600', boxSizing: 'border-box', cursor: 'pointer' }}
                      >
                        <option value="">-- Chọn Ban Giám Đốc phê duyệt --</option>
                        {bgdList.map(b => (
                          <option key={b.id} value={b.full_name}>
                            {b.display_name || b.full_name}
                          </option>
                        ))}
                        {formData.approver_bgd && !bgdList.some(b => b.full_name === formData.approver_bgd) && (
                          <option value={formData.approver_bgd}>{formData.approver_bgd}</option>
                        )}
                      </select>
                    </div>
                  ) : (
                    <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                      <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Người cập nhật cuối cùng
                      </label>
                      <input
                        type="text"
                        value={loggedInUser.full_name || loggedInUser.username || formData.editor || formData.issuer || '---'}
                        readOnly
                        style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  <div style={{ gridColumn: 'span 3', minWidth: 0 }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Thời gian cập nhật
                    </label>
                    <input
                      type="text"
                      value={formData.updated_at ? new Date(formData.updated_at).toLocaleDateString('vi-VN') : (formData.issue_date || '')}
                      readOnly
                      style={{ width: '100%', height: '32px', padding: '2px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '0.80rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* HÀNG 4: 
                      - Cột 1 (span 3): CHỮ KÝ PHÊ DUYỆT (dưới Người biên soạn)
                      - Cột 2 (span 6): NỘI DUNG SỬA ĐỔI (dài từ Mã mới đến hết Tên tài liệu)
                      - Cột 3 (span 3): SỐ TRANG THAY ĐỔI (dài bằng Trạng thái / Thời gian cập nhật, là combobox chọn nhiều)
                  */}
                  <div style={{ gridColumn: 'span 3', minWidth: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Chữ ký phê duyệt
                    </label>
                    <ApprovalSignatureSection
                      documentLevel={formData.document_level || 'Cấp phòng'}
                      author={formData.editor || formData.owner || ''}
                      approver={formData.approver || ''}
                      approverBgd={formData.document_level === 'Cấp công ty' ? (formData.approver_bgd || (bgdList.length > 0 ? bgdList[0].full_name : 'Ban Giám Đốc')) : ''}
                      approverCustomer={formData.approver_customer || ''}
                      department={getDepartmentAcronym(formData.department_name)}
                      status={formData.status}
                      hideLabel={true}
                      boxHeight={76}
                      fullWidth={true}
                    />
                  </div>

                  {/* NỘI DUNG SỬA ĐỔI (span 6: dài từ Mã mới qua hết Tên tài liệu) */}
                  <div style={{ gridColumn: 'span 6', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      <span>Nội dung sửa đổi <span style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: 'normal', textTransform: 'none' }}>(Tùy chọn)</span></span>
                      <span style={{ fontSize: '0.64rem', color: '#7B5233', fontWeight: '600', textTransform: 'none' }}>(Ghi nhận vào bảng nhật ký Trang 2)</span>
                    </label>
                    <textarea
                      value={formData.revision_note || ''}
                      onChange={(e) => handleInputChange('revision_note', e.target.value)}
                      placeholder="Nhập chi tiết nội dung đã thay đổi (Ví dụ: Cập nhật bước thực hiện, bổ sung checklist, sửa đổi lưu đồ...)"
                      style={{
                        width: '100%',
                        height: '76px',
                        minHeight: '76px',
                        maxHeight: '76px',
                        padding: '6px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        color: '#1F2937',
                        lineHeight: '1.4',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>

                  {/* SỐ TRANG THAY ĐỔI (span 3: dài bằng Trạng thái / Thời gian cập nhật, là combobox chọn nhiều) */}
                  <div ref={pageSelectRef} style={{ gridColumn: 'span 3', minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <label style={{ fontSize: '0.70rem', fontWeight: '700', color: '#4B5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      <span>Số trang thay đổi <span style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: 'normal', textTransform: 'none' }}>(Tùy chọn)</span></span>
                      <span style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 'normal', textTransform: 'none' }}>(Chọn nhiều)</span>
                    </label>

                    {/* Combobox Trigger */}
                    <div
                      onClick={() => setPageSelectOpen(!pageSelectOpen)}
                      style={{
                        width: '100%',
                        height: '32px',
                        padding: '2px 8px',
                        border: pageSelectOpen ? `1.5px solid ${isDark ? '#C49A6C' : '#7B5233'}` : `1px solid ${isDark ? '#453327' : '#D1D5DB'}`,
                        borderRadius: '4px',
                        fontSize: '0.80rem',
                        fontWeight: '600',
                        color: isDark ? '#F5EDE6' : '#1F2937',
                        backgroundColor: isDark ? '#201814' : '#FFFFFF',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: pageSelectOpen ? `0 0 0 2px ${isDark ? 'rgba(196,154,108,0.2)' : 'rgba(123,82,51,0.1)'}` : 'none',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isAllPagesSelected ? (
                          <span style={{ color: isDark ? '#C49A6C' : '#7B5233', fontWeight: '700' }}>Toàn bộ tài liệu</span>
                        ) : selectedPagesList.length > 0 ? (
                          selectedPagesList.map(p => (
                            <span
                              key={p}
                              style={{
                                backgroundColor: isDark ? '#2D221D' : '#FAF6F0',
                                color: isDark ? '#C49A6C' : '#7B5233',
                                border: `1px solid ${isDark ? '#453327' : '#EADCC9'}`,
                                borderRadius: '3px',
                                padding: '1px 5px',
                                fontSize: '0.72rem',
                                fontWeight: '700'
                              }}
                            >
                              Trang {p}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: isDark ? '#7A695E' : '#9CA3AF', fontWeight: 'normal' }}>Chọn trang...</span>
                        )}
                      </div>
                      <ChevronDown
                        size={14}
                        style={{
                          color: isDark ? '#C49A6C' : '#64748B',
                          flexShrink: 0,
                          transform: pageSelectOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    </div>

                    {/* Combobox Dropdown Menu */}
                    {pageSelectOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '56px',
                          left: 0,
                          right: 0,
                          backgroundColor: isDark ? '#1A1411' : '#FFFFFF',
                          border: `1px solid ${isDark ? '#3A2B21' : '#CBD5E1'}`,
                          borderRadius: '6px',
                          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 6px 16px rgba(0,0,0,0.12)',
                          zIndex: 60,
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div
                          onClick={() => handleTogglePageSelection('all', getTotalDocumentPages())}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: isAllPagesSelected ? '700' : '500',
                            backgroundColor: isAllPagesSelected ? '#FAF6F0' : 'transparent',
                            color: isAllPagesSelected ? '#7B5233' : '#334155'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAllPagesSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                          />
                          <span>Toàn bộ tài liệu</span>
                        </div>

                        <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '3px 0' }} />

                        {Array.from({ length: Math.max(getTotalDocumentPages(), 4) }, (_, i) => i + 1).map((pg) => {
                          const isChecked = selectedPagesList.includes(pg);
                          return (
                            <div
                              key={pg}
                              onClick={() => handleTogglePageSelection(pg, getTotalDocumentPages())}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: isChecked ? '700' : '500',
                                backgroundColor: isChecked ? '#FAF6F0' : 'transparent',
                                color: isChecked ? '#7B5233' : '#334155'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                              />
                              <span>Trang {pg}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nút chọn nhanh số trang */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center', marginTop: '6px' }}>
                      {['Toàn bộ', ...Array.from({ length: Math.max(getTotalDocumentPages(), 4) }, (_, i) => `Trang ${i + 1}`)].map((pgLabel) => {
                        const pgVal = pgLabel === 'Toàn bộ' ? 'all' : parseInt(pgLabel.replace(/\D/g, ''), 10);
                        const isSelected = pgLabel === 'Toàn bộ' ? isAllPagesSelected : selectedPagesList.includes(pgVal);
                        return (
                          <button
                            key={pgLabel}
                            type="button"
                            onClick={() => handleTogglePageSelection(pgVal, getTotalDocumentPages())}
                            style={{
                              padding: '2px 5px',
                              fontSize: '0.66rem',
                              borderRadius: '3px',
                              border: isSelected ? '1px solid #7B5233' : '1px solid #E2E8F0',
                              backgroundColor: isSelected ? '#FAF6F0' : '#F8FAFC',
                              color: isSelected ? '#7B5233' : '#64748B',
                              fontWeight: isSelected ? '700' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {pgLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Tab Bar Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: isDark ? '2px solid #4D4742' : '2px solid #EADCC9',
            marginTop: '12px',
            marginBottom: '16px',
            gap: '4px'
          }}>
            {[
              { id: 'content', label: 'Nội dung Quy trình', icon: FileText },
              { id: 'instructions', label: 'Hướng dẫn thực hiện', icon: Activity },
              { id: 'templates', label: 'Tài liệu liên quan', icon: ListPlus },
              { id: 'history', label: 'Lịch sử kiểm tra', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setCurrentScreen('overview');
                    if (tab.id === 'instructions') {
                      const instructions = formData.work_instructions || [];
                      if (instructions.length > 0 && !selectedInstructionId) {
                        setSelectedInstructionId(instructions[0].id);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    border: isDark ? '1px solid #4D4742' : '1px solid #EADCC9',
                    borderBottom: isActive ? (isDark ? '2px solid #302D2A' : '2px solid white') : (isDark ? '1px solid #4D4742' : '1px solid #EADCC9'),
                    backgroundColor: isActive ? (isDark ? '#302D2A' : 'white') : (isDark ? '#383431' : '#FAF6F0'),
                    color: isActive ? (isDark ? '#D8B282' : '#7B5233') : (isDark ? '#DBD0C7' : '#64748b'),
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '-2px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = isDark ? '#433D39' : '#FAF0E6';
                      e.currentTarget.style.color = isDark ? '#D8B282' : '#7B5233';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = isDark ? '#383431' : '#FAF6F0';
                      e.currentTarget.style.color = isDark ? '#DBD0C7' : '#64748b';
                    }
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Card: Nội dung quy trình */}
          {activeTab === 'content' && <ProcessContentTab editor={editor} />}

          {/* Tab 2: Hướng dẫn thực hiện */}
          {activeTab === 'instructions' && <ProcessInstructionsTab editor={editor} />}

          {/* Tab 3: Tài liệu liên quan */}
          {activeTab === 'templates' && <ProcessTemplatesTab editor={editor} />}

          {/* Tab 3: Lịch sử kiểm tra */}
          {activeTab === 'history' && isProcessMode && (
            <div style={cardStyle}>
              <div style={{ ...headerStyle, cursor: 'default' }}>
                <span style={headerTextStyle}>Lịch sử kiểm tra & Đánh giá</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #EADCC9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày đánh giá gần nhất</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1e293b' }}>{formData.last_checked_date || 'Chưa thực hiện đánh giá'}</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Kết quả đánh giá gần nhất</span>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: formData.last_result === 'Đạt' ? '#16a34a' : (formData.last_result === 'Không đạt' ? '#dc2626' : '#475569')
                    }}>
                      {formData.last_result || 'Chưa đánh giá'}
                    </span>
                  </div>
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>STT</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ngày kiểm tra</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Người đánh giá</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Kết quả</th>
                        <th style={{ padding: '10px 12px', fontWeight: 'bold', color: '#7B5233' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.last_checked_date ? (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>1</td>
                          <td style={{ padding: '10px 12px', fontWeight: '500', color: '#1e293b' }}>{formData.last_checked_date}</td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>{formData.approver || 'Hệ thống'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 'bold',
                              backgroundColor: formData.last_result === 'Đạt' ? '#dcfce7' : '#fee2e2',
                              color: formData.last_result === 'Đạt' ? '#15803d' : '#b91c1c'
                            }}>
                              {formData.last_result}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>Đánh giá định kỳ theo quy trình ISO</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chưa có dữ liệu lịch sử kiểm tra được ghi nhận.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* --- PREVIEW MODAL: HIGH-FIDELITY PDF/A4 PRINT PREVIEW (G7.CL -QT01 Template Format) --- */}
      {showPdfPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#f1f5f9',
            width: '95%',
            maxWidth: '1000px',
            height: '92vh',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Modal Toolbar Header */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#7B5233',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #623f25'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '1rem', fontFamily: 'sans-serif' }}>Xem trước tài liệu in (PDF Preview)</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="pdf-preview-toolbar-btn"
                  onClick={handleDownloadDoc}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Tải file Word
                </button>
                <button
                  type="button"
                  className="pdf-preview-toolbar-btn"
                  onClick={handlePrintPdf}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #7B5233',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🖨️ In tài liệu
                </button>
                <button
                  type="button"
                  className="pdf-preview-toolbar-btn"
                  onClick={() => {
                    setShowPdfPreview(false);
                    setLiveExportHtml(null);
                  }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area - Visual A4 page style */}
            <div style={{
              flex: 1,
              padding: '30px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px'
            }}>
              {/* Virtual A4 Page */}
              <div id="pdf-preview-document-root" className="print-document" style={{
                fontFamily: '"Times New Roman", Times, serif',
                color: 'black',
                lineHeight: '1.5',
                fontSize: '12pt',
                width: '210mm',
                boxSizing: 'border-box'
              }}>
                <style dangerouslySetInnerHTML={{ __html: `
                  .print-document, .print-document * {
                    font-family: "Times New Roman", Times, serif !important;
                  }
                  .a4-page {
                    background-color: white;
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm 15mm;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    box-sizing: border-box;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                  }
                  .iso-a4-sheet {
                    background-color: white !important;
                    width: 794px !important;
                    max-width: 794px !important;
                    min-height: 1123px !important;
                    height: auto !important;
                    padding: 44px 50px 24px 50px !important;
                    margin: 0 auto 36px auto !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22) !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    position: relative !important;
                  }
                  .iso-a4-sheet-content {
                    flex: 1 1 auto !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                  }
                  .iso-a4-sheet-footer {
                    height: 32px !important;
                    min-height: 32px !important;
                    border-top: 1px solid #000000 !important;
                    padding-top: 6px !important;
                    margin-top: 6px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    font-family: 'Times New Roman', serif !important;
                    font-size: 10pt !important;
                    font-style: normal !important;
                    color: #0D0D0D !important;
                    user-select: none !important;
                    box-sizing: border-box !important;
                  }
                  .cover-border-box {
                    border: 2px solid black;
                    padding: 24px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-sizing: border-box;
                  }
                  .print-document button, .print-document .iso-flowchart-edit-badge, .print-document .iso-nav-item-flowchart-btn {
                    display: none !important;
                  }
                  .pdf-preview-toolbar-btn {
                    display: inline-flex !important;
                  }
                  table.no-border, table.no-border tr, table.no-border td {
                    border: none !important;
                  }
                  @media print {
                    .a4-page, .iso-a4-sheet {
                      width: 100% !important;
                      min-height: unset !important;
                      height: auto !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      box-shadow: none !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                      page-break-after: always !important;
                      break-after: page !important;
                    }
                    .a4-page:last-child, .iso-a4-sheet:last-child {
                      page-break-after: avoid !important;
                      break-after: avoid !important;
                    }
                    .cover-border-box {
                      height: 250mm !important;
                      box-sizing: border-box !important;
                      flex: none !important;
                    }
                  }
                ` }} />

                {liveExportHtml ? (
                  <div
                    className="iso-live-export-sheets"
                    dangerouslySetInnerHTML={{ __html: liveExportHtml }}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <>
                    {/* PAGE 1: COVER PAGE */}
                    <div className="a4-page">
                   {/* Outer Border Box */}
                   <div className="cover-border-box">
                     {/* Top Header Table */}
                     <table className="header-table" style={{
                       width: '100%',
                       borderCollapse: 'collapse',
                       border: '1.5px solid black',
                       marginBottom: '20px'
                     }}>
                       <tbody>
                         <tr>
                           <td className="header-logo-cell" style={{
                             width: '30%',
                             textAlign: 'center',
                             padding: '10px',
                             verticalAlign: 'middle',
                             borderRight: '1.5px solid black'
                           }}>
                             <img src={logoCty} alt="Logo" style={{ height: '55px', objectFit: 'contain' }} />
                           </td>
                           <td style={{
                             width: '70%',
                             textAlign: 'center',
                             padding: '10px',
                             fontWeight: 'bold',
                             fontSize: '14pt',
                             textTransform: 'uppercase',
                             verticalAlign: 'middle',
                             letterSpacing: '0.5px'
                           }}>
                             CÔNG TY CỔ PHẦN VINA G7
                           </td>
                         </tr>
                       </tbody>
                     </table>

                     <div className="word-only-spacer" style={{ display: 'none' }}></div>

                     {/* Middle: Title & Metadata */}
                     <div style={{ textAlign: 'center', margin: '40px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <h1 style={{
                         fontSize: '18pt',
                         fontWeight: 'bold',
                         lineHeight: '1.4',
                         marginBottom: '30px',
                         textTransform: 'uppercase'
                       }}>
                         {formData.name || '---'}
                       </h1>

                       <table className="dashed-table" style={{
                         width: '75%',
                         margin: '0 auto',
                         borderCollapse: 'collapse',
                         border: '1px dashed black',
                         fontSize: '11pt',
                         textAlign: 'left'
                       }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold', width: '45%' }}>Mã hiệu:</td>
                            <td style={{ border: '1px dashed black', padding: '8px', width: '55%' }}>{formData.code || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Lần ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.version || '01'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Ngày ban hành:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.issue_date || '---'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px dashed black', padding: '8px', fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                            <td style={{ border: '1px dashed black', padding: '8px' }}>{formData.folder || 'QLCL'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="word-only-spacer2" style={{ display: 'none' }}></div>

                    {/* Bottom: Approval Block */}
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid black',
                      textAlign: 'center',
                      fontSize: '11pt',
                      marginTop: 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>TRÁCH NHIỆM</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '30%' }}>HỌ TÊN</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '25%' }}>CHỨC VỤ</th>
                          <th style={{ border: '1.5px solid black', padding: '8px', width: '20%' }}>KÝ TÊN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Biên soạn</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.issuer || '---'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>Người soạn thảo</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>Trưởng phòng duyệt</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.approver || '---'}</td>
                          <td style={{ border: '1.5px solid black', padding: '10px' }}>Trưởng phòng</td>
                          <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                        </tr>
                        {formData.document_level === 'Cấp công ty' && (
                          <tr>
                            <td style={{ border: '1.5px solid black', padding: '10px', fontWeight: 'bold' }}>BGĐ phê duyệt</td>
                            <td style={{ border: '1.5px solid black', padding: '10px' }}>{formData.approver_bgd || '---'}</td>
                            <td style={{ border: '1.5px solid black', padding: '10px' }}>Ban Giám Đốc</td>
                            <td style={{ border: '1.5px solid black', padding: '10px', height: '40px' }}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PAGE 2: REVISION LOGS */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* Revision logs table */}
                    <h4 style={{ margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: '12pt', fontWeight: 'bold', textAlign: 'center' }}>
                      Theo dõi sửa đổi nội dung tài liệu
                    </h4>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid black',
                      marginBottom: '20px',
                      fontSize: '11pt',
                      textAlign: 'center'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', height: '34px' }}>
                          <th style={{ border: '1px solid black', padding: '6px', width: '10%' }}>Số TT</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '20%' }}>Ngày Sửa</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '55%' }}>Nội Dung Sửa Đổi</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '15%' }}>Trang Số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 18 }).map((_, idx) => {
                          const log = (formData.revision_logs || [])[idx] || {};
                          return (
                            <tr key={idx} style={{ height: '32px' }}>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.rev_date || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>{log.content || '\u00A0'}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{log.page_no || '\u00A0'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Page 2 Running Footer */}
                  <div style={{
                    borderTop: '1px solid #000000',
                    paddingTop: '5px',
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '10pt',
                    color: '#0D0D0D',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <span>Mã hiệu: {effCode}</span>
                    <span>Lần ban hành: {effVer}</span>
                    <span>Ngày ban hành: {effDate}</span>
                    <span className="iso-sheet-page-num">Trang: 2/{getTotalDocumentPages()}</span>
                  </div>
                </div>

                {/* PAGE 3+: CONTENT PAGES */}
                <div className="a4-page" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ flex: 1 }}>

                    {/* Dynamic A4 Sections content renderer */}
                    {Object.keys(formData.sections || {})
                      .filter(key => !key.startsWith('__'))
                      .map((sectionKey, sIdx) => {
                        const isFlowchart = formData.section_types?.[sectionKey] === 'flowchart';
                        const html = formData.sections[sectionKey] || '';

                        if (isFlowchart) {
                          return (
                            <React.Fragment key={sectionKey}>
                              {/* 1. Flowchart Diagram & table */}
                              <div style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                <h3 style={{
                                  fontSize: '13pt',
                                  fontWeight: 'bold',
                                  margin: '0 0 10px 0',
                                  borderBottom: '1px solid black',
                                  paddingBottom: '2px'
                                }}>
                                  {/^\d+\./.test(sectionKey.trim()) ? sectionKey : `${sIdx + 1}. ${sectionKey}`}
                                </h3>

                                <div style={{ marginBottom: '20px' }}>
                                  <div
                                    className="iso-flowchart-block-container"
                                    dangerouslySetInnerHTML={{ __html: buildWordFlowchartTable(formData.steps || [], (formData.name || 'QUY TRÌNH').trim().toUpperCase()) }}
                                  />
                                </div>

                                {/* Explanations section details (Times New Roman formatted) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                  {(formData.steps || []).map((step, idx) => {
                                    const stepLabel = (stepDisplayLabels[step.step_number] || '').replace(/^B/, 'Bước ') || `Bước ${step.step_number}`;
                                    return (
                                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '11.5pt', color: 'black' }}>
                                          {stepLabel}: {step.name}
                                        </div>
                                        {step.instructions ? (
                                          <div
                                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                                            style={{ paddingLeft: '16px', color: 'black', fontSize: '11pt' }}
                                          />
                                        ) : (
                                          <div style={{ paddingLeft: '16px', color: '#777', fontStyle: 'italic', fontSize: '10.5pt' }}>
                                            (Chưa có giải thích cho bước này)
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Visual user manual (only if there are work instructions configured) */}
                              {isProcessMode && (formData.work_instructions || []).map((inst, instIdx) => (
                                <div key={inst.id || instIdx} style={{ marginBottom: '24px', pageBreakBefore: 'always' }}>
                                  <h3 style={{
                                    fontSize: '13pt',
                                    fontWeight: 'bold',
                                    margin: '0 0 16px 0',
                                    borderBottom: '1px solid black',
                                    paddingBottom: '2px'
                                  }}>
                                    {sIdx + 1}.{instIdx + 1}. {inst.title || `Hướng dẫn thực hiện ${instIdx + 1}`}
                                  </h3>

                                  <div className="instruction-grid" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                  }}>
                                    {(inst.steps || []).map((step, idx) => {
                                      const images = step.image_urls || [];
                                      return (
                                        <div key={idx} className="instruction-card" style={{
                                          border: '1px solid black',
                                          padding: '12px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '10px'
                                        }}>
                                          {/* Work description */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                              border: '1px solid black',
                                              fontSize: '9.5pt',
                                              fontWeight: 'bold',
                                              padding: '3px 10px',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              Bước {step.step_number}
                                            </span>
                                            <span style={{ fontSize: '11pt', fontWeight: 'bold' }}>{step.name || '(Chưa nhập công việc)'}</span>
                                          </div>

                                          {/* Images row/grid */}
                                          {images.length > 0 ? (
                                            <div style={{
                                              display: 'grid',
                                              gridTemplateColumns: `repeat(${images.length}, 1fr)`,
                                              gap: '10px',
                                              marginTop: '4px'
                                            }}>
                                              {images.map((imgUrl, imgIdx) => (
                                                <div
                                                  key={imgIdx}
                                                  style={{
                                                    height: '140px',
                                                    border: '1px solid black',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#f8fafc'
                                                  }}
                                                >
                                                  <img
                                                    src={imgUrl}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    alt={`hinh ${imgIdx + 1}`}
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '10pt', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>
                                              (Chưa có hình ảnh minh họa cho bước này)
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(!inst.steps || inst.steps.length === 0) && (
                                      <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
                                        Chưa có bước hướng dẫn nào được cấu hình trong tài liệu này.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        } else {
                          const isContentSection = /5\.?\s*N[ỘÔ]I\s*DUNG|LƯU\s*TRÌNH|QUY\s*TRÌNH/i.test(sectionKey);
                          const isFormsSection = /6\.?\s*BIỂU\s*MẪU|BIỂU\s*MẪU|HỒ\s*SƠ/i.test(sectionKey);
                          const hasSteps = (formData.steps || []).length > 0;
                          const showFlowchartHere = isContentSection && hasSteps && !html.includes('<table') && !html.includes('<svg');
                          const cleanSectionTitle = /^\d+\./.test(sectionKey.trim()) ? sectionKey : `${sIdx + 1}. ${sectionKey}`;

                          let finalHtml = html;
                          if (isFormsSection) {
                            finalHtml = buildRelatedFormsTableHtml(html, formData);
                          } else if (html) {
                            finalHtml = html
                              .replace(/✔\s*/g, '- ')
                              .replace(/✓\s*/g, '- ')
                              .replace(/<p>[^<]*(?:ngày\s+\d+\s+tháng\s+\d+|tổng\s+giám\s+đốc|nguyễn\s+hòa)[^<]*<\/p>/gi, '');
                          }

                          return (
                            <div key={sectionKey} style={{ marginBottom: '24px' }}>
                              <h3 style={{
                                fontSize: '13pt',
                                fontWeight: 'bold',
                                margin: '0 0 6px 0',
                                borderBottom: '1px solid black',
                                paddingBottom: '2px'
                              }}>
                                {cleanSectionTitle}
                              </h3>
                              {showFlowchartHere && (
                                <div
                                  className="iso-flowchart-block-container"
                                  style={{ marginBottom: '16px' }}
                                  dangerouslySetInnerHTML={{ __html: buildWordFlowchartTable(formData.steps || [], (formData.name || 'QUY TRÌNH').trim().toUpperCase()) }}
                                />
                              )}
                              {finalHtml ? (
                                <div
                                  dangerouslySetInnerHTML={{ __html: finalHtml }}
                                  style={{ paddingLeft: '8px', fontSize: '11.5pt' }}
                                />
                              ) : (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic', paddingLeft: '8px', fontSize: '11pt' }}>
                                  (Chưa có nội dung thiết lập cho mục này)
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                  </div>

                  {/* Page 2+ Running Footer */}
                  <div style={{
                    borderTop: '1px solid #000000',
                    paddingTop: '5px',
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: "'Times New Roman', serif",
                    fontSize: '10pt',
                    color: '#0D0D0D',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <span>Mã hiệu: {effCode}</span>
                    <span>Lần ban hành: {effVer}</span>
                    <span>Ngày ban hành: {effDate}</span>
                    <span className="iso-sheet-page-num">Trang: 3/{getTotalDocumentPages()}</span>
                  </div>
                </div>
              </>
            )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CHỌN TÀI LIỆU TỪ HỆ THỐNG --- */}
      {showSystemTemplatesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            width: '90%',
            maxWidth: '900px',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#2d1a12' }}>
                Thêm tài liệu từ hệ thống
              </h3>
              <button
                type="button"
                onClick={() => setShowSystemTemplatesModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  fontWeight: '300'
                }}
              >
                ✕
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Nhập mã tài liệu"
                  value={searchTemplateQuery}
                  onChange={(e) => setSearchTemplateQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 36px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    outline: 'none',
                    color: '#1e293b'
                  }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  🔍
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSystemTemplatesFilterOpen(!systemTemplatesFilterOpen)}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: systemTemplatesFilterOpen ? '#FAF6F0' : 'white',
                  color: '#7B5233',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}
                title="Lọc phòng ban"
              >
                🎛️
              </button>
            </div>

            {/* Department dropdown (if filter is open) */}
            {systemTemplatesFilterOpen && (
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b' }}>Phòng ban / Thư mục:</span>
                <select
                  value={systemTemplatesDepartmentFilter}
                  onChange={(e) => setSystemTemplatesDepartmentFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Tất cả phòng ban</option>
                  {Array.from(new Set(systemTemplates.map(st => st.folder).filter(Boolean))).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Table */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(() => {
                          const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                          const listToCompare = isSearchActive
                            ? systemTemplates.filter(st => {
                                const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                                  (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                                const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                                return matchSearch && matchDept;
                              })
                            : systemTemplates.filter(st => tempCheckedIds.includes(st.id));

                          return listToCompare.length > 0 && listToCompare.every(st => tempCheckedIds.includes(st.id));
                        })()}
                        onChange={() => {
                          const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                          const listToCompare = isSearchActive
                            ? systemTemplates.filter(st => {
                                const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                                  (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                                const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                                return matchSearch && matchDept;
                              })
                            : systemTemplates.filter(st => tempCheckedIds.includes(st.id));

                          const allChecked = listToCompare.length > 0 && listToCompare.every(st => tempCheckedIds.includes(st.id));
                          if (allChecked) {
                            const idsToRemove = listToCompare.map(st => st.id);
                            setTempCheckedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
                          } else {
                            const newIds = [...tempCheckedIds];
                            listToCompare.forEach(st => {
                              if (!newIds.includes(st.id)) {
                                newIds.push(st.id);
                              }
                            });
                            setTempCheckedIds(newIds);
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', width: '120px', color: '#7B5233', fontWeight: 'bold' }}>Mã</th>
                    <th style={{ padding: '10px 12px', color: '#7B5233', fontWeight: 'bold' }}>Tên tài liệu</th>
                    <th style={{ padding: '10px 12px', width: '150px', color: '#7B5233', fontWeight: 'bold' }}>phòng ban</th>
                    <th style={{ padding: '10px 12px', width: '100px', color: '#7B5233', fontWeight: 'bold' }}>trạng thái</th>
                    <th style={{ padding: '10px 12px', width: '120px', color: '#7B5233', fontWeight: 'bold' }}>ngày ban hành</th>
                    <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const isSearchActive = searchTemplateQuery.trim() !== '' || systemTemplatesDepartmentFilter !== '';
                    const listToShow = systemTemplates.filter(st => {
                      if (!isSearchActive) {
                        return tempCheckedIds.includes(st.id);
                      }
                      const matchSearch = (st.code && st.code.toLowerCase().includes(searchTemplateQuery.toLowerCase())) ||
                        (st.name && st.name.toLowerCase().includes(searchTemplateQuery.toLowerCase()));
                      const matchDept = systemTemplatesDepartmentFilter === '' || st.folder === systemTemplatesDepartmentFilter;
                      return matchSearch && matchDept;
                    });

                    if (listToShow.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            {!isSearchActive
                              ? "Chưa có tài liệu nào được chọn. Vui lòng nhập mã tài liệu tìm kiếm để chọn thêm."
                              : "Không tìm thấy tài liệu phù hợp."
                            }
                          </td>
                        </tr>
                      );
                    }

                    return listToShow.map(st => (
                      <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={tempCheckedIds.includes(st.id)}
                            onChange={() => {
                              if (tempCheckedIds.includes(st.id)) {
                                setTempCheckedIds(prev => prev.filter(id => id !== st.id));
                              } else {
                                setTempCheckedIds(prev => [...prev, st.id]);
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                          {st.code}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {st.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {st.folder || '---'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            backgroundColor: st.status === 'Hiệu lực' || st.status === 'Đang lưu hành' ? '#dcfce7' : '#fee2e2',
                            color: st.status === 'Hiệu lực' || st.status === 'Đang lưu hành' ? '#15803d' : '#b91c1c'
                          }}>
                            {st.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {st.issue_date || '---'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (st.file_path) {
                                window.open(api.defaults.baseURL.replace('/api/v1', '') + '/' + st.file_path, '_blank');
                              } else {
                                alert("Tài liệu này chưa đính kèm file gốc.");
                              }
                            }}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#7B5233',
                              cursor: 'pointer',
                              fontSize: '1.05rem',
                              padding: '2px'
                            }}
                            title="Xem file gốc"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowSystemTemplatesModal(false)}
                style={{
                  padding: '8px 20px',
                  border: '1.5px solid #7B5233',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpdateSystemTemplates}
                style={{
                  padding: '8px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#4A301C',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  boxShadow: '0 2px 4px rgba(74, 48, 28, 0.15)'
                }}
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bắt buộc ghi nhận lịch sử sửa đổi & chọn trang sửa đổi */}
      <ISORevisionLogModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onConfirm={handleConfirmRevisionSave}
        totalPages={getTotalDocumentPages()}
        currentLogs={formData.revision_logs || []}
        loading={loading}
        initialNote={formData.revision_note || formData.notes || ''}
      />

      {/* Trình xem từng trang trung thực 100% gốc (khổ ngang/dọc, lưu đồ, bảng, form) */}
      {showFaithfulViewer && (
        <FaithfulPageViewer
          pages={faithfulPages}
          title={formData.name || 'Bản gốc file Word (100% Trung thực)'}
          onClose={() => setShowFaithfulViewer(false)}
        />
      )}

      {/* Modal soạn thảo trực tiếp trên file Word gốc bằng ONLYOFFICE Document Server */}
      {showOnlyOfficeModal && (
        <OnlyOfficeEditorModal
          isOpen={showOnlyOfficeModal}
          onClose={() => setShowOnlyOfficeModal(false)}
          filePath={formData.file_path}
          documentTitle={formData.name || 'Tài liệu quy trình Word'}
          onSaved={async () => {
            if (formData.file_path) {
              try {
                const pRes = await api.get('/iso-documents/onlyoffice/pages', {
                  params: { file_path: formData.file_path }
                });
                if (pRes?.pages) setFaithfulPages(pRes.pages);
              } catch (_) {}
            }
          }}
        />
      )}

      {/* Nút <> bên hông chuyển tới lui tài liệu khác */}
      {isEditMode && docList.length > 1 && (
        <aside
          aria-label="Điều hướng tài liệu nhanh bên hông"
          style={{
            position: 'fixed',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isDark ? 'rgba(48, 45, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${isDark ? '#4D4742' : '#EADCC9'}`,
            borderRadius: '24px',
            padding: '8px 5px',
            boxShadow: '0 8px 24px -4px rgba(123, 82, 51, 0.2), 0 2px 6px rgba(0, 0, 0, 0.08)',
            userSelect: 'none'
          }}
        >
          {/* Nút Lùi lại < */}
          <button
            type="button"
            disabled={!prevDoc}
            onClick={() => handleNavigateToDoc(prevDoc)}
            title={prevDoc ? `Tài liệu trước (Alt + ←): [${prevDoc.new_code || prevDoc.code}] ${prevDoc.name}` : 'Đã ở tài liệu đầu tiên'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: prevDoc ? (isDark ? '#3D3834' : '#FAF6F0') : 'transparent',
              color: prevDoc ? (isDark ? '#D8B282' : '#7B5233') : (isDark ? '#6B635B' : '#CBD5E1'),
              cursor: prevDoc ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              boxShadow: prevDoc ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Vị trí tài liệu hiện tại (vd: 12/122) */}
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: '700',
              color: isDark ? '#D8B282' : '#7B5233',
              textAlign: 'center',
              lineHeight: 1.2,
              padding: '2px 4px'
            }}
            title={currentIndex >= 0 ? `Vị trí: ${currentIndex + 1} / ${docList.length} tài liệu` : ''}
          >
            {currentIndex >= 0 ? `${currentIndex + 1}/${docList.length}` : '•'}
          </div>

          {/* Nút Chuyển tới > */}
          <button
            type="button"
            disabled={!nextDoc}
            onClick={() => handleNavigateToDoc(nextDoc)}
            title={nextDoc ? `Tài liệu kế tiếp (Alt + →): [${nextDoc.new_code || nextDoc.code}] ${nextDoc.name}` : 'Đã ở tài liệu cuối cùng'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: nextDoc ? (isDark ? '#3D3834' : '#FAF6F0') : 'transparent',
              color: nextDoc ? (isDark ? '#D8B282' : '#7B5233') : (isDark ? '#6B635B' : '#CBD5E1'),
              cursor: nextDoc ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              boxShadow: nextDoc ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </aside>
      )}
    </div>
  );
};

export default ISOProcessEditorView;