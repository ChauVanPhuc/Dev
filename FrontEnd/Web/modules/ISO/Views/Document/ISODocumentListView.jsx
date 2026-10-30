import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Search, Filter, Upload, FileText, Download, AlertCircle, CheckCircle, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, FolderArchive, Layers, X, Building, User, ShieldCheck, Calendar, Loader2, MoreVertical, RotateCcw, ArrowUpDown, Paperclip, SlidersHorizontal, Check } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { formatVietnameseDateTime, formatVietnameseDate } from '../../utils/isoDateUtils';
import ISOProcessPreviewModal from '../../components/ISOProcessPreviewModal';
import ISOAttachedDocsTree from '../../components/ISOAttachedDocsTree';

const getDepartmentAbbreviation = (templateSymbol, user) => {
  if (templateSymbol) {
    // Try to parse from template symbol, e.g. "G7.CL-QT01" or "G7.CL.QT01"
    const match = templateSymbol.match(/G7\.([A-Z0-9]+)[-.]/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  // Fallback to logged-in user
  const dept = (user?.department_name || user?.role_name || '').toUpperCase();
  if (dept.includes('CHẤT LƯỢNG') || dept.includes('QC') || dept.includes('CL') || dept.includes('KCS')) return 'CL';
  if (dept.includes('SẢN XUẤT') || dept.includes('SX')) return 'SX';
  if (dept.includes('KỸ THUẬT') || dept.includes('KT')) return 'KT';
  if (dept.includes('KHO')) return 'KHO';
  if (dept.includes('IT')) return 'IT';
  if (dept.includes('BGD') || dept.includes('BAN GIÁM ĐỐC')) return 'BGD';
  return 'SX';
};

const getTemplateAbbreviation = (templateSymbol) => {
  if (!templateSymbol) return 'QT';
  const parts = templateSymbol.split(/[-.]/);
  const lastPart = parts[parts.length - 1];
  const match = lastPart.match(/^([A-Za-z]+)/);
  if (match) {
    return match[1].toUpperCase();
  }
  return 'QT';
};

// Hàm sinh mã tài liệu tự động theo định dạng chuẩn G7.{Mã_PB}.{Mã_Loại}{Số_TT} (G7.AA.BBCC)
const generateProcessCode = (deptCode, docTypeCode, processesList = []) => {
  let dCode = (deptCode || 'QL').trim().toUpperCase();
  if (dCode === 'QLCL' || dCode === 'CL') dCode = 'QL';
  if (dCode === 'BGD' || dCode === 'BG') dCode = 'ISO';
  const tCode = (docTypeCode || 'QT').trim().toUpperCase();
  const prefix = `G7.${dCode}.${tCode}`;
  let maxZz = 0;
  (processesList || []).forEach(p => {
    const pCode = (p.new_code || p.code || '').toUpperCase();
    if (pCode.startsWith(prefix)) {
      const suffix = pCode.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxZz) {
        maxZz = num;
      }
    }
  });
  const zz = String(maxZz + 1).padStart(2, '0');
  return `G7.${dCode}.${tCode}${zz}`;
};

// Quản lý lưu và phục hồi tùy chọn gần nhất khi thêm tài liệu mới
const ISO_CREATE_PREFS_KEY = 'smartflow_iso_create_prefs';

const getSavedCreatePrefs = () => {
  try {
    const raw = localStorage.getItem(ISO_CREATE_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const saveCreatePrefs = (prefs) => {
  try {
    const current = getSavedCreatePrefs() || {};
    const updated = { ...current, ...prefs };
    localStorage.setItem(ISO_CREATE_PREFS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Lỗi lưu tùy chọn tạo tài liệu:', e);
  }
};

const findApprover = (level, deptAbbr, accountsList) => {
  if (!accountsList || accountsList.length === 0) return '';
  // Cả Cấp phòng và Cấp công ty (Bước 1) đều đưa cho Trưởng phòng ký trước
  const candidates = accountsList.filter(a => {
    const roleName = (a.role_name || '').toLowerCase();
    const permName = (a.permission_name || '').toLowerCase();
    const levelName = (a.permission_level || '').toLowerCase();
    return (
      roleName.includes('trưởng phòng') || 
      permName.includes('trưởng phòng') || 
      levelName.includes('trưởng phòng') ||
      levelName.includes('quản lý')
    );
  });
  return candidates.length > 0 ? candidates[0].full_name : (accountsList[0]?.full_name || 'Trưởng phòng');
};

const getCurrentFormattedDate = () => {
  const now = new Date();
  const DD = String(now.getDate()).padStart(2, '0');
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const YYYY = now.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};

const renderDocStatusBadge = (status, documentLevel) => {
  const rawStatus = (status || '').trim();
  const s = rawStatus.toLowerCase();

  // 1. Chỉnh sửa
  if (s === 'chỉnh sửa' || s.includes('chỉnh sửa') || s.includes('chinh sua')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FFF7ED',
        color: '#C2410C',
        border: '1px solid #FDBA74',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {rawStatus}
      </span>
    );
  }

  // 2. Chờ xem xét
  if (s === 'chờ xem xét' || s.includes('xem xét') || s.includes('xem xet')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#EFF6FF',
        color: '#1D4ED8',
        border: '1px solid #BFDBFE',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {rawStatus}
      </span>
    );
  }

  // 3. Chờ duyệt
  if (s === 'chờ duyệt' || s.includes('cho duyet') || s.includes('chờ')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FEF3C7',
        color: '#B45309',
        border: '1px solid #FDE68A',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {rawStatus}
      </span>
    );
  }

  // 4. Hết hiệu lực / Từ chối
  if (s === 'hết hiệu lực' || s.includes('hết hiệu lực') || s.includes('het hieu luc') || s.includes('từ chối') || s.includes('rejected')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
        border: '1px solid #FECACA',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {rawStatus}
      </span>
    );
  }

  // 5. Hiệu lực
  if (s === 'hiệu lực' || s.includes('hiệu lực') || s.includes('hieu luc') || s.includes('đang lưu hành') || s.includes('đã duyệt')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#DCFCE7',
        color: '#15803D',
        border: '1px solid #86EFAC',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {rawStatus}
      </span>
    );
  }

  // 6. Soạn thảo / Nháp / Mặc định (Hiển thị đúng giá trị thực từ CSDL)
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 'bold',
      backgroundColor: '#F1F5F9',
      color: '#475569',
      border: '1px solid #CBD5E1',
      display: 'inline-block',
      whiteSpace: 'nowrap'
    }}>
      {rawStatus || '---'}
    </span>
  );
};

// Module-level cache phục vụ render tức thì (0ms) cho người dùng
let _isoProcessesCache = null;
let _isoDocumentsCache = null;
let _isoDocTypesCache = null;

const ISODocumentListView = ({ mode = 'documents' }) => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  const routePath = mode === 'processes' ? '/admin/iso-processes' : '/admin/iso-documents';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);
  const navigate = useNavigate();

  const [documents, setDocuments] = useState(() => {
    if (mode === 'processes' && _isoProcessesCache) return _isoProcessesCache;
    if (mode === 'documents' && _isoDocumentsCache) return _isoDocumentsCache;
    return [];
  });
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [bgdList, setBgdList] = useState([]);
  const [docTypesList, setDocTypesList] = useState(() => _isoDocTypesCache || []);
  const [selectedWordFile, setSelectedWordFile] = useState(null);
  const [parsingWordLoading, setParsingWordLoading] = useState(false);
  const processFileInputRef = useRef(null);
  const [loading, setLoading] = useState(() => {
    if (mode === 'processes' && _isoProcessesCache) return false;
    if (mode === 'documents' && _isoDocumentsCache) return false;
    return true;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editorFilter, setEditorFilter] = useState('');
  const [approverFilter, setApproverFilter] = useState('');
  const [hasAttachmentFilter, setHasAttachmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [uploadLoading, setUploadLoading] = useState(false);
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProcessData, setNewProcessData] = useState({
    code: '',
    name: '',
    symbol: 'QT',
    doc_type_id: '',
    doc_type_code: 'QT',
    department_id: '',
    department_name: '',
    file_path: '',
    document_level: 'Cấp công ty',
    editor: '',
    owner: '',
    approver: '',
    approver_bgd: '',
    role: '',
    status: 'Nháp'
  });

  // Custom confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    id: null,
    title: '',
    message: '',
    onConfirm: null,
    confirmLabel: 'Xác nhận',
    confirmColor: '#d93025'
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [filterFolder, setFilterFolder] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);

  // States quản lý Modal xem trước tài liệu in (PDF Preview) khi click vào dòng
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Xử lý mở Modal xem trước khi click vào dòng bảng
  const handleOpenRowPreview = (doc, index) => {
    if (mode !== 'processes') return;
    const globalIndex = filteredDocs.findIndex(d => d.id === doc.id);
    setPreviewDoc(doc);
    setPreviewIndex(globalIndex >= 0 ? globalIndex : index);
    setIsPreviewModalOpen(true);
  };

  // Xử lý chuyển đổi mẫu quy trình trong modal (Next / Prev)
  const handleSelectPreviewIndex = (newIndex) => {
    if (newIndex >= 0 && newIndex < filteredDocs.length) {
      setPreviewIndex(newIndex);
      setPreviewDoc(filteredDocs[newIndex]);
    }
  };

  // Tự động đóng menu thao tác 3 chấm khi nhấn ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActionMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const fetchDocuments = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const url = mode === 'processes' ? '/iso-documents/processes' : '/iso-documents/';
      const data = await api.get(url);
      const res = data || [];
      if (mode === 'processes') _isoProcessesCache = res;
      else _isoDocumentsCache = res;
      setDocuments(res);
    } catch (error) {
      console.error('Lỗi khi tải danh sách:', error);
      showFeedback('error', 'Không thể kết nối đến máy chủ để tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasCache = mode === 'processes' ? !!_isoProcessesCache : !!_isoDocumentsCache;
    fetchDocuments(!hasCache);

    if (mode === 'processes') {
      if (_isoDocTypesCache) {
        setDocTypesList(_isoDocTypesCache);
      } else {
        api.get('/iso-documents/types')
          .then(res => {
            if (Array.isArray(res)) {
              _isoDocTypesCache = res;
              setDocTypesList(res);
            }
          })
          .catch(err => console.error('Lỗi khi tải danh mục loại tài liệu:', err));
      }
    }
  }, [mode]);

  // Kích hoạt chọn tệp Word trực tiếp từ máy khi bấm Thêm mới
  const handleInitiateCreateProcess = () => {
    if (processFileInputRef.current) {
      processFileInputRef.current.value = '';
      processFileInputRef.current.click();
    }
  };

  const openCreateModal = async () => {
    try {
      setLoading(true);
      const [deptsData, tpData, bgdData, procsData, typesData] = await Promise.all([
        api.get('/iso-documents/meta/departments').catch(() => []),
        api.get('/iso-documents/approvers/department-heads').catch(() => []),
        api.get('/iso-documents/approvers/bgd').catch(() => []),
        api.get('/iso-documents/processes').catch(() => []),
        api.get('/iso-documents/types').catch(() => [])
      ]);
      const depts = Array.isArray(deptsData) ? deptsData : [];
      const tps = Array.isArray(tpData) ? tpData : [];
      const bgds = Array.isArray(bgdData) ? bgdData : [];
      const procs = Array.isArray(procsData) ? procsData : [];
      const dtypes = Array.isArray(typesData) && typesData.length > 0 ? typesData : docTypesList;

      setDepartmentsList(depts);
      setDepartmentHeads(tps);
      setBgdList(bgds);
      setAllProcesses(procs);
      if (Array.isArray(typesData) && typesData.length > 0) {
        setDocTypesList(typesData);
      }

      // 1. Tải lịch sử lựa chọn trước đó từ localStorage (nếu có)
      const savedPrefs = getSavedCreatePrefs();

      // Cấp tài liệu đã chọn trước đó
      const selectedDocLevel = savedPrefs?.document_level || 'Cấp công ty';

      // Phòng ban đã chọn trước đó (nếu còn tồn tại trong depts)
      let selectedDept = depts.length > 0 ? depts[0] : null;
      if (savedPrefs?.department_id) {
        const found = depts.find(d => d.id === parseInt(savedPrefs.department_id, 10));
        if (found) selectedDept = found;
      } else if (savedPrefs?.department_name) {
        const found = depts.find(d => d.name === savedPrefs.department_name);
        if (found) selectedDept = found;
      }
      const deptCode = selectedDept ? selectedDept.code : 'QL';

      // Loại tài liệu đã chọn trước đó (nếu còn tồn tại trong dtypes)
      let selectedDocType = dtypes.length > 0 
        ? (dtypes.find(t => (t.code || '').toUpperCase() === 'QT') || dtypes[0]) 
        : { id: 1, name: 'Quy trình', code: 'QT' };
      if (savedPrefs?.doc_type_id) {
        const found = dtypes.find(t => String(t.id) === String(savedPrefs.doc_type_id));
        if (found) selectedDocType = found;
      } else if (savedPrefs?.doc_type_code) {
        const found = dtypes.find(t => (t.code || '').toUpperCase() === savedPrefs.doc_type_code.toUpperCase());
        if (found) selectedDocType = found;
      }
      const docTypeCode = selectedDocType.code || 'QT';

      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const editorName = loggedInUser.full_name || loggedInUser.username || 'Administrator';

      // Sinh mã tài liệu tự động theo phòng ban & loại tài liệu
      const generatedCode = generateProcessCode(deptCode, docTypeCode, procs);

      // Người xem xét (Trưởng phòng) đã chọn trước đó
      let selectedApprover = tps.length > 0 ? tps[0].full_name : 'Đặng Văn Nam';
      if (savedPrefs?.approver) {
        const found = tps.find(a => a.full_name === savedPrefs.approver);
        selectedApprover = found ? found.full_name : savedPrefs.approver;
      }

      // Người phê duyệt ban hành (Ban Giám Đốc) đã chọn trước đó
      let selectedBgd = bgds.length > 0 ? bgds[0].full_name : 'Nguyễn Hòa';
      if (savedPrefs?.approver_bgd) {
        const found = bgds.find(b => b.full_name === savedPrefs.approver_bgd);
        selectedBgd = found ? found.full_name : savedPrefs.approver_bgd;
      }

      setSelectedWordFile(null);
      setNewProcessData({
        code: generatedCode,
        name: '',
        symbol: docTypeCode,
        doc_type_id: selectedDocType.id || '',
        doc_type_code: docTypeCode,
        department_id: selectedDept ? selectedDept.id : '',
        department_name: selectedDept ? selectedDept.name : '',
        file_path: '',
        document_level: selectedDocLevel,
        editor: editorName,
        owner: editorName,
        approver: selectedApprover,
        approver_bgd: selectedDocLevel === 'Cấp công ty' ? selectedBgd : '',
        role: selectedDept ? selectedDept.name : '',
        status: 'Nháp'
      });
      setShowCreateModal(true);
    } catch (error) {
      console.error('Lỗi khi chuẩn bị tạo tài liệu:', error);
      showFeedback('error', 'Không thể tải danh sách dữ liệu khởi tạo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDepartment = (deptId) => {
    const dept = departmentsList.find(d => d.id === parseInt(deptId, 10));
    if (!dept) return;
    const deptCode = dept.code || 'SX';
    const docTypeCode = newProcessData.doc_type_code || 'QT';
    const generatedCode = generateProcessCode(deptCode, docTypeCode, allProcesses);

    setNewProcessData(prev => ({
      ...prev,
      department_id: dept.id,
      department_name: dept.name,
      code: generatedCode,
      role: dept.name
    }));
    saveCreatePrefs({ department_id: dept.id, department_name: dept.name });
  };

  const handleSelectDocType = (docTypeId) => {
    const dType = docTypesList.find(t => String(t.id) === String(docTypeId));
    const docTypeCode = dType ? dType.code : 'QT';
    const dept = departmentsList.find(d => d.id === parseInt(newProcessData.department_id, 10));
    const deptCode = dept ? dept.code : 'QL';
    const generatedCode = generateProcessCode(deptCode, docTypeCode, allProcesses);

    setNewProcessData(prev => ({
      ...prev,
      doc_type_id: dType ? dType.id : '',
      doc_type_code: docTypeCode,
      symbol: docTypeCode,
      code: generatedCode
    }));
    saveCreatePrefs({ doc_type_id: dType ? dType.id : '', doc_type_code: docTypeCode });
  };

  // Xử lý bóc tách tệp Word: Tải lên -> Phân tích -> Tự động điền dữ liệu -> Hiển thị Modal
  const handleProcessWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.docx)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setParsingWordLoading(true);

    try {
      // 1. Tải song song: Upload & parse Word đồng thời nạp danh sách Phòng ban & Trưởng phòng & Loại tài liệu
      const [parsedData, deptsData, tpData, bgdData, procsData, typesData] = await Promise.all([
        api.post('/iso-documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
        departmentsList.length > 0 ? Promise.resolve(departmentsList) : api.get('/iso-documents/meta/departments').catch(() => []),
        departmentHeads.length > 0 ? Promise.resolve(departmentHeads) : api.get('/iso-documents/approvers/department-heads').catch(() => []),
        bgdList.length > 0 ? Promise.resolve(bgdList) : api.get('/iso-documents/approvers/bgd').catch(() => []),
        allProcesses.length > 0 ? Promise.resolve(allProcesses) : api.get('/iso-documents/processes').catch(() => []),
        docTypesList.length > 0 ? Promise.resolve(docTypesList) : api.get('/iso-documents/types').catch(() => [])
      ]);

      const depts = Array.isArray(deptsData) ? deptsData : [];
      const tps = Array.isArray(tpData) ? tpData : [];
      const bgds = Array.isArray(bgdData) ? bgdData : [];
      const procs = Array.isArray(procsData) ? procsData : [];
      const dtypes = Array.isArray(typesData) ? typesData : [];

      setDepartmentsList(depts);
      setDepartmentHeads(tps);
      setBgdList(bgds);
      setAllProcesses(procs);
      setDocTypesList(dtypes);

      // 2. Nhận diện phòng ban phù hợp từ tên tệp hoặc nội dung
      const fileBaseName = file.name.replace(/\.[^/.]+$/, "");
      const lowerName = fileBaseName.toLowerCase();
      let matchedDept = depts.find(d => {
        const c = (d.code || '').toLowerCase();
        const n = (d.name || '').toLowerCase();
        return (c && lowerName.includes(c)) || (n && lowerName.includes(n));
      });
      if (!matchedDept) {
        matchedDept = depts.find(d => ['QL', 'CL'].includes((d.code || '').toUpperCase())) || (depts.length > 0 ? depts[0] : null);
      }

      const deptCode = matchedDept ? matchedDept.code : 'QL';

      // Nhận diện loại tài liệu phù hợp (nếu có)
      let matchedType = dtypes.find(t => {
        const n = (t.name || '').toLowerCase();
        const c = (t.code || '').toLowerCase();
        return lowerName.includes(n) || lowerName.includes(`.${c}.`) || lowerName.includes(`-${c}-`);
      });
      if (!matchedType) {
        matchedType = dtypes.find(t => (t.code || '').toUpperCase() === 'QT') || (dtypes.length > 0 ? dtypes[0] : { id: 1, name: 'Quy trình', code: 'QT' });
      }
      const docTypeCode = matchedType ? matchedType.code : 'QT';

      // 3. Tự động sinh mã tài liệu kế tiếp theo phòng ban & loại tài liệu
      const generatedCode = generateProcessCode(deptCode, docTypeCode, procs);

      // 4. Lấy thông tin người biên soạn, Người xem xét (Trưởng phòng) và Người phê duyệt (BGD)
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const editorName = loggedInUser.full_name || loggedInUser.username || 'Administrator';
      
      const savedPrefs = getSavedCreatePrefs();
      let defaultApprover = tps.length > 0 ? tps[0].full_name : 'Đặng Văn Nam';
      if (savedPrefs?.approver) {
        const found = tps.find(a => a.full_name === savedPrefs.approver);
        defaultApprover = found ? found.full_name : savedPrefs.approver;
      }
      let defaultBgd = bgds.length > 0 ? bgds[0].full_name : 'Nguyễn Hòa';
      if (savedPrefs?.approver_bgd) {
        const found = bgds.find(b => b.full_name === savedPrefs.approver_bgd);
        defaultBgd = found ? found.full_name : savedPrefs.approver_bgd;
      }
      const defaultDocLevel = savedPrefs?.document_level || 'Cấp công ty';

      const processName = parsedData?.name || fileBaseName;

      // 5. Cập nhật state dữ liệu tài liệu
      setSelectedWordFile(file);
      setNewProcessData({
        code: generatedCode,
        name: processName,
        symbol: docTypeCode,
        doc_type_id: matchedType ? matchedType.id : '',
        doc_type_code: docTypeCode,
        department_id: matchedDept ? matchedDept.id : '',
        department_name: matchedDept ? matchedDept.name : '',
        file_path: parsedData?.file_path || '',
        diagram_data: parsedData?.diagram_data || '',
        sections: parsedData?.sections || undefined,
        steps: parsedData?.steps || undefined,
        document_level: defaultDocLevel,
        editor: editorName,
        owner: editorName,
        approver: defaultApprover,
        approver_bgd: defaultDocLevel === 'Cấp công ty' ? defaultBgd : '',
        role: matchedDept ? matchedDept.name : '',
        status: 'Nháp'
      });

      showFeedback('success', `Đã bóc tách thành công tệp: ${file.name}`);
      
      // 6. Hiển thị Modal "Thêm tài liệu mới" sau khi chọn và bóc tách file xong
      setShowCreateModal(true);

    } catch (err) {
      console.error('Lỗi phân tích file Word:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể phân tích tệp Word');
    } finally {
      setParsingWordLoading(false);
      e.target.value = '';
    }
  };

  const handleCreateProcess = async (e) => {
    e.preventDefault();
    if (!newProcessData.code || !newProcessData.name || !newProcessData.department_id) {
      showFeedback('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc (Cấp tài liệu, Phòng ban, Loại tài liệu, Tên tài liệu)');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/iso-documents/processes/save', newProcessData);
      saveCreatePrefs({
        document_level: newProcessData.document_level,
        department_id: newProcessData.department_id,
        department_name: newProcessData.department_name,
        doc_type_id: newProcessData.doc_type_id,
        doc_type_code: newProcessData.doc_type_code,
        approver: newProcessData.approver,
        approver_bgd: newProcessData.approver_bgd
      });
      setShowCreateModal(false);
      showFeedback('success', res.message || 'Khởi tạo tài liệu mới thành công!');
      _isoProcessesCache = null;
      fetchDocuments();
      
      const createdId = res.id;
      setTimeout(() => {
        setConfirmModal({
          show: true,
          id: createdId,
          title: '🎉 Khởi tạo thành công!',
          message: 'Tài liệu mới đã được tạo. Bạn có muốn chuyển đến màn hình Biên soạn & Vẽ lưu đồ ngay không?',
          confirmLabel: 'Đi đến Biên soạn',
          confirmColor: '#16a34a',
          onConfirm: () => {
            setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' });
            navigate(`/admin/iso-processes/edit/${createdId}`);
          }
        });
      }, 500);

    } catch (error) {
      console.error('Lỗi khi tạo tài liệu:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi tạo tài liệu mới');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    toast(type, text);
  };

  // Xử lý upload file Word .docx
  const handleFileUpload = async (e) => {
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

    const formData = new FormData();
    formData.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình...');

    try {
      // Gọi API upload để parse dữ liệu bằng Axios
      const parsedData = await api.post('/iso-documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Chuyển hướng sang màn hình form editor kèm dữ liệu phân tích được truyền qua state
      navigate(mode === 'processes' ? '/admin/iso-processes/edit/new' : '/admin/iso-documents/edit/new', { state: { parsedData } });

    } catch (error) {
      console.error('Lỗi khi tải lên file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình ISO';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = ''; // Reset input file
    }
  };

  // Xử lý xoá tài liệu quy trình
  const handleDeleteDoc = (id, code, name) => {
    setConfirmModal({
      show: true,
      id,
      title: mode === 'processes' ? 'Xác nhận xoá Tài liệu' : 'Xác nhận xoá tài liệu ISO',
      message: mode === 'processes'
        ? `Bạn có chắc chắn muốn xoá tài liệu áp dụng thực tế '${code} - ${name}' cùng toàn bộ thiết lập chi tiết liên quan?`
        : `Bạn có chắc chắn muốn xoá tài liệu mẫu '${code} - ${name}' cùng toàn bộ lưu đồ và thiết lập checklist liên quan?`,
      onConfirm: async () => {
        try {
          const url = mode === 'processes' ? `/iso-documents/processes/${id}` : `/iso-documents/${id}`;
          await api.delete(url);
          showFeedback('success', `Đã xoá thành công!`);
          _isoProcessesCache = null;
          _isoDocumentsCache = null;
          fetchDocuments();
        } catch (error) {
          console.error('Lỗi khi xoá tài liệu:', error);
          showFeedback('error', 'Không thể xoá tài liệu này');
        }
        setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' });
      }
    });
  };

  // Hàm chuẩn hóa tiếng Việt không dấu (Accent-insensitive)
  const normalizeSearch = (str) => {
    if (!str) return '';
    return str
      .toString()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .trim();
  };

  // Trích xuất danh sách thư mục và người ban hành duy nhất (mode documents)
  const uniqueFolders = useMemo(() => {
    const list = documents.map(d => d.folder).filter(Boolean);
    return [...new Set(list)];
  }, [documents]);

  const uniqueOwners = useMemo(() => {
    const list = documents.map(d => d.owner || d.issuer).filter(Boolean);
    return [...new Set(list)];
  }, [documents]);

  // Danh mục phòng ban duy nhất từ dữ liệu thực tế (mode processes)
  const uniqueDepartments = useMemo(() => {
    if (mode !== 'processes') return [];
    const depts = documents.map(d => (d.department_name || '').trim()).filter(Boolean);
    return [...new Set(depts)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [documents, mode]);

  // Danh mục người biên soạn duy nhất
  const uniqueEditors = useMemo(() => {
    if (mode !== 'processes') return [];
    const editors = documents.map(d => (d.editor || d.owner || '').trim()).filter(Boolean);
    return [...new Set(editors)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [documents, mode]);

  // Danh mục người phê duyệt duy nhất (Trưởng phòng & BGĐ)
  const uniqueApprovers = useMemo(() => {
    if (mode !== 'processes') return [];
    const approvers = [];
    documents.forEach(d => {
      if (d.approver && d.approver.trim()) approvers.push(d.approver.trim());
      if (d.approver_bgd && d.approver_bgd.trim()) approvers.push(d.approver_bgd.trim());
    });
    return [...new Set(approvers)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [documents, mode]);

  // Thống kê số lượng theo từng loại tài liệu phục vụ Quick Filter Pills
  const docTypeStats = useMemo(() => {
    if (mode !== 'processes') return [];
    const counts = {};
    documents.forEach(d => {
      const code = (d.doc_type_code || d.symbol || 'OTHER').toUpperCase().trim();
      counts[code] = (counts[code] || 0) + 1;
    });

    const standardTypes = [
      { code: 'QT', name: 'Quy trình' },
      { code: 'HD', name: 'Hướng dẫn' },
      { code: 'QD', name: 'Quyết định' },
      { code: 'CS', name: 'Chính sách' },
      { code: 'SD', name: 'Sơ đồ' },
      { code: 'BM', name: 'Biểu mẫu' },
      { code: 'ST', name: 'Sổ tay' },
      { code: 'MT', name: 'Mục tiêu' },
      { code: 'TT', name: 'Thông tư' }
    ];

    const result = standardTypes
      .filter(t => counts[t.code] > 0)
      .map(t => ({
        ...t,
        count: counts[t.code] || 0
      }));

    // Bổ sung các loại khác nếu có trong CSDL
    Object.keys(counts).forEach(k => {
      if (!standardTypes.some(t => t.code === k) && k !== 'OTHER') {
        result.push({
          code: k,
          name: k,
          count: counts[k]
        });
      }
    });

    return result;
  }, [documents, mode]);

  // Lọc danh sách tài liệu đa chiều & sắp xếp
  const filteredDocs = useMemo(() => {
    const qNorm = normalizeSearch(searchTerm);

    const filtered = documents.filter(doc => {
      // 1. Tìm kiếm đa trường không dấu tiếng Việt
      if (qNorm) {
        if (mode === 'processes') {
          const matchCode = normalizeSearch(doc.code).includes(qNorm);
          const matchNewCode = normalizeSearch(doc.new_code).includes(qNorm);
          const matchName = normalizeSearch(doc.name).includes(qNorm);
          const matchDept = normalizeSearch(doc.department_name).includes(qNorm);
          const matchOwner = normalizeSearch(doc.owner).includes(qNorm);
          const matchEditor = normalizeSearch(doc.editor).includes(qNorm);
          const matchApprover = normalizeSearch(doc.approver).includes(qNorm);
          const matchApproverBgd = normalizeSearch(doc.approver_bgd).includes(qNorm);
          const matchDocs = (doc.documents || []).some(sub => 
            normalizeSearch(sub.code).includes(qNorm) || normalizeSearch(sub.name).includes(qNorm)
          );
          if (!matchCode && !matchNewCode && !matchName && !matchDept && !matchOwner && !matchEditor && !matchApprover && !matchApproverBgd && !matchDocs) {
            return false;
          }
        } else {
          const matchCode = normalizeSearch(doc.code).includes(qNorm);
          const matchName = normalizeSearch(doc.name).includes(qNorm);
          const matchIssuer = normalizeSearch(doc.issuer).includes(qNorm);
          const matchFolder = normalizeSearch(doc.folder).includes(qNorm);
          const matchDocType = normalizeSearch(doc.doc_type).includes(qNorm);
          if (!matchCode && !matchName && !matchIssuer && !matchFolder && !matchDocType) {
            return false;
          }
        }
      }

      // 2. Lọc loại tài liệu (docTypeFilter)
      if (docTypeFilter && mode === 'processes') {
        const dType = (doc.doc_type_code || doc.symbol || '').toUpperCase().trim();
        if (dType !== docTypeFilter.toUpperCase()) return false;
      }

      // 3. Lọc phòng ban (departmentFilter)
      if (departmentFilter && mode === 'processes') {
        if ((doc.department_name || '').trim() !== departmentFilter.trim()) return false;
      }

      // 4. Lọc cấp duyệt (levelFilter)
      if (levelFilter) {
        const lvl = doc.document_level || 'Cấp phòng';
        if (lvl !== levelFilter) return false;
      }

      // 5. Lọc trạng thái (statusFilter)
      if (statusFilter) {
        if (!normalizeSearch(doc.status).includes(normalizeSearch(statusFilter))) return false;
      }

      // 6. Lọc người biên soạn (editorFilter)
      if (editorFilter && mode === 'processes') {
        const ed = (doc.editor || doc.owner || '').trim();
        if (ed !== editorFilter.trim()) return false;
      }

      // 7. Lọc người duyệt (approverFilter)
      if (approverFilter && mode === 'processes') {
        const ap1 = (doc.approver || '').trim();
        const ap2 = (doc.approver_bgd || '').trim();
        if (ap1 !== approverFilter.trim() && ap2 !== approverFilter.trim()) return false;
      }

      // 8. Lọc biểu mẫu đính kèm (hasAttachmentFilter)
      if (hasAttachmentFilter && mode === 'processes') {
        const count = doc.documents_count || (doc.documents ? doc.documents.length : 0);
        if (hasAttachmentFilter === 'yes' && count === 0) return false;
        if (hasAttachmentFilter === 'no' && count > 0) return false;
      }

      // 9. Bộ lọc cũ của mode documents
      if (mode === 'documents') {
        if (filterFolder !== '' && doc.folder !== filterFolder) return false;
        if (filterOwner !== '' && doc.owner !== filterOwner && doc.issuer !== filterOwner) return false;
      }

      return true;
    });

    // 10. Sắp xếp danh sách
    return filtered.sort((a, b) => {
      if (sortBy === 'code_asc') {
        const ca = a.new_code || a.code || '';
        const cb = b.new_code || b.code || '';
        return ca.localeCompare(cb);
      }
      if (sortBy === 'code_desc') {
        const ca = a.new_code || a.code || '';
        const cb = b.new_code || b.code || '';
        return cb.localeCompare(ca);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '', 'vi');
      }
      if (sortBy === 'updated_asc') {
        const da = new Date(a.updated_at || a.created_at || a.issue_date || 0);
        const db = new Date(b.updated_at || b.created_at || b.issue_date || 0);
        return da - db;
      }
      // Mặc định: updated_desc (Mới nhất trước)
      const da = new Date(a.updated_at || a.created_at || a.issue_date || 0);
      const db = new Date(b.updated_at || b.created_at || b.issue_date || 0);
      return db - da;
    });
  }, [
    documents, searchTerm, docTypeFilter, departmentFilter, levelFilter,
    statusFilter, editorFilter, approverFilter, hasAttachmentFilter,
    sortBy, filterFolder, filterOwner, mode
  ]);

  // Đếm tổng số điều kiện lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (docTypeFilter) count++;
    if (departmentFilter) count++;
    if (levelFilter) count++;
    if (statusFilter) count++;
    if (editorFilter) count++;
    if (approverFilter) count++;
    if (hasAttachmentFilter) count++;
    if (sortBy !== 'updated_desc') count++;
    if (filterFolder) count++;
    if (filterOwner) count++;
    return count;
  }, [docTypeFilter, departmentFilter, levelFilter, statusFilter, editorFilter, approverFilter, hasAttachmentFilter, sortBy, filterFolder, filterOwner]);

  // Hàm đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setDocTypeFilter('');
    setDepartmentFilter('');
    setLevelFilter('');
    setStatusFilter('');
    setEditorFilter('');
    setApproverFilter('');
    setHasAttachmentFilter('');
    setSortBy('updated_desc');
    setFilterFolder('');
    setFilterOwner('');
    setPage(1);
  };

  const paginatedDocs = useMemo(() => {
    return filteredDocs.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredDocs, page, pageSize]);

  // Hiển thị cấp duyệt (chữ thường, không khung bo màu)
  const renderDocumentLevelBadge = (level) => {
    return (
      <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {level || 'Cấp phòng'}
      </span>
    );
  };

  // Người duyệt 1: Trưởng phòng ký (Chỉ hiển thị tên khi thực tế đã được ký duyệt)
  const renderApprover1 = (doc) => {
    const statusLower = (doc.status || '').toLowerCase().trim();

    // Chưa qua bước Trưởng phòng duyệt (Dự thảo, Bản nháp, Chờ duyệt, Chờ Trưởng phòng duyệt, Từ chối, Soạn thảo)
    if (
      !doc.status ||
      statusLower.includes('dự thảo') ||
      statusLower.includes('chờ trưởng phòng') ||
      statusLower.includes('chờ duyệt') ||
      statusLower.includes('bản nháp') ||
      statusLower.includes('từ chối') ||
      statusLower.includes('soạn thảo')
    ) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>---</span>;
    }

    // Các trạng thái Trưởng phòng đã duyệt: "Trưởng phòng đã duyệt", "Chờ BGĐ", "BGĐ đã duyệt", "Đã duyệt", "Hiệu lực"
    return (
      <span style={{ fontWeight: 500, color: '#1e293b' }}>
        {doc.approver || (mode === 'processes' ? 'Đặng Văn Nam' : 'Trưởng phòng')}
      </span>
    );
  };

  // Người duyệt 2: Ban Giám Đốc (BGĐ) ký (Chỉ hiển thị tên khi thực tế đã được ký duyệt)
  const renderApprover2 = (doc) => {
    const lvl = doc.document_level || 'Cấp phòng';
    const statusLower = (doc.status || '').toLowerCase().trim();

    // Nếu là hồ sơ Cấp phòng (quy trình chỉ duyệt cấp phòng, không cần BGĐ)
    if (lvl === 'Cấp phòng' && !statusLower.includes('bgđ')) {
      return <span style={{ color: '#cbd5e1', fontWeight: 'bold' }} title="Không áp dụng cấp BGĐ">-</span>;
    }

    // Đã được BGĐ ký duyệt
    const isBgdApproved = statusLower.includes('bgđ đã duyệt') ||
                          statusLower.includes('ban giám đốc đã duyệt') ||
                          statusLower.includes('hiệu lực') ||
                          (statusLower.includes('đã duyệt') && !statusLower.includes('chờ bgđ'));

    if (isBgdApproved) {
      return (
        <span style={{ fontWeight: 600, color: '#1E40AF' }}>
          {doc.approver_bgd || 'Ban Giám Đốc'}
        </span>
      );
    }

    // Chưa tới lượt BGĐ duyệt hoặc đang chờ BGĐ duyệt
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>---</span>;
  };

  return (
    <div className="gold-layout iso-document-list-view" style={{
      height: 'calc(100vh - 68px)',
      maxHeight: 'calc(100vh - 68px)',
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
      padding: '0'
    }}>
      <div className="sticky-top-zone" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>

      {/* 1. Bộ điều khiển hành động và bộ lọc sử dụng PageToolbar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
        searchPlaceholder={mode === 'processes' ? 'Tìm theo mã tài liệu, tên, người biên soạn, người duyệt...' : 'Tìm theo mã mẫu, tên, người ban hành...'}
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={activeFiltersCount}
        onCreate={mode === 'processes' ? openCreateModal : undefined}
        createLabel={mode === 'processes' ? 'Thêm mới' : undefined}
        createActions={[]}
        hasWritePermission={true}
      />

      {/* 1.1 Thanh lọc nhanh theo Loại tài liệu 1-Click (Quick Filter Pills) */}
      {mode === 'processes' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          padding: '2px 4px 4px 4px',
          scrollbarWidth: 'thin'
        }}>
          {/* Nút Tất cả */}
          <button
            type="button"
            onClick={() => { setDocTypeFilter(''); setPage(1); }}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: docTypeFilter === '' ? '1.5px solid #7B5233' : '1px solid #EADCC9',
              backgroundColor: docTypeFilter === '' ? '#7B5233' : '#FFFFFF',
              color: docTypeFilter === '' ? '#FFFFFF' : '#475569',
              fontSize: '0.80rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: docTypeFilter === '' ? '0 2px 6px rgba(123,82,51,0.2)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Tất cả</span>
            <span style={{
              fontSize: '0.70rem',
              padding: '1px 6px',
              borderRadius: '10px',
              backgroundColor: docTypeFilter === '' ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
              color: docTypeFilter === '' ? '#FFFFFF' : '#64748B'
            }}>
              {documents.length}
            </span>
          </button>

          {/* Các nút loại tài liệu thực tế */}
          {docTypeStats.map(item => {
            const isSelected = docTypeFilter.toUpperCase() === item.code.toUpperCase();
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setDocTypeFilter(isSelected ? '' : item.code);
                  setPage(1);
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #7B5233' : '1px solid #EADCC9',
                  backgroundColor: isSelected ? '#7B5233' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? '0 2px 6px rgba(123,82,51,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{item.name} ({item.code})</span>
                <span style={{
                  fontSize: '0.70rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#64748B'
                }}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 1.2 Dải thẻ điều kiện đang chọn (Active Filter Chips) */}
      {(activeFiltersCount > 0 || searchTerm) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '2px 4px 2px 4px',
          fontSize: '0.78rem'
        }}>
          <span style={{ color: '#7B5233', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal size={13} /> Đang lọc:
          </span>

          {searchTerm && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Từ khóa: <strong>"{searchTerm}"</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setSearchTerm(''); setPage(1); }} />
            </span>
          )}

          {docTypeFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Loại: <strong>{docTypeFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setDocTypeFilter(''); setPage(1); }} />
            </span>
          )}

          {departmentFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Phòng ban: <strong>{departmentFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setDepartmentFilter(''); setPage(1); }} />
            </span>
          )}

          {levelFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Cấp duyệt: <strong>{levelFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setLevelFilter(''); setPage(1); }} />
            </span>
          )}

          {statusFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Trạng thái: <strong>{statusFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setStatusFilter(''); setPage(1); }} />
            </span>
          )}

          {editorFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Biên soạn: <strong>{editorFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setEditorFilter(''); setPage(1); }} />
            </span>
          )}

          {approverFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Người duyệt: <strong>{approverFilter}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setApproverFilter(''); setPage(1); }} />
            </span>
          )}

          {hasAttachmentFilter && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Biểu mẫu: <strong>{hasAttachmentFilter === 'yes' ? 'Có đính kèm' : 'Chưa có'}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setHasAttachmentFilter(''); setPage(1); }} />
            </span>
          )}

          {sortBy !== 'updated_desc' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '14px',
              backgroundColor: '#EDE3D2',
              color: '#543821',
              fontWeight: 500,
              border: '1px solid #EADCC9'
            }}>
              Sắp xếp: <strong>{sortBy === 'code_asc' ? 'Mã A-Z' : sortBy === 'code_desc' ? 'Mã Z-A' : sortBy === 'name_asc' ? 'Tên A-Z' : 'Cũ nhất'}</strong>
              <X size={12} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => { setSortBy('updated_desc'); setPage(1); }} />
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#DC2626',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 6px',
              textDecoration: 'underline'
            }}
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {/* 1.3 Bảng điều khiển bộ lọc chi tiết dạng lưới (Grid Filter Bar) */}
      {isFilterBarOpen && (
        <div style={{
          backgroundColor: '#FAF7F2',
          border: '1px solid #EADCC9',
          borderRadius: '10px',
          padding: '12px 14px',
          boxShadow: '0 4px 12px rgba(45, 26, 18, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '2px'
        }}>
          {/* HÀNG 1: Phân loại & Cấu trúc tài liệu (4 nhóm trường chia đều) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: mode === 'processes' ? 'repeat(4, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            {/* 1. Loại tài liệu (Doc Type) */}
            {mode === 'processes' && (
              <div className="filter-field-group" style={{ margin: 0 }}>
                <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={13} /> Loại tài liệu
                </label>
                <select
                  value={docTypeFilter}
                  onChange={(e) => { setDocTypeFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả loại tài liệu</option>
                  <option value="QT">Quy trình (QT)</option>
                  <option value="HD">Hướng dẫn công việc (HD)</option>
                  <option value="QD">Quyết định (QD)</option>
                  <option value="CS">Chính sách / Cam kết (CS)</option>
                  <option value="SD">Sơ đồ tổ chức (SD)</option>
                  <option value="BM">Biểu mẫu hồ sơ (BM)</option>
                  <option value="ST">Sổ tay chất lượng (ST)</option>
                  <option value="MT">Mục tiêu chất lượng (MT)</option>
                  <option value="TT">Thông tư / Văn bản (TT)</option>
                </select>
              </div>
            )}

            {/* 2. Phòng ban / Bộ phận chủ quản */}
            <div className="filter-field-group" style={{ margin: 0 }}>
              <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building size={13} /> {mode === 'processes' ? 'Phòng ban chủ quản' : 'Người ban hành'}
              </label>
              {mode === 'processes' ? (
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả phòng ban</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={filterOwner}
                  onChange={(e) => { setFilterOwner(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả</option>
                  {uniqueOwners.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. Cấp duyệt */}
            <div className="filter-field-group" style={{ margin: 0 }}>
              <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} /> Cấp duyệt
              </label>
              <select
                value={levelFilter}
                onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
              >
                <option value="">Tất cả cấp duyệt</option>
                <option value="Cấp công ty">Cấp công ty (BGĐ ký duyệt)</option>
                <option value="Cấp phòng">Cấp phòng (Trưởng phòng duyệt)</option>
              </select>
            </div>

            {/* 4. Trạng thái */}
            <div className="filter-field-group" style={{ margin: 0 }}>
              <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} /> Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
              >
                <option value="">Tất cả trạng thái</option>
                {mode === 'processes' ? (
                  <>
                    <option value="Hiệu lực">Hiệu lực (Đang lưu hành)</option>
                    <option value="Soạn thảo">Soạn thảo</option>
                    <option value="Chờ xem xét">Chờ xem xét (Trưởng phòng)</option>
                    <option value="Chờ duyệt">Chờ duyệt (BGĐ)</option>
                    <option value="Chỉnh sửa">Chỉnh sửa</option>
                    <option value="Nháp">Nháp</option>
                    <option value="Hết hiệu lực">Hết hiệu lực</option>
                  </>
                ) : (
                  <>
                    <option value="Chờ Trưởng phòng">Chờ Trưởng phòng duyệt</option>
                    <option value="Chờ BGĐ">Chờ BGĐ duyệt</option>
                    <option value="Trưởng phòng đã duyệt">Trưởng phòng đã duyệt</option>
                    <option value="BGĐ đã duyệt">BGĐ đã duyệt</option>
                    <option value="Hiệu lực">Hiệu lực / Đang lưu hành</option>
                    <option value="Nháp">Nháp / Dự thảo</option>
                    <option value="Từ chối">Từ chối</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* HÀNG 2: Nhân sự, Đính kèm, Sắp xếp, Phân trang & Nút Reset */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: mode === 'processes' ? 'repeat(5, minmax(0, 1fr)) auto' : 'repeat(4, minmax(0, 1fr)) auto',
            gap: '12px',
            alignItems: 'flex-end',
            paddingTop: '8px',
            borderTop: '1px dashed #EADCC9'
          }}>
            {/* 5. Người biên soạn */}
            {mode === 'processes' && (
              <div className="filter-field-group" style={{ margin: 0 }}>
                <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> Người biên soạn
                </label>
                <select
                  value={editorFilter}
                  onChange={(e) => { setEditorFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả người soạn</option>
                  {uniqueEditors.map(ed => (
                    <option key={ed} value={ed}>{ed}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 6. Người phê duyệt */}
            {mode === 'processes' && (
              <div className="filter-field-group" style={{ margin: 0 }}>
                <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> Người phê duyệt
                </label>
                <select
                  value={approverFilter}
                  onChange={(e) => { setApproverFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả người duyệt</option>
                  {uniqueApprovers.map(ap => (
                    <option key={ap} value={ap}>{ap}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 7. Tài liệu đính kèm */}
            {mode === 'processes' && (
              <div className="filter-field-group" style={{ margin: 0 }}>
                <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Paperclip size={13} /> Biểu mẫu đính kèm
                </label>
                <select
                  value={hasAttachmentFilter}
                  onChange={(e) => { setHasAttachmentFilter(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả</option>
                  <option value="yes">Đã có biểu mẫu đính kèm</option>
                  <option value="no">Chưa có biểu mẫu</option>
                </select>
              </div>
            )}

            {/* Thư mục lưu trữ (cho mode documents) */}
            {mode === 'documents' && (
              <div className="filter-field-group" style={{ margin: 0 }}>
                <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FolderArchive size={13} /> Thư mục lưu trữ
                </label>
                <select
                  value={filterFolder}
                  onChange={(e) => { setFilterFolder(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
                >
                  <option value="">Tất cả thư mục</option>
                  {uniqueFolders.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 8. Sắp xếp theo */}
            <div className="filter-field-group" style={{ margin: 0 }}>
              <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUpDown size={13} /> Sắp xếp theo
              </label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
              >
                <option value="updated_desc">Mới cập nhật nhất (Mặc định)</option>
                <option value="updated_asc">Cũ nhất trước</option>
                <option value="code_asc">Mã tài liệu (A → Z)</option>
                <option value="code_desc">Mã tài liệu (Z → A)</option>
                <option value="name_asc">Tên tài liệu (A → Z)</option>
              </select>
            </div>

            {/* 9. Hiển thị số dòng */}
            <div className="filter-field-group" style={{ margin: 0 }}>
              <label className="filter-field-label" style={{ fontWeight: 600, color: '#7B5233' }}>
                Hiển thị số dòng
              </label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                style={{ width: '100%', height: '34px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', backgroundColor: '#FFFFFF', padding: '0 8px' }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {/* 10. Khối công cụ: Nút Reset và Thống kê kết quả */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'flex-end',
              paddingBottom: '2px'
            }}>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Đặt lại toàn bộ bộ lọc về mặc định"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEE2E2';
                  e.currentTarget.style.borderColor = '#FCA5A5';
                  e.currentTarget.style.color = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </button>

              <div style={{
                height: '34px',
                padding: '0 10px',
                backgroundColor: '#EDE3D2',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem',
                color: '#7B5233',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}>
                <span>Hiển thị</span>
                <strong style={{ color: '#543821' }}>{filteredDocs.length}</strong>
                <span>/ {documents.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* 2. Bảng Danh sách Quy trình ISO */}
      <div className="admin-list-layout" style={{ flex: '1 1 0%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mgmt-table admin-table-card card-shadow" style={{
          backgroundColor: 'white',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0%',
          height: '100%',
          minHeight: 0
        }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={28} />
            <span style={{ fontWeight: '600' }}>Đang tải danh sách hồ sơ ISO...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#a0a0a0' }}>
            <FileText size={48} style={{ margin: '0 auto 16px auto', color: '#d0d0d0' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>Không tìm thấy tài liệu ISO quy trình nào</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Vui lòng nhấn tải lên file Word hoặc thêm mới để bắt đầu cấu hình</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <div className="admin-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', flex: '1 1 0%', minHeight: 0, height: '100%' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '100%', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0' }}>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '38px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                  {mode === 'processes' ? (
                    <>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '95px', whiteSpace: 'nowrap' }}>MÃ MỚI</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>MÃ CŨ</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '130px', maxWidth: '140px', whiteSpace: 'nowrap' }}>PHÒNG BAN</th>
                      <th style={{ padding: '7px 8px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', minWidth: '280px' }}>TÊN TÀI LIỆU</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI BIÊN SOẠN</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI XEM XÉT</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI PHÊ DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>THỜI GIAN CẬP NHẬT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>MÃ MẪU</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>KÝ HIỆU</th>
                      <th style={{ padding: '7px 8px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', minWidth: '150px' }}>TÊN TÀI LIỆU</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '130px', whiteSpace: 'nowrap' }}>THUỘC QUY TRÌNH</th>
                      <th style={{ padding: '7px 2px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>PHIÊN BẢN</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '95px', whiteSpace: 'nowrap' }}>LOẠI TÀI LIỆU</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '75px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '95px', whiteSpace: 'nowrap' }}>NGƯỜI TẠO</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', whiteSpace: 'nowrap' }}>TRƯỞNG PHÒNG DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>BGĐ DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẬP NHẬT CUỐI</th>
                      <th style={{ padding: '7px 2px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}>FILE GỐC</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '115px', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                    </>
                  )}
                  <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc, index) => {
                  const isDropUp = index >= paginatedDocs.length - 3 && paginatedDocs.length > 3;
                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s',
                        backgroundColor: index % 2 === 1 ? '#fdfcfb' : 'white',
                        position: 'relative',
                        zIndex: actionMenuId === doc.id ? 90 : 1,
                        cursor: mode === 'processes' ? 'pointer' : 'default'
                      }}
                      onClick={() => handleOpenRowPreview(doc, index)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fdfcfb' : 'white'}
                    >
                    <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                    
                    {mode === 'processes' ? (
                      <>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#7B5233', whiteSpace: 'nowrap' }}>
                          {doc.new_code || ''}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                          {doc.code || ''}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, maxWidth: '140px', whiteSpace: 'nowrap' }}>
                          <span 
                            title={doc.department_name || doc.symbol || '---'}
                            style={{ 
                              display: 'inline-block',
                              maxWidth: '125px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                              backgroundColor: '#FAF6F0', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              border: '1px solid #EADCC9', 
                              fontSize: '0.78rem', 
                              fontWeight: 600, 
                              color: '#7B5233' 
                            }}
                          >
                            {doc.department_name || doc.symbol || '---'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word', minWidth: '280px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {doc.name}
                          </div>
                          <ISOAttachedDocsTree
                            docs={(doc.documents && doc.documents.length > 0)
                              ? doc.documents
                              : (doc.related_templates && doc.related_templates.length > 0 ? doc.related_templates : [])}
                          />
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderDocumentLevelBadge(doc.document_level)}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.editor || '---'}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.approver || '---'}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.approver_bgd || '---'}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {formatVietnameseDate(doc.updated_at || doc.issue_date || doc.created_at)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#7B5233', whiteSpace: 'nowrap' }}>{doc.code}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.symbol || '---'}</td>
                        <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>{doc.name}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {doc.process_code ? (
                            <span title={doc.process_name} style={{ fontWeight: 600, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BFDBFE', fontSize: '0.75rem' }}>
                              {doc.process_code}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Chưa gán</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 2px', fontSize: '0.8rem', color: '#1e293b', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>v{doc.version || '01'}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.doc_type || '---'}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderDocumentLevelBadge(doc.document_level)}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.issuer || '---'}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {renderApprover1(doc)}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderApprover2(doc)}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {formatVietnameseDate(doc.updated_at || doc.created_at || doc.issue_date)}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.file_path ? (
                            <a
                              href={`${api.defaults.baseURL.replace(/\/$/, '')}/iso-documents/${mode === 'processes' ? `processes/${doc.id}` : doc.id}/download-raw`}
                              download
                              target="_blank"
                              rel="noreferrer"
                              title="Tải tệp tin gốc nguyên bản"
                              style={{ color: '#7B5233', display: 'inline-flex', padding: '3px', borderRadius: '4px', backgroundColor: '#FAF6F0', cursor: 'pointer' }}
                            >
                              <Download size={13} />
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Không có</span>
                          )}
                        </td>
                      </>
                    )}

                    <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {renderDocStatusBadge(doc.status, doc.document_level)}
                    </td>
                    <td style={{
                      textAlign: 'center',
                      zIndex: actionMenuId === doc.id ? 100 : 1,
                      whiteSpace: 'nowrap',
                      padding: '6px 4px',
                      overflow: 'visible'
                    }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          className={`action-btn ${actionMenuId === doc.id ? 'active' : ''}`}
                          title="Thao tác"
                          style={{
                            cursor: 'pointer',
                            backgroundColor: actionMenuId === doc.id ? '#FAF6F0' : 'transparent',
                            color: actionMenuId === doc.id ? '#7B5233' : '#64748b'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(actionMenuId === doc.id ? null : doc.id);
                          }}
                        >
                          <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                        </button>
                        {actionMenuId === doc.id && (
                          <div
                            className={`action-menu ${isDropUp ? 'drop-up' : ''}`}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              ...(isDropUp
                                ? { bottom: 'calc(100% + 4px)', top: 'auto' }
                                : { top: 'calc(100% + 4px)', bottom: 'auto' }
                              ),
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #EADCC9',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.06)',
                              minWidth: '185px',
                              width: 'max-content',
                              zIndex: 9999,
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '4px 0',
                              textAlign: 'left'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setActionMenuId(null);
                                navigate(mode === 'processes' ? `/admin/iso-processes/edit/${doc.id}` : `/admin/iso-documents/edit/${doc.id}`);
                              }}
                            >
                              <Edit size={14} color="#7B5233" />
                              <span>Chỉnh sửa</span>
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 500, color: '#059669', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setActionMenuId(null);
                                navigate(`/admin/iso-approvals?keyword=${encodeURIComponent(doc.code)}`);
                              }}
                            >
                              <CheckCircle size={14} color="#059669" />
                              <span>Ký duyệt hồ sơ</span>
                            </button>
                            <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '3px 0' }} />
                            <button
                              type="button"
                              className="action-menu-item danger"
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 500, color: '#DC2626', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setActionMenuId(null);
                                handleDeleteDoc(doc.id, doc.code, doc.name);
                              }}
                            >
                              <Trash2 size={14} color="#DC2626" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Thanh phân trang đồng bộ */}
          {(() => {
            const totalPages = Math.ceil(filteredDocs.length / pageSize);
            return filteredDocs.length > 0 ? (
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{paginatedDocs.length}</b> trên <b>{filteredDocs.length}</b> tài liệu
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button 
                    className="page-btn" 
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                    disabled={page === 1}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #EADCC9',
                        backgroundColor: page === p ? '#7B5233' : '#FAF6F0',
                        color: page === p ? '#fff' : '#7B5233',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button 
                    className="page-btn" 
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={page === totalPages}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null;
          })()}
          </div>
        )}
        </div>
      </div>

      {/* 3. Confirm Modal xoá tài liệu */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '100%',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#7B5233', fontWeight: 'bold' }}>{confirmModal.title}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.45' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: confirmModal.confirmColor || '#d93025',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                {confirmModal.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. Modal Tạo Quy trình thực tế mới (Gold Design System) */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.22)',
            border: '1px solid #EADCC9',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '18px 24px',
              backgroundColor: '#FAF7F2',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF0E6',
                  border: '1px solid #E6D5C3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B5233'
                }}>
                  <Layers size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#2D1A12', fontSize: '1.18rem', fontWeight: 700 }}>
                    Thêm tài liệu mới
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#786C62', marginTop: '2px', display: 'block' }}>
                    Khởi tạo thông tin tài liệu nghiệp vụ trước khi biên soạn
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFE8DF'; e.currentTarget.style.color = '#2D1A12'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form nội dung chuẩn hóa 5 hàng */}
            <form onSubmit={handleCreateProcess} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* HÀNG 1: Cấp tài liệu, Phòng ban */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Cấp tài liệu */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Layers size={14} color="#7B5233" />
                      <span>Cấp tài liệu</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.document_level || 'Cấp công ty'}
                      onChange={(e) => {
                        const newLvl = e.target.value;
                        const savedPrefs = getSavedCreatePrefs();
                        const nextBgd = newLvl === 'Cấp công ty' 
                          ? (newProcessData.approver_bgd || savedPrefs?.approver_bgd || (bgdList.length > 0 ? bgdList[0].full_name : 'Nguyễn Hòa')) 
                          : '';
                        setNewProcessData(prev => ({
                          ...prev,
                          document_level: newLvl,
                          approver: prev.approver || (departmentHeads.length > 0 ? departmentHeads[0].full_name : 'Đặng Văn Nam'),
                          approver_bgd: nextBgd
                        }));
                        saveCreatePrefs({ document_level: newLvl, approver_bgd: nextBgd });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Cấp công ty">Cấp công ty</option>
                      <option value="Cấp phòng">Cấp phòng</option>
                    </select>
                  </div>

                  {/* Phòng ban */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Building size={14} color="#7B5233" />
                      <span>Phòng ban</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.department_id || ''}
                      onChange={(e) => handleSelectDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn phòng ban áp dụng tài liệu --</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* HÀNG 2: Loại tài liệu, Mã tài liệu (k chỉnh sửa) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Loại tài liệu */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <FolderArchive size={14} color="#7B5233" />
                      <span>Loại tài liệu</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.doc_type_id || ''}
                      onChange={(e) => handleSelectDocType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn loại tài liệu --</option>
                      {docTypesList.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mã tài liệu (k chỉnh sửa) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Mã tài liệu <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newProcessData.code}
                      readOnly
                      title="Mã tài liệu được sinh tự động theo Cấp, Phòng ban và Loại tài liệu"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        backgroundColor: '#F9FAFB',
                        color: '#1F2937',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* HÀNG 3: Tên tài liệu (Full width 1 hàng) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <FileText size={14} color="#7B5233" />
                    <span>Tên tài liệu</span>
                    <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tên tài liệu..."
                    value={newProcessData.name}
                    onChange={(e) => setNewProcessData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D9C7B6',
                      outline: 'none',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      color: '#1F2937',
                      fontWeight: 500
                    }}
                    required
                  />
                </div>

                {/* HÀNG 4: Người biên soạn, người phê duyệt */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Người biên soạn */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <User size={13} color="#6B7280" />
                      <span>Người biên soạn</span>
                    </label>
                    <input
                      type="text"
                      value={newProcessData.editor}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#F9FAFB',
                        color: '#4B5563',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Người xem xét / Người phê duyệt (Cấp phòng) */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <ShieldCheck size={13} color="#7B5233" />
                      <span>{newProcessData.document_level === 'Cấp công ty' ? 'Người xem xét (cấp Trưởng phòng)' : 'Người phê duyệt (Trưởng phòng QLCL)'}</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.approver || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProcessData(prev => ({ ...prev, approver: val }));
                        saveCreatePrefs({ approver: val });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn Trưởng phòng xem xét --</option>
                      {departmentHeads.map(acc => (
                        <option key={acc.id} value={acc.full_name}>
                          {acc.display_name || `${acc.full_name} (Trưởng phòng QLCL)`}
                        </option>
                      ))}
                      {newProcessData.approver && !departmentHeads.some(a => a.full_name === newProcessData.approver) && (
                        <option value={newProcessData.approver}>{newProcessData.approver}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* HÀNG 5 (chỉ hiển thị khi Cấp công ty): Người phê duyệt ban hành (Ban Giám Đốc) */}
                {newProcessData.document_level === 'Cấp công ty' && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#1E40AF', marginBottom: '6px' }}>
                      <ShieldCheck size={13} color="#1E40AF" />
                      <span>Người phê duyệt ban hành (Ban Giám Đốc)</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.approver_bgd || (bgdList[0]?.full_name || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProcessData(prev => ({ ...prev, approver_bgd: val }));
                        saveCreatePrefs({ approver_bgd: val });
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #BFDBFE',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1E3A8A',
                        backgroundColor: '#EFF6FF',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn Ban Giám Đốc phê duyệt --</option>
                      {bgdList.map(b => (
                        <option key={b.id} value={b.full_name}>
                          {b.display_name || b.full_name}
                        </option>
                      ))}
                      {newProcessData.approver_bgd && !bgdList.some(b => b.full_name === newProcessData.approver_bgd) && (
                        <option value={newProcessData.approver_bgd}>{newProcessData.approver_bgd}</option>
                      )}
                    </select>
                  </div>
                )}

                {/* HÀNG 5: Thời gian cập nhật, Trạng thái cập nhật */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Thời gian cập nhật */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Calendar size={13} color="#6B7280" />
                      <span>Thời gian cập nhật</span>
                    </label>
                    <input
                      type="text"
                      value={getCurrentFormattedDate()}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#F9FAFB',
                        color: '#4B5563',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Trạng thái cập nhật */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Trạng thái cập nhật
                    </label>
                    <div style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      fontSize: '0.88rem',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FFF7ED',
                        color: '#C2410C',
                        border: '1px solid #FDBA74'
                      }}>
                        Nháp
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>(Sẽ chuyển tiếp khi biên soạn)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                padding: '14px 24px',
                backgroundColor: '#FAF7F2',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: '1.5px solid #D8C7B5',
                      backgroundColor: '#FFFFFF',
                      color: '#634A38',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5ECE3';
                      e.currentTarget.style.borderColor = '#BCA38C';
                      e.currentTarget.style.color = '#382519';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#D8C7B5';
                      e.currentTarget.style.color = '#634A38';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    <X size={15} strokeWidth={2.2} />
                    <span>Hủy bỏ</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #8B593E 0%, #683E24 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      letterSpacing: '0.2px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(104, 62, 36, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #9C6748 0%, #78482B 100%)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(104, 62, 36, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #8B593E 0%, #683E24 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(104, 62, 36, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                      }
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="spin-animation" />
                    ) : (
                      <Plus size={16} strokeWidth={2.5} />
                    )}
                    <span>Tạo mới tài liệu</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem trước in (PDF Preview) khổ A4 khi click vào dòng quy trình */}
      {isPreviewModalOpen && previewDoc && (
        <ISOProcessPreviewModal
          isOpen={isPreviewModalOpen}
          doc={previewDoc}
          docList={filteredDocs}
          currentIndex={previewIndex}
          onSelectIndex={handleSelectPreviewIndex}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewDoc(null);
          }}
          onEdit={(d) => navigate(`/admin/iso-processes/edit/${d.id}`)}
        />
      )}
    </div>
  );
};

export default ISODocumentListView;
