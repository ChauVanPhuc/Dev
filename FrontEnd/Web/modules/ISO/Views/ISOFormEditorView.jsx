import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '@webShared/Services/api.service';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { AlertCircle, FileText, GitBranch, ChevronUp, ChevronDown, Search, Filter, Download, ExternalLink, Eye, Printer, RefreshCw, BookOpen, Settings } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const getCurrentFormattedDate = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  const DD = pad(now.getDate());
  const MM = pad(now.getMonth() + 1);
  const YYYY = now.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};

const stripTime = (dateStr) => {
  if (!dateStr) return '';
  const match = dateStr.match(/^\d{2}:\d{2}\s+(.*)$/);
  return match ? match[1] : dateStr;
};

const ISOFormEditorView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const context = useOutletContext();
  const setCustomTitle = context ? context.setCustomTitle : null;
  const setCustomSubtitle = context ? context.setCustomSubtitle : null;
  const setCustomScreenCode = context ? context.setCustomScreenCode : null;
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');

  const isProcessMode = false;
  const backPath = '/admin/iso-documents';
  const isEditMode = id && id !== 'new';
  const originalDataRef = useRef(null);
  const hasImportedFile = useRef(false);
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Nhân sự');
    if (setCustomSubtitle) setCustomSubtitle('Cập nhật mẫu tài liệu');
    if (setCustomScreenCode) setCustomScreenCode('AD17.1');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    file_path: '',
    status: 'Nháp',
    folder: '',
    doc_type: '',
    document_level: '',
    notes: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {},
    section_types: {},
    steps: []
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [infoExpanded, setInfoExpanded] = useState(true);
  const hasParsedRef = useRef(false);
  const [symbolPlaceholder, setSymbolPlaceholder] = useState("QT: Quy trình");
  const [namePlaceholder, setNamePlaceholder] = useState("Nhập tên tài liệu...");
  const [contentClassified, setContentClassified] = useState(false);

  // Tab management & Tab 3 States
  const [activeFormTab, setActiveFormTab] = useState('config'); // 'config' | 'preview' | 'processes'
  const [processes, setProcesses] = useState([]);
  const [procLoading, setProcLoading] = useState(false);
  const [procSearchQuery, setProcSearchQuery] = useState('');
  const [procDeptFilter, setProcDeptFilter] = useState('All');
  const [procStatusFilter, setProcStatusFilter] = useState('All');
  const [procDateFilter, setProcDateFilter] = useState('');
  const [procPage, setProcPage] = useState(1);

  const fetchProcesses = async () => {
    setProcLoading(true);
    try {
      const data = await api.get('/iso-documents/processes');
      // Client-side filter: only show processes using this template
      const filtered = (data || []).filter(p => p.iso_document_id === parseInt(id));
      setProcesses(filtered);
    } catch (e) {
      console.error('Lỗi khi tải danh sách quy trình:', e);
      showFeedback('error', 'Không thể tải danh sách tài liệu đang sử dụng mẫu này');
    } finally {
      setProcLoading(false);
    }
  };

  useEffect(() => {
    if (activeFormTab === 'processes' && isEditMode) {
      fetchProcesses();
    }
  }, [activeFormTab, id]);

  const getDeptAbbrev = (symbolText, codeText) => {
    const textToMatch = symbolText || codeText || '';
    const match = textToMatch.match(/G7\.([A-Z0-9]+)[-.]/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    return '---';
  };

  const DEPT_MAP = {
    'CL': 'Chất lượng',
    'SX': 'Sản xuất',
    'KT': 'Kỹ thuật',
    'KHO': 'Kho',
    'IT': 'IT',
    'BGD': 'Ban Giám Đốc'
  };

  const getDeptName = (abbrev) => {
    return DEPT_MAP[abbrev] || abbrev || 'Chưa phân loại';
  };

  // Extract unique departments from the filtered list of processes
  const availableDepts = useMemo(() => {
    const depts = new Set();
    processes.forEach(p => {
      depts.add(getDeptAbbrev(p.symbol, p.code));
    });
    return Array.from(depts);
  }, [processes]);

  // Filters & Pagination for Processes
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      // 1. Search Query
      if (procSearchQuery) {
        const query = procSearchQuery.toLowerCase();
        const codeMatch = p.code && p.code.toLowerCase().includes(query);
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        if (!codeMatch && !nameMatch) return false;
      }
      // 2. Department Filter
      if (procDeptFilter !== 'All') {
        const deptAbbrev = getDeptAbbrev(p.symbol, p.code);
        if (deptAbbrev !== procDeptFilter) return false;
      }
      // 3. Status Filter
      if (procStatusFilter !== 'All') {
        if (p.status !== procStatusFilter) return false;
      }
      // 4. Date Filter
      if (procDateFilter) {
        if (p.issue_date !== procDateFilter) return false;
      }
      return true;
    });
  }, [processes, procSearchQuery, procDeptFilter, procStatusFilter, procDateFilter]);

  const procPageSize = 10;
  const totalProcPages = Math.ceil(filteredProcesses.length / procPageSize) || 1;

  const paginatedProcesses = useMemo(() => {
    const start = (procPage - 1) * procPageSize;
    return filteredProcesses.slice(start, start + procPageSize);
  }, [filteredProcesses, procPage, procPageSize]);

  useEffect(() => {
    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lấy nguyên danh sách sections từ parser để không thêm bất
      const newSections = parsed.sections || {};
      const newSectionTypes = {};
      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      generateNextCode().then(nextCode => {
        // Kiểm tra xem parsed.code có phải là mã hợp lệ hay không (không chứa chữ 'mẫu' và không có khoảng trắng)
        const isCodeValid = parsed.code && !parsed.code.toLowerCase().includes('mẫu') && !/\s/.test(parsed.code);
        setFormData(prev => ({
          ...prev,
          code: isCodeValid ? parsed.code : nextCode,
          name: (parsed.name && (parsed.name.trim() === '[Tên quy trình]' || parsed.name.trim() === 'Tên quy trình' || parsed.name.trim() === '[Tên tài liệu]' || parsed.name.trim() === 'Tên tài liệu')) ? '' : (parsed.name || ''),
          version: parsed.version || '01',
          issue_date: getCurrentFormattedDate(),
          file_path: parsed.file_path || '',
          status: 'Nháp',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          notes: parsed.notes || '',
          sections: newSections,
          section_types: newSectionTypes
        }));
      });
      showFeedback('success', 'Đã bóc tách tự động cấu trúc từ tài liệu Word thành công!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      generateNextCode().then(nextCode => {
        setFormData(prev => ({ ...prev, code: nextCode }));
      });
    }
  }, [id]);

  const generateNextCode = async () => {
    try {
      const data = await api.get('/iso-documents/');
      const count = (data || []).length + 1;
      return `M${String(count).padStart(2, '0')}`;
    } catch (e) {
      return 'M01';
    }
  };

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/iso-documents/${id}/details`);
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

      // Sections được lấy nguyên từ DB để không merge thêm key cũ định
      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          sectionTypes[key] = 'text';
        }
      });

      const loadedData = {
        id: data.id,
        code: data.code || '',
        name: (data.name && (data.name.trim() === '[Tên quy trình]' || data.name.trim() === 'Tên quy trình' || data.name.trim() === '[Tên tài liệu]' || data.name.trim() === 'Tên tài liệu')) ? '' : (data.name || ''),
        symbol: data.symbol || '',
        version: data.version || '01',
        issue_date: stripTime(data.issue_date || getCurrentFormattedDate()),
        issuer: loggedInUser.full_name || data.issuer || '',
        approver: data.approver || '',
        file_path: data.file_path || '',
        status: data.status || 'Đang lưu hành',
        folder: data.folder || data.display_at || '',
        doc_type: data.doc_type || data.notes || '',
        document_level: data.document_level || '',
        notes: data.notes || '',
        revision_logs: data.revision_logs || [],
        sections: receivedSections,
        section_types: sectionTypes,
        steps: data.steps || []
      };
      setFormData(loadedData);
      originalDataRef.current = loadedData;
    } catch (error) {
      console.error('Lỗi khi tải chi tiết mẫu ISO:', error);
      showFeedback('error', 'Không thể tải chi tiết mẫu ISO từ hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    toast(type, text);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      return;
    }

    const formDataPay = new FormData();
    formDataPay.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình mới...');

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

      setFormData(prev => ({
        ...prev,
        code: (parsedData.code && !parsedData.code.toLowerCase().includes('mẫu') && !/\s/.test(parsedData.code)) ? parsedData.code : prev.code,
        name: (parsedData.name && parsedData.name.trim() !== '[Tên quy trình]' && parsedData.name.trim() !== 'Tên quy trình' && parsedData.name.trim() !== '[Tên tài liệu]' && parsedData.name.trim() !== 'Tên tài liệu') ? parsedData.name : prev.name,
        symbol: parsedData.symbol || prev.symbol,
        version: parsedData.version || prev.version || '01',
        file_path: parsedData.file_path || prev.file_path,
        folder: parsedData.folder || prev.folder,
        doc_type: parsedData.doc_type || prev.doc_type,
        document_level: parsedData.document_level || prev.document_level,
        notes: parsedData.notes || prev.notes,
        sections: newSections,
        section_types: newSectionTypes
      }));

      hasImportedFile.current = true;
      showFeedback('success', 'Cập nhật cấu trúc tài liệu từ file Word thành công! Vui lòng ấn "Lưu thông tin" để hoàn tất.');
    } catch (error) {
      console.error('Lỗi upload file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình mới';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveForm = async () => {
    if (!formData.code) {
      showFeedback('error', 'Mã mẫu không được để trống');
      return;
    }
    if (!formData.symbol || !formData.symbol.trim()) {
      showFeedback('error', 'Ký hiệu tài liệu là bắt buộc');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      showFeedback('error', 'Tên tài liệu là bắt buộc');
      return;
    }
    if (!contentClassified) {
      showFeedback('error', 'Bạn chưa xác nhận "Đã phân loại nội dung" trước khi lưu');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      const hh = pad(now.getHours());
      const mm = pad(now.getMinutes());
      const finalIssueDate = `${hh}:${mm} ${stripTime(formData.issue_date || getCurrentFormattedDate())}`;

      let logs = [...(formData.revision_logs || [])];

      if (isEditMode) {
        const hasGeneralChanges = originalDataRef.current && (
          formData.code !== originalDataRef.current.code ||
          formData.name !== originalDataRef.current.name ||
          formData.symbol !== originalDataRef.current.symbol ||
          formData.version !== originalDataRef.current.version ||
          formData.notes !== originalDataRef.current.notes ||
          formData.document_level !== originalDataRef.current.document_level ||
          formData.folder !== originalDataRef.current.folder ||
          formData.doc_type !== originalDataRef.current.doc_type ||
          JSON.stringify(formData.section_types) !== JSON.stringify(originalDataRef.current.section_types)
        );
        const hasImported = hasImportedFile.current;

        if (hasGeneralChanges || hasImported) {
          const todayStr = getCurrentFormattedDate();
          let autoContent = '';

          if (hasImported) {
            autoContent = 'Cập nhật cấu trúc tài liệu qua tệp Word';
          } else {
            const changes = [];
            const labels = {
              code: 'Mã mẫu',
              name: 'Tên tài liệu',
              symbol: 'Ký hiệu',
              version: 'Phiên bản',
              notes: 'Ghi chú',
              document_level: 'Cấp duyệt',
              folder: 'Thư mục',
              doc_type: 'Phân loại'
            };

            const orig = originalDataRef.current || {};

            Object.keys(labels).forEach(key => {
              if (formData[key] !== orig[key]) {
                const oldVal = orig[key] || 'Trống';
                const newVal = formData[key] || 'Trống';
                changes.push(`${labels[key]} ("${oldVal}" → "${newVal}")`);
              }
            });

            if (JSON.stringify(formData.section_types) !== JSON.stringify(orig.section_types)) {
              changes.push('Cấu hình định dạng đề mục');
            }

            autoContent = changes.length > 0 ? `Hiệu chỉnh: ${changes.join(', ')}` : 'Cập nhật tài liệu';
          }

          logs.push({
            rev_date: todayStr,
            content: autoContent,
            page_no: 'Tất cả',
            modifier: loggedInUser.full_name || ''
          });
        }
      }

      const finalPayload = {
        ...formData,
        issue_date: finalIssueDate,
        name: formData.name || formData.code,
        display_at: formData.folder,
        notes: formData.doc_type,
        revision_logs: logs.map((log, index) => ({
          ...log,
          seq_no: index + 1
        })),
        sections: {
          ...(formData.sections || {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {})
        }
      };

      const res = await api.post('/iso-documents/save', finalPayload);
      showFeedback('success', res.message || 'Lưu Mẫu ISO thành công!');
      setTimeout(() => {
        navigate(backPath);
      }, 1000);
    } catch (error) {
      console.error('Lỗi khi lưu mẫu ISO:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ mẫu ISO');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1.5px solid #7B5233',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(123, 82, 51, 0.02)',
    marginBottom: '16px'
  };

  const headerStyle = {
    backgroundColor: '#FAF6F0',
    padding: '10px 14px',
    borderBottom: '1.5px solid #7B5233',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none'
  };

  const headerTextStyle = {
    fontWeight: 'bold',
    color: '#7B5233',
    fontSize: '0.84rem',
    textTransform: 'uppercase'
  };

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      color: '#2D1A12',
      backgroundColor: '#FAF8F5',
      minHeight: '100vh',
      width: '100%'
    }}>
      <style>{`
        .admin-layout.fit-to-screen-active .dashboard-content {
          overflow-y: auto !important;
        }
      `}</style>


      {/* Card: Thông tin chung */}
      <div style={cardStyle}>
        <div
          style={{ ...headerStyle, cursor: 'pointer' }}
          onClick={() => setInfoExpanded(!infoExpanded)}
        >
          <span style={headerTextStyle}>Thông tin chung</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveForm();
              }}
              disabled={loading}
              style={{
                padding: '5px 16px',
                backgroundColor: '#7B5233',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
            {infoExpanded ? <ChevronUp size={16} style={{ color: '#7B5233' }} /> : <ChevronDown size={16} style={{ color: '#7B5233' }} />}
          </div>
        </div>

        {infoExpanded && (
          <div style={{ padding: '20px', borderTop: '1px solid #F0E6D8', backgroundColor: '#FFFFFF' }}>
            {/* Grid for Inputs (full width) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px 16px' }}>

              {/* Row 1 */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã mẫu</label>
                <input
                  type="text"
                  value={formData.code}
                  readOnly
                  placeholder="M01"
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ký hiệu</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                  placeholder={symbolPlaceholder}
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên tài liệu</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={namePlaceholder}
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', transition: 'border-color 0.2s', color: '#1F2937' }}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phân loại</label>
                <input
                  type="text"
                  value={formData.doc_type}
                  onChange={(e) => handleInputChange('doc_type', e.target.value)}
                  placeholder="Phân loại..."
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', color: '#1F2937' }}
                />
              </div>

              {/* Row 2 */}
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Người cập nhật</label>
                <input
                  type="text"
                  value={formData.issuer}
                  readOnly
                  placeholder="Người cập nhật..."
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ngày cập nhật</label>
                <input
                  type="text"
                  value={formData.issue_date}
                  readOnly
                  placeholder="Ngày cập nhật..."
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cấp duyệt</label>
                <select
                  value={formData.document_level}
                  onChange={(e) => handleInputChange('document_level', e.target.value)}
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer', color: '#1F2937' }}
                >
                  <option value="">Cấp phòng</option>
                  <option value="Cấp phòng">Cấp phòng</option>
                  <option value="Cấp công ty">Cấp công ty</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</label>
                <input
                  type="text"
                  value={formData.status}
                  readOnly
                  style={{ width: '100%', height: '36px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontWeight: '600', backgroundColor: '#F3F4F6', color: '#4B5563', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Row 3: Ghi chú (Full Width) */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '0.73rem', fontWeight: '700', color: '#4B5563', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ghi chú</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Nhập ghi chú hoặc mô tả ngắn..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#1F2937', lineHeight: '1.4' }}
              />
            </div>

            {/* Checkbox: Đã phân loại nội dung */}
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 16px', 
              border: '1.5px solid #EADCC9', 
              borderRadius: '6px', 
              backgroundColor: '#FAF8F5',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                id="contentClassifiedCheckbox"
                checked={contentClassified}
                onChange={(e) => setContentClassified(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: '#7B5233'
                }}
              />
              <label 
                htmlFor="contentClassifiedCheckbox" 
                style={{ 
                  fontSize: '0.82rem', 
                  fontWeight: '700', 
                  color: '#7B5233', 
                  cursor: 'pointer', 
                  userSelect: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Đã phân loại nội dung
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="iso-tabs-container" style={{
        display: 'flex',
        gap: '32px',
        borderBottom: '2px solid #EADCC9',
        paddingBottom: '0px',
        marginBottom: '16px',
        width: '100%',
        backgroundColor: '#FAF8F5'
      }}>
        <div
          className={`iso-tab-item ${activeFormTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveFormTab('config')}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'config' ? '#7B5233' : '#8D6E63',
            cursor: 'pointer',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'config' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Cấu hình tài liệu
        </div>
        <div
          className={`iso-tab-item ${activeFormTab === 'preview' ? 'active' : ''}`}
          onClick={() => {
            const hasUploadedFile = formData.file_path || (formData.sections && Object.keys(formData.sections).length > 0);
            if (isEditMode || hasUploadedFile) {
              setActiveFormTab('preview');
            } else {
              showFeedback('info', 'Vui lòng tải lên tài liệu Word để xem mẫu.');
            }
          }}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'preview' ? '#7B5233' : '#8D6E63',
            cursor: (isEditMode || formData.file_path || (formData.sections && Object.keys(formData.sections).length > 0)) ? 'pointer' : 'not-allowed',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'preview' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px',
            opacity: (isEditMode || formData.file_path || (formData.sections && Object.keys(formData.sections).length > 0)) ? 1 : 0.5
          }}
        >
          Xem mẫu
        </div>
        <div
          className={`iso-tab-item ${activeFormTab === 'processes' ? 'active' : ''}`}
          onClick={() => {
            if (isEditMode) {
              setActiveFormTab('processes');
            } else {
              showFeedback('info', 'Vui lòng lưu mẫu tài liệu trước khi xem danh sách.');
            }
          }}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeFormTab === 'processes' ? '#7B5233' : '#8D6E63',
            cursor: isEditMode ? 'pointer' : 'not-allowed',
            padding: '10px 4px',
            position: 'relative',
            transition: 'all 0.2s',
            borderBottom: activeFormTab === 'processes' ? '3px solid #7B5233' : '3px solid transparent',
            marginBottom: '-2px',
            opacity: isEditMode ? 1 : 0.5
          }}
        >
          Danh sách tài liệu
        </div>
      </div>

      {/* 1. Màn hình chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        {activeFormTab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>

            {/* Card: Cấu hình loại dữ liệu các đề mục */}
            <div style={cardStyle}>
              <div style={{ ...headerStyle, cursor: 'default' }}>
                <span style={headerTextStyle}>Cấu hình loại dữ liệu các đề mục</span>
              </div>

              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderTop: '1px solid #EADCC9'
              }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
                  Thiết lập định dạng và nội dung hiển thị gợi ý trong ngoặc [ ] cho từng đề mục trong Mẫu ISO.
                </p>

                <div style={{
                  maxHeight: '290px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#FAF6F0' }}>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', height: '36px' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px', color: '#7B5233', fontWeight: 'bold' }}>STT</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', width: '220px', color: '#7B5233', fontWeight: 'bold' }}>DANH MỤC</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 'bold' }}>NỘI DUNG</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', width: '200px', color: '#7B5233', fontWeight: 'bold' }}>ĐỊNH DẠNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(formData.sections || {})
                        .filter(key => !key.startsWith('__'))
                        .map((sectionId, sIdx) => {
                          const currentType = formData.section_types?.[sectionId] || 'text';
                          const currentHtml = formData.sections[sectionId] || '';

                          // Trích xuất text trong dấu ngoặc vuông [ ]
                          const plainText = currentHtml.replace(new RegExp('<[^>]*>', 'g'), '').replace(/&nbsp;/g, ' ');
                          const match = plainText.match(/\[([^\]]*)\]/);
                          const bracketValue = match ? match[1] : '';

                          return (
                            <tr key={sIdx} style={{ borderBottom: '1px solid #F3F4F6', height: '48px' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                                {sIdx + 1}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#2D1A12' }}>
                                {sectionId}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <input
                                  type="text"
                                  value={bracketValue}
                                  onChange={(e) => {
                                    const newText = e.target.value;
                                    let updatedHtml = currentHtml;
                                    if (currentHtml.includes('[') && currentHtml.includes(']')) {
                                      updatedHtml = currentHtml.replace(/\[([^\]]*)\]/, `[${newText}]`);
                                    } else {
                                      updatedHtml = currentHtml + ` [${newText}]`;
                                    }
                                    setFormData(prev => ({
                                      ...prev,
                                      sections: {
                                        ...prev.sections,
                                        [sectionId]: updatedHtml
                                      }
                                    }));
                                  }}
                                  placeholder="Nhập nội dung gợi ý..."
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    color: '#1F2937'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <select
                                  value={currentType}
                                  onChange={(e) => {
                                    const type = e.target.value;
                                    setFormData(prev => ({
                                      ...prev,
                                      section_types: {
                                        ...(prev.section_types || {}),
                                        [sectionId]: type
                                      }
                                    }));
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    color: '#7B5233',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  <option value="text">Văn bản</option>
                                  <option value="flowchart">Lưu trình</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Xem mẫu */}
        {activeFormTab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* Action Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
              <button
                onClick={() => {
                  if (!formData.id) {
                    showFeedback('info', 'Vui lòng lưu thông tin tài liệu trước khi tải tệp tin Word đã điền.');
                    return;
                  }
                  if (!formData.file_path) {
                    showFeedback('error', 'Không tìm thấy tệp tin Word gốc trên hệ thống');
                    return;
                  }
                  const downloadUrl = api.defaults.baseURL.replace(new RegExp('/api/v1/?$'), '') + '/api/v1/iso-documents/' + formData.id + '/download-docx';
                  window.open(downloadUrl, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#7B5233',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Download size={16} /> Tải tệp tin Word gốc (.docx)
              </button>
            </div>

            {/* Simulated A4 Page List Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', width: '100%', backgroundColor: '#F3F4F6', padding: '24px 0' }}>
              
              <style>{`
                .a4-page {
                  background-color: #fff;
                  border: 1px solid #D1D5DB;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                  padding: 40px 50px;
                  width: 800px;
                  height: 1120px;
                  box-sizing: border-box;
                  font-family: 'Times New Roman', Times, serif;
                  color: #000;
                  display: flex;
                  flex-direction: column;
                  position: relative;
                }
                .a4-page-content {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                }
                .a4-page-cover-border {
                  border: 2px solid #000;
                  padding: 24px;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  box-sizing: border-box;
                }
                .a4-table {
                  width: 100%;
                  border-collapse: collapse;
                }
                .a4-table th, .a4-table td {
                  border: 1px solid #000;
                  padding: 8px;
                  text-align: center;
                  font-size: 0.85rem;
                }
                .a4-info-table {
                  width: 70%;
                  margin: auto;
                  border-collapse: collapse;
                }
                .a4-info-table td {
                  padding: 8px 12px;
                  font-size: 0.9rem;
                  border: 1px dashed #999;
                }
                .a4-footer {
                  position: absolute;
                  bottom: 15px;
                  left: 50px;
                  right: 50px;
                  display: flex;
                  justify-content: space-between;
                  font-size: 0.72rem;
                  color: #555;
                  border-top: 1px solid #ccc;
                  padding-top: 6px;
                }
              `}</style>

              {/* PAGE 1: COVER PAGE */}
              <div className="a4-page">
                <div className="a4-page-cover-border">
                  {/* Top Header Table */}
                  <table className="a4-table" style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '25%', verticalAlign: 'middle', padding: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
                            <span style={{ color: '#0F2C59', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'sans-serif' }}>PHU TAI</span>
                            <span style={{ color: '#E0115F', fontSize: '0.55rem', fontWeight: 'bold', fontFamily: 'sans-serif', marginTop: '2px' }}>VINAG7 JSC</span>
                          </div>
                        </td>
                        <td style={{ width: '75%', fontSize: '1.15rem', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle', padding: '10px' }}>
                          CÔNG TY CỔ PHẦN VINA G7
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Middle Title */}
                  <div style={{ textAlign: 'center', margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                      {formData.name || 'TÊN TÀI LIỆU'}
                    </h1>
                  </div>

                  {/* Meta Table */}
                  <div style={{ margin: 'auto 0' }}>
                    <table className="a4-info-table">
                      <tbody>
                        <tr>
                          <td style={{ width: '40%', fontWeight: 'bold' }}>Mã hiệu:</td>
                          <td style={{ width: '60%' }}>{formData.symbol || '---'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Lần ban hành:</td>
                          <td>{formData.version || '01'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Ngày ban hành:</td>
                          <td>{formData.issue_date || '---'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Bộ phận thực hiện:</td>
                          <td>{formData.folder || '---'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Signatures Table */}
                  <div style={{ marginTop: 'auto' }}>
                    <table className="a4-table" style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                          <th style={{ width: '25%', fontWeight: 'bold' }}>TRÁCH NHIỆM</th>
                          <th style={{ width: '25%', fontWeight: 'bold' }}>HỌ TÊN</th>
                          <th style={{ width: '25%', fontWeight: 'bold' }}>CHỨC VỤ</th>
                          <th style={{ width: '25%', fontWeight: 'bold' }}>KÝ TÊN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Biên soạn</td>
                          <td>{formData.issuer || '---'}</td>
                          <td>TP. QLCL</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Phê duyệt</td>
                          <td>{formData.approver || '---'}</td>
                          <td>PHÓ TGĐ</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Footer page 1 */}
                <div className="a4-footer">
                  <span>Mã hiệu: {formData.symbol || '---'}</span>
                  <span>Ngày ban hành: {formData.issue_date || '---'}</span>
                  <span>Lần ban hành: {formData.version || '01'}</span>
                  <span>Trang 1</span>
                </div>
              </div>

              {/* PAGE 2: REVISION LOGS */}
              <div className="a4-page">
                <div className="a4-page-content">
                  <h2 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '24px', textTransform: 'uppercase' }}>
                    THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU
                  </h2>
                  <table className="a4-table" style={{ marginBottom: '40px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        <th style={{ width: '10%', fontWeight: 'bold' }}>Số TT</th>
                        <th style={{ width: '20%', fontWeight: 'bold' }}>Ngày Sửa</th>
                        <th style={{ width: '50%', fontWeight: 'bold', textAlign: 'left' }}>Nội dung sửa đổi</th>
                        <th style={{ width: '20%', fontWeight: 'bold' }}>Trang Số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Render existing logs */}
                      {(formData.revision_logs || []).map((log, idx) => (
                        <tr key={idx}>
                          <td>{log.seq_no}</td>
                          <td>{log.rev_date || '---'}</td>
                          <td style={{ textAlign: 'left' }}>{log.content || 'Ban hành lần đầu'}</td>
                          <td>{log.page_no || 'Tất cả'}</td>
                        </tr>
                      ))}
                      {/* Render empty rows to fill the table (total 15 rows) */}
                      {Array.from({ length: Math.max(0, 15 - (formData.revision_logs || []).length) }).map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                          <td style={{ height: '24px' }}></td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer page 2 */}
                <div className="a4-footer">
                  <span>Mã hiệu: {formData.symbol || '---'}</span>
                  <span>Ngày ban hành: {formData.issue_date || '---'}</span>
                  <span>Lần ban hành: {formData.version || '01'}</span>
                  <span>Trang 2</span>
                </div>
              </div>

              {/* PAGE 3+: CONTENT SECTIONS */}
              <div className="a4-page" style={{ height: 'auto', minHeight: '1120px' }}>
                <div className="a4-page-content" style={{ paddingBottom: '40px' }}>
                  {/* Document Content Sections starting directly from Section 1 without redundant header table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.keys(formData.sections || {})
                      .filter(key => !key.startsWith('__'))
                      .map((sectionName, sIdx) => {
                        let htmlContent = formData.sections[sectionName] || '';
                        // Thay thế biểu tượng checkmark (✔ hoặc ✓) bằng dấu gạch ngang (-) cho khớp file Word
                        htmlContent = htmlContent.replace(/✔\s*/g, '- ').replace(/✓\s*/g, '- ');
                        return (
                          <div key={sIdx} style={{ paddingBottom: '12px' }}>
                            <h3 style={{
                              fontSize: '1.05rem',
                              fontWeight: 'bold',
                              color: '#000',
                              marginBottom: '6px'
                            }}>
                              {sIdx + 1}. {sectionName}
                            </h3>
                            <div
                              className="iso-preview-section-content"
                              dangerouslySetInnerHTML={{ __html: htmlContent || '<em style="color:#9CA3AF">Không có nội dung</em>' }}
                              style={{
                                fontSize: '0.92rem',
                                color: '#000',
                                paddingLeft: '12px',
                                lineHeight: '1.5'
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Footer page 3 */}
                <div className="a4-footer">
                  <span>Mã hiệu: {formData.symbol || '---'}</span>
                  <span>Ngày ban hành: {formData.issue_date || '---'}</span>
                  <span>Lần ban hành: {formData.version || '01'}</span>
                  <span>Trang 3</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Danh sách tài liệu */}
        {activeFormTab === 'processes' && (
          <div style={cardStyle}>
            <div style={headerStyle}>
              <span style={headerTextStyle}>Danh sách quy trình áp dụng</span>
              <button
                onClick={fetchProcesses}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: '#7B5233',
                  fontWeight: 'bold'
                }}
              >
                <RefreshCw size={14} className={procLoading ? 'spin' : ''} /> Tải lại dữ liệu
              </button>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#fff', borderTop: '1px solid #EADCC9' }}>
              {/* Filter toolbar */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#8D6E63' }} />
                  <input
                    type="text"
                    value={procSearchQuery}
                    onChange={(e) => {
                      setProcSearchQuery(e.target.value);
                      setProcPage(1);
                    }}
                    placeholder="Tìm theo mã hoặc tên quy trình..."
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '8px 12px 8px 34px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      color: '#1F2937'
                    }}
                  />
                </div>

                {/* Department filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>Phòng ban</span>
                  <select
                    value={procDeptFilter}
                    onChange={(e) => {
                      setProcDeptFilter(e.target.value);
                      setProcPage(1);
                    }}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      color: '#1F2937'
                    }}
                  >
                    <option value="All">Tất cả phòng ban</option>
                    {Object.keys(DEPT_MAP).map(deptKey => (
                      <option key={deptKey} value={deptKey}>{DEPT_MAP[deptKey]}</option>
                    ))}
                  </select>
                </div>

                {/* Issue Date filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>BH Ngày</span>
                  <input
                    type="date"
                    value={procDateFilter}
                    onChange={(e) => {
                      setProcDateFilter(e.target.value);
                      setProcPage(1);
                    }}
                    style={{
                      height: '36px',
                      padding: '0 8px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      color: '#1F2937'
                    }}
                  />
                </div>

                {/* Status filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4B5563', textTransform: 'uppercase' }}>Trạng thái</span>
                  <select
                    value={procStatusFilter}
                    onChange={(e) => {
                      setProcStatusFilter(e.target.value);
                      setProcPage(1);
                    }}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      outline: 'none',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      color: '#1F2937'
                    }}
                  >
                    <option value="All">Tất cả trạng thái</option>
                    <option value="Nháp">Nháp</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Đang lưu hành">Đang lưu hành</option>
                    <option value="Đang điều chỉnh">Đang điều chỉnh</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              {procLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Đang tải danh sách quy trình...
                </div>
              ) : filteredProcesses.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Không tìm thấy quy trình thực tế nào.
                </div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', color: '#7B5233', height: '40px' }}>
                          <th style={{ padding: '10px 12px', width: '50px', fontWeight: 'bold' }}>STT</th>
                          <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Mã quy trình</th>
                          <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Ký hiệu</th>
                          <th style={{ padding: '10px 12px', fontWeight: 'bold' }}>Tên quy trình</th>
                          <th style={{ padding: '10px 12px', width: '150px', fontWeight: 'bold' }}>Phòng ban</th>
                          <th style={{ padding: '10px 12px', width: '150px', fontWeight: 'bold' }}>Người biên soạn</th>
                          <th style={{ padding: '10px 12px', width: '120px', fontWeight: 'bold' }}>Ngày ban hành</th>
                          <th style={{ padding: '10px 12px', width: '130px', fontWeight: 'bold', textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ padding: '10px 12px', width: '140px', fontWeight: 'bold', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProcesses.map((p, pIdx) => {
                          const deptAbbrev = getDeptAbbrev(p.symbol, p.code);
                          const displayIdx = (procPage - 1) * procPageSize + pIdx + 1;

                          // Status styling
                          const statusColors =
                            p.status === 'Đang lưu hành' ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' } :
                              p.status === 'Đang điều chỉnh' ? { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' } :
                                p.status === 'Chờ duyệt' ? { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' } :
                                  { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }; // Nháp

                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', height: '48px' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#64748b' }}>{displayIdx}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1F2937' }}>{p.code}</td>
                              <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.symbol || '---'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: '600', color: '#7B5233' }}>{p.name}</td>
                              <td style={{ padding: '10px 12px', color: '#4B5563' }}>{getDeptName(deptAbbrev)}</td>
                              <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.editor || '---'}</td>
                              <td style={{ padding: '10px 12px', color: '#4B5563' }}>{p.issue_date || '---'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.73rem',
                                  fontWeight: 'bold',
                                  backgroundColor: statusColors.bg,
                                  color: statusColors.text,
                                  border: `1px solid ${statusColors.border}`
                                }}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => navigate(`/admin/iso-processes/edit/${p.id}`)}
                                    title="Xem quy trình"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '4px',
                                      border: '1px solid #7B5233',
                                      color: '#7B5233',
                                      backgroundColor: '#fff',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => navigate(`/admin/iso-processes/edit/${p.id}?print=true`)}
                                    title="Tải xuống dạng PDF"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '4px',
                                      border: '1px solid #7B5233',
                                      color: '#fff',
                                      backgroundColor: '#7B5233',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <Printer size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalProcPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Hiển thị <b>{paginatedProcesses.length}</b> trên <b>{filteredProcesses.length}</b> quy trình
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setProcPage(prev => Math.max(prev - 1, 1))}
                          disabled={procPage === 1}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: procPage === 1 ? '#F3F4F6' : '#fff',
                            color: procPage === 1 ? '#9CA3AF' : '#374151',
                            cursor: procPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          Trang trước
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#4B5563', padding: '0 8px' }}>
                          Trang <b>{procPage}</b> / {totalProcPages}
                        </span>
                        <button
                          onClick={() => setProcPage(prev => Math.min(prev + 1, totalProcPages))}
                          disabled={procPage === totalProcPages}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: procPage === totalProcPages ? '#F3F4F6' : '#fff',
                            color: procPage === totalProcPages ? '#9CA3AF' : '#374151',
                            cursor: procPage === totalProcPages ? 'not-allowed' : 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          Trang sau
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ISOFormEditorView;
